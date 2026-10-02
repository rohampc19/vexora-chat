import {pool} from '../config/db.js';
import {Presence} from '../models/presence.js';
import {HttpError} from '../utils/httpError.js';
import {create as notify} from './notification.service.js';

export async function getUser(username,viewerId=null){
  const r=await pool.query(`select u.id,u.username,u.display_name,u.bio,u.favorite_game,u.favorite_games,u.avatar_url,u.role,u.score,u.level,u.is_premium,u.premium_plan,u.premium_start_date,u.premium_end_date,u.subscription_status,
    coalesce(f1.followers_count,0) followers_count,coalesce(f2.following_count,0) following_count,
    exists(select 1 from follows f where f.follower_id=$2 and f.following_id=u.id) is_following
    from users u left join (select following_id,count(*) followers_count from follows group by following_id) f1 on f1.following_id=u.id
    left join (select follower_id,count(*) following_count from follows group by follower_id) f2 on f2.follower_id=u.id
    where u.username=$1 and u.status='approved'`,[username.toLowerCase(),viewerId]);
  if(!r.rowCount)throw new HttpError(404,'کاربر پیدا نشد.');
  const row=r.rows[0];
  if(row.is_premium && row.premium_end_date && new Date(row.premium_end_date)<=new Date()){await pool.query("update users set is_premium=false,subscription_status='expired',updated_at=now() where id=$1",[row.id]);row.is_premium=false;row.subscription_status='expired';}
  const customization=(await pool.query(`select b.code background,f.code frame,ba.code badge,n.code name_effect,ba2.code banner,t.code theme from profile_customization pc left join store_items b on b.id=pc.background_item_id left join store_items f on f.id=pc.frame_item_id left join store_items ba on ba.id=pc.badge_item_id left join store_items n on n.id=pc.name_effect_item_id left join store_items ba2 on ba2.id=pc.banner_item_id left join store_items t on t.id=pc.theme_item_id where pc.user_id=$1`,[row.id])).rows[0]||{};
  const presence=await Presence.findOne({username:row.username}).lean().catch(()=>null);
  return {id:row.id,username:row.username,displayName:row.display_name,bio:row.bio, favoriteGame:row.favorite_game,favoriteGames:row.favorite_games||[],avatarUrl:row.avatar_url,role:row.role,score:Number(row.score),level:Number(row.level),followersCount:Number(row.followers_count),followingCount:Number(row.following_count),following:!!row.is_following,premium:{isPremium:!!row.is_premium,plan:row.premium_plan,startDate:row.premium_start_date,endDate:row.premium_end_date,status:row.subscription_status},customization,online:!!presence?.online,lastSeen:presence?.lastSeen||null};
}

export async function updateMe(id,v){
  const games=Array.isArray(v.favoriteGames)?v.favoriteGames.map(x=>String(x).trim()).filter(Boolean).slice(0,10):undefined;
  const favoriteGame=games?.[0]||v.favoriteGame||undefined;
  const r=await pool.query(`update users set display_name=coalesce($1,display_name),bio=coalesce($2,bio),avatar_url=coalesce($3,avatar_url),favorite_games=coalesce($4,favorite_games),favorite_game=coalesce($5,favorite_game),updated_at=now()
    where id=$6 returning id,username,display_name,email,role,bio,avatar_url,favorite_game,favorite_games,score,level`,[v.displayName??null,v.bio??null,v.avatarUrl??null,games??null,favoriteGame??null,id]);
  return {...r.rows[0],displayName:r.rows[0].display_name,avatarUrl:r.rows[0].avatar_url,favoriteGame:r.rows[0].favorite_game,favoriteGames:r.rows[0].favorite_games||[],score:Number(r.rows[0].score),level:Number(r.rows[0].level)};
}

export async function toggleFollow(me,target){
  if(me===target)throw new HttpError(400,'نمی‌توانی خودت را دنبال کنی.');
  const exists=await pool.query('select 1 from follows where follower_id=$1 and following_id=$2',[me,target]);
  if(exists.rowCount){await pool.query('delete from follows where follower_id=$1 and following_id=$2',[me,target]);return {following:false};}
  const u=await pool.query("select username from users where id=$1 and status='approved'",[target]);
  if(!u.rowCount)throw new HttpError(404,'کاربر پیدا نشد.');
  await pool.query('insert into follows(follower_id,following_id) values($1,$2)',[me,target]);
  const meRow=await pool.query('select username from users where id=$1',[me]);
  await notify(target,{type:'follow',title:'دنبال‌کنندهٔ جدید',body:`@${meRow.rows[0]?.username||'یک کاربر'} تو را دنبال کرد.`});
  return {following:true};
}
