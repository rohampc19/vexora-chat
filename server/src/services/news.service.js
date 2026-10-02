import {pool} from '../config/db.js';
import {HttpError} from '../utils/httpError.js';
import {create as notify} from './notification.service.js';

const rowNews=x=>({id:x.id,title:x.title,excerpt:x.excerpt,body:x.body,category:x.category,featured:!!x.featured,likes:Number(x.likes||0),liked:!!x.liked,createdAt:x.created_at});

export async function listNews({q='',category='',featured=false}={}){
  const args=[];const where=['n.published=true'];
  if(q){args.push(`%${q}%`);where.push(`(n.title ilike $${args.length} or n.excerpt ilike $${args.length} or n.body ilike $${args.length})`)}
  if(['Gaming','Esports','Updates'].includes(category)){args.push(category);where.push(`n.category=$${args.length}`)}
  if(featured===true){where.push('n.featured=true')}
  const r=await pool.query(`select n.id,n.title,n.excerpt,n.category,n.featured,n.created_at,(select count(*) from news_likes nl where nl.news_id=n.id)::int likes from news n where ${where.join(' and ')} order by n.featured desc,n.created_at desc limit 50`,args);
  return r.rows.map(x=>({...x,createdAt:x.created_at,likes:Number(x.likes)}));
}

export async function getNews(id,userId=null){
  const r=await pool.query(`select n.id,n.title,n.excerpt,n.body,n.category,n.featured,n.created_at,
    (select count(*) from news_likes nl where nl.news_id=n.id)::int likes,
    ($2 is not null and exists(select 1 from news_likes me where me.news_id=n.id and me.user_id=$2)) liked
    from news n where n.id=$1 and n.published=true`,[id,userId]);
  if(!r.rowCount)throw new HttpError(404,'خبر پیدا نشد.');
  const c=await pool.query(`select c.id,c.text,c.created_at,u.display_name author,
    (select count(*) from comment_likes cl where cl.comment_id=c.id)::int likes
    from comments c join users u on u.id=c.user_id where c.news_id=$1 order by c.created_at desc`,[id]);
  return {...rowNews(r.rows[0]),comments:c.rows.map(x=>({id:x.id,text:x.text,author:x.author,likes:Number(x.likes),createdAt:x.created_at}))};
}

export async function likeNews(userId,newsId){
  const x=await pool.query('select 1 from news_likes where news_id=$1 and user_id=$2',[newsId,userId]);
  if(x.rowCount)await pool.query('delete from news_likes where news_id=$1 and user_id=$2',[newsId,userId]);
  else await pool.query('insert into news_likes(news_id,user_id) values($1,$2)',[newsId,userId]);
  const r=await pool.query('select count(*)::int likes from news_likes where news_id=$1',[newsId]);return {liked:!x.rowCount,likes:Number(r.rows[0].likes)};
}

export async function addComment(userId,newsId,text){
  const x=await pool.query('select author_id from news where id=$1 and published=true',[newsId]);if(!x.rowCount)throw new HttpError(404,'خبر پیدا نشد.');
  await pool.query('insert into comments(news_id,user_id,text) values($1,$2,$3)',[newsId,userId,text.trim()]);
  if(x.rows[0].author_id&&String(x.rows[0].author_id)!==String(userId))await notify(x.rows[0].author_id,{type:'news_comment',title:'نظر جدید روی خبر',body:'روی یکی از خبرهایت نظر جدیدی ثبت شد.'});
  return getNews(newsId,userId);
}

export async function likeComment(userId,newsId,commentId){
  const exists=await pool.query('select 1 from comments where id=$1 and news_id=$2',[commentId,newsId]);if(!exists.rowCount)throw new HttpError(404,'نظر پیدا نشد.');
  const x=await pool.query('select 1 from comment_likes where comment_id=$1 and user_id=$2',[commentId,userId]);
  if(x.rowCount)await pool.query('delete from comment_likes where comment_id=$1 and user_id=$2',[commentId,userId]);
  else await pool.query('insert into comment_likes(comment_id,user_id) values($1,$2)',[commentId,userId]);
  const r=await pool.query('select count(*)::int likes from comment_likes where comment_id=$1',[commentId]);return {liked:!x.rowCount,likes:Number(r.rows[0].likes)};
}
