import {pool} from '../config/db.js';
import {HttpError} from '../utils/httpError.js';
import {monetizationConfig} from '../config/monetization.js';

const mapItem=r=>({...r,price:Number(r.price),isPremium:!!r.is_premium,isLimited:!!r.is_limited,isActive:!!r.is_active,consumable:!!r.consumable,accessType:r.access_type});
const expirePremium=async(userId)=>{
  await pool.query(`update users set is_premium=false,subscription_status='expired',updated_at=now()
    where id=$1 and is_premium=true and premium_end_date is not null and premium_end_date<=now()`,[userId]);
};
export async function catalog(){
  const [plans,coins,items]=await Promise.all([
    pool.query("select id,code,name,duration_days,price_toman from monetization_plans where is_active=true order by duration_days"),
    pool.query("select id,code,coins,price_toman from coin_packages where is_active=true order by coins"),
    pool.query("select id,code,name,description,category,price,currency,preview,asset,access_type,is_premium,is_limited,consumable from store_items where is_active=true order by category,name")
  ]);
  return {plans:plans.rows.map(x=>({...x,durationDays:x.duration_days,priceToman:Number(x.price_toman)})),coinPackages:coins.rows.map(x=>({...x,priceToman:Number(x.price_toman)})),items:items.rows.map(mapItem)};
}
export async function state(userId){
  await expirePremium(userId);
  const [u,w,inv,c]=await Promise.all([
    pool.query("select is_premium,premium_plan,premium_start_date,premium_end_date,subscription_status from users where id=$1",[userId]),
    pool.query("select coin_balance from wallets where user_id=$1",[userId]),
    pool.query("select i.item_id,i.quantity,s.code,s.name,s.category,s.price,s.currency,s.preview,s.asset,s.access_type,s.is_premium,s.is_limited,s.consumable from inventory i join store_items s on s.id=i.item_id where i.user_id=$1",[userId]),
    pool.query("select pc.*,b.code background_code,f.code frame_code,ba.code badge_code,n.code name_effect_code,ba2.code banner_code,t.code theme_code from profile_customization pc left join store_items b on b.id=pc.background_item_id left join store_items f on f.id=pc.frame_item_id left join store_items ba on ba.id=pc.badge_item_id left join store_items n on n.id=pc.name_effect_item_id left join store_items ba2 on ba2.id=pc.banner_item_id left join store_items t on t.id=pc.theme_item_id where pc.user_id=$1",[userId])
  ]);
  if(!u.rowCount)throw new HttpError(404,'کاربر پیدا نشد.');
  const x=u.rows[0], pc=c.rows[0]||{};
  return {premium:{isPremium:!!x.is_premium,plan:x.premium_plan,startDate:x.premium_start_date,endDate:x.premium_end_date,status:x.subscription_status},wallet:{coinBalance:Number(w.rows[0]?.coin_balance||0)},inventory:inv.rows.map(mapItem),customization:{background:pc.background_code||null,frame:pc.frame_code||null,badge:pc.badge_code||null,nameEffect:pc.name_effect_code||null,banner:pc.banner_code||null,theme:pc.theme_code||null}};
}
async function ensureWallet(tx,userId){await tx.query('insert into wallets(user_id) values($1) on conflict(user_id) do nothing',[userId]);}
async function createIntent(tx,userId,purpose,referenceId,amount){
  const r=await tx.query('insert into payment_intents(user_id,purpose,reference_id,amount_toman) values($1,$2,$3,$4) returning id',[userId,purpose,referenceId,amount]);return r.rows[0].id;
}
export async function buyPremium(userId,planId){
  const tx=await pool.connect();try{
    await tx.query('begin');
    const p=(await tx.query('select * from monetization_plans where id=$1 and is_active=true',[planId])).rows[0];if(!p)throw new HttpError(404,'پلن پیدا نشد.');
    const intent=await createIntent(tx,userId,'premium_purchase',p.id,p.price_toman);
    const t=(await tx.query("insert into wallet_transactions(user_id,type,amount,currency,status,reference_id) values($1,'premium_purchase',$2,'IRR','pending',$3) returning transaction_id",[userId,p.price_toman,p.id])).rows[0].transaction_id;
    await tx.query('commit');return {transactionId:t,paymentId:intent,status:'pending',mockAvailable:monetizationConfig.mockPayments};
  }catch(e){await tx.query('rollback');throw e}finally{tx.release()}
}
export async function buyCoins(userId,packageId){
  const tx=await pool.connect();try{await tx.query('begin');const p=(await tx.query('select * from coin_packages where id=$1 and is_active=true',[packageId])).rows[0];if(!p)throw new HttpError(404,'پکیج Coin پیدا نشد.');const intent=await createIntent(tx,userId,'purchase_coin',p.id,p.price_toman);const t=(await tx.query("insert into wallet_transactions(user_id,type,amount,currency,status,reference_id) values($1,'purchase_coin',$2,'IRR','pending',$3) returning transaction_id",[userId,p.price_toman,p.id])).rows[0].transaction_id;await tx.query('commit');return {transactionId:t,paymentId:intent,status:'pending',mockAvailable:monetizationConfig.mockPayments};}catch(e){await tx.query('rollback');throw e}finally{tx.release()}
}
export async function completeMock(userId,paymentId){
  if(!monetizationConfig.mockPayments)throw new HttpError(403,'Mock Payment در این محیط فعال نیست.');
  const tx=await pool.connect();try{
    await tx.query('begin');
    const intent=(await tx.query('select * from payment_intents where id=$1 and user_id=$2 for update',[paymentId,userId])).rows[0];if(!intent)throw new HttpError(404,'تراکنش پرداخت پیدا نشد.');if(intent.status!=='pending'){await tx.query('commit');return {status:intent.status};}
    if(intent.purpose==='purchase_coin'){
      const p=(await tx.query('select coins from coin_packages where id=$1',[intent.reference_id])).rows[0];if(!p)throw new HttpError(404,'پکیج پیدا نشد.');await ensureWallet(tx,userId);await tx.query('update wallets set coin_balance=coin_balance+$1,updated_at=now() where user_id=$2',[p.coins,userId]);await tx.query("update wallet_transactions set status='completed' where user_id=$1 and type='purchase_coin' and reference_id=$2 and status='pending'",[userId,intent.reference_id]);
    }else{
      const p=(await tx.query('select code,duration_days from monetization_plans where id=$1',[intent.reference_id])).rows[0];if(!p)throw new HttpError(404,'پلن پیدا نشد.');await tx.query(`update users set is_premium=true,premium_plan=$1,premium_start_date=coalesce(premium_start_date,now()),premium_end_date=case when premium_end_date>now() then premium_end_date + ($2 || ' days')::interval else now()+($2 || ' days')::interval end,subscription_status='active',updated_at=now() where id=$3`,[p.code,p.duration_days,userId]);await tx.query("update wallet_transactions set status='completed' where user_id=$1 and type='premium_purchase' and reference_id=$2 and status='pending'",[userId,intent.reference_id]);
    }
    await tx.query("update payment_intents set status='completed',gateway_reference=$1,completed_at=now() where id=$2",[`mock_${paymentId}`,paymentId]);
    await tx.query('commit');return {status:'completed'};
  }catch(e){await tx.query('rollback');throw e}finally{tx.release()}
}
export async function buyItem(userId,itemId){
  const tx=await pool.connect();try{await tx.query('begin');const item=(await tx.query('select * from store_items where id=$1 and is_active=true for update',[itemId])).rows[0];if(!item)throw new HttpError(404,'آیتم پیدا نشد.');
    const owned=(await tx.query('select quantity from inventory where user_id=$1 and item_id=$2',[userId,itemId])).rows[0];if(owned&&!item.consumable)throw new HttpError(409,'این آیتم را قبلاً خریده‌ای.');
    if(item.access_type==='PREMIUM'&&!((await tx.query('select is_premium and premium_end_date>now() ok from users where id=$1',[userId])).rows[0]?.ok))throw new HttpError(403,'این آیتم مخصوص VEXORA PLUS است.');
    if(item.access_type==='FREE'){await tx.query('insert into inventory(user_id,item_id) values($1,$2) on conflict do nothing',[userId,itemId]);await tx.query('commit');return {status:'completed',free:true};}
    await ensureWallet(tx,userId);const w=(await tx.query('select coin_balance from wallets where user_id=$1 for update',[userId])).rows[0];if(Number(w.coin_balance)<item.price)throw new HttpError(400,'موجودی VEX COIN کافی نیست.');
    await tx.query('update wallets set coin_balance=coin_balance-$1,updated_at=now() where user_id=$2',[item.price,userId]);
    await tx.query('insert into inventory(user_id,item_id,quantity) values($1,$2,1) on conflict(user_id,item_id) do update set quantity=inventory.quantity+1',[userId,itemId]);
    await tx.query("insert into wallet_transactions(user_id,type,amount,currency,status,reference_id) values($1,'purchase_item',$2,'VEX','completed',$3)",[userId,item.price,itemId]);
    await tx.query('commit');return {status:'completed'};
  }catch(e){await tx.query('rollback');throw e}finally{tx.release()}
}
export async function customize(userId,v){
  const slots={background:'background_item_id',frame:'frame_item_id',badge:'badge_item_id',nameEffect:'name_effect_item_id',banner:'banner_item_id',theme:'theme_item_id'};
  const tx=await pool.connect();try{await tx.query('begin');const sets=[];const vals=[userId];for(const [k,col] of Object.entries(slots)){if(v[k]!==undefined){if(v[k]===null){sets.push(`${col}=null`);continue}const item=(await tx.query('select id,category,access_type,is_premium from store_items where code=$1 and is_active=true',[v[k]])).rows[0];if(!item)throw new HttpError(404,`آیتم ${k} پیدا نشد.`);const owned=await tx.query('select 1 from inventory where user_id=$1 and item_id=$2',[userId,item.id]);const prem=(await tx.query('select is_premium,premium_end_date from users where id=$1',[userId])).rows[0];if(item.access_type==='PAID'&&!owned.rowCount)throw new HttpError(403,'این آیتم در Inventory شما نیست.');if(item.access_type==='PREMIUM'&&!(prem?.is_premium&&new Date(prem.premium_end_date)>new Date()))throw new HttpError(403,'این آیتم مخصوص Premium است.');sets.push(`${col}=$${vals.length+1}`);vals.push(item.id)}}
    if(sets.length)await tx.query(`insert into profile_customization(user_id) values($1) on conflict do nothing`,[userId]),await tx.query(`update profile_customization set ${sets.join(',')},updated_at=now() where user_id=$1`,vals);
    await tx.query('commit');return state(userId);
  }catch(e){await tx.query('rollback');throw e}finally{tx.release()}
}
export async function transactions(userId){const r=await pool.query('select transaction_id,type,amount,currency,status,reference_id,created_at from wallet_transactions where user_id=$1 order by created_at desc limit 100',[userId]);return r.rows.map(x=>({...x,amount:Number(x.amount)}))}
