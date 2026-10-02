import {pool} from '../config/db.js';
import {HttpError} from '../utils/httpError.js';
import {create as notify} from './notification.service.js';

const mapPost=(r)=>({
  id:r.id,body:r.body,imageUrl:r.image_url,createdAt:r.created_at,
  author:{username:r.username,displayName:r.display_name,avatarUrl:r.avatar_url,isPremium:!!r.is_premium},
  likes:Number(r.likes||0),liked:!!r.liked,comments:Number(r.comments||0)
});

export async function listPosts(userId,{page=1,limit=12}={}){
  const p=Math.max(1,Number(page)||1), l=Math.min(30,Math.max(1,Number(limit)||12)), offset=(p-1)*l;
  const r=await pool.query(`
    select p.id,p.body,p.image_url,p.created_at,u.username,u.display_name,u.avatar_url,u.is_premium,
      (select count(*) from post_likes pl where pl.post_id=p.id)::int likes,
      (select count(*) from post_comments pc where pc.post_id=p.id)::int comments,
      exists(select 1 from post_likes me where me.post_id=p.id and me.user_id=$1) liked
    from posts p join users u on u.id=p.author_id and u.status='approved'
    order by p.created_at desc limit $2 offset $3`,[userId||'00000000-0000-0000-0000-000000000000',l,offset]);
  return {items:r.rows.map(mapPost),page:p,limit:l,hasMore:r.rows.length===l};
}

export async function createPost(userId,{body,imageUrl}){
  const r=await pool.query('insert into posts(author_id,body,image_url) values($1,$2,$3) returning id,body,image_url,created_at',[userId,body.trim(),imageUrl||null]);
  const user=await pool.query('select username,display_name,avatar_url,is_premium from users where id=$1',[userId]);
  return mapPost({...r.rows[0],...user.rows[0],likes:0,comments:0,liked:false});
}

export async function likePost(userId,postId){
  const exists=await pool.query('select 1 from post_likes where post_id=$1 and user_id=$2',[postId,userId]);
  if(exists.rowCount) await pool.query('delete from post_likes where post_id=$1 and user_id=$2',[postId,userId]);
  else await pool.query('insert into post_likes(post_id,user_id) values($1,$2)',[postId,userId]);
  const r=await pool.query('select count(*)::int likes from post_likes where post_id=$1',[postId]);
  return {liked:!exists.rowCount,likes:Number(r.rows[0].likes)};
}

export async function comments(postId){
  const r=await pool.query(`select pc.id,pc.text,pc.created_at,u.username,u.display_name,u.avatar_url,
    (select count(*) from comment_likes cl where cl.comment_id=pc.id)::int likes
    from post_comments pc join users u on u.id=pc.user_id where pc.post_id=$1 order by pc.created_at desc`,[postId]);
  return r.rows.map(x=>({id:x.id,text:x.text,createdAt:x.created_at,author:{username:x.username,displayName:x.display_name,avatarUrl:x.avatar_url},likes:Number(x.likes)}));
}

export async function addComment(userId,postId,text){
  const p=await pool.query('select author_id from posts where id=$1',[postId]);
  if(!p.rowCount) throw new HttpError(404,'پست پیدا نشد.');
  await pool.query('insert into post_comments(post_id,user_id,text) values($1,$2,$3)',[postId,userId,text.trim()]);
  if(String(p.rows[0].author_id)!==String(userId)) await notify(p.rows[0].author_id,{type:'post_comment',title:'نظر جدید',body:'روی یکی از پست‌هایت نظر جدیدی ثبت شد.'});
  return comments(postId);
}

export async function deletePost(userId,postId){
  const r=await pool.query('delete from posts where id=$1 and author_id=$2 returning id',[postId,userId]);
  if(!r.rowCount) throw new HttpError(404,'پست پیدا نشد یا دسترسی نداری.');
  return {ok:true};
}
