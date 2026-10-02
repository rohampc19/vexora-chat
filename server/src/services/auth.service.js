import bcrypt from 'bcrypt';
import {pool} from '../config/db.js';
import {HttpError} from '../utils/httpError.js';
import {randomToken} from '../utils/auth.js';

const publicUser=r=>({id:r.id,username:r.username,displayName:r.display_name,email:r.email,role:r.role,bio:r.bio,online:false,followersCount:Number(r.followers_count||0),followingCount:Number(r.following_count||0),score:Number(r.score||0)});

export async function registerUser(v){
  const exists=await pool.query('select id from users where username=$1 or email=$2',[v.username.toLowerCase(),v.email.toLowerCase()]);
  if(exists.rowCount)throw new HttpError(409,'نام کاربری یا ایمیل قبلاً ثبت شده است.');
  const hash=await bcrypt.hash(v.password,12);
  const r=await pool.query(`insert into users(username,display_name,email,password_hash,favorite_game,status) values($1,$2,$3,$4,$5,'pending') returning id,username,display_name,email,role,bio`,[v.username.toLowerCase(),v.displayName,v.email.toLowerCase(),hash,v.favoriteGame]);
  return publicUser(r.rows[0]);
}

export async function verifyCredentials(identifier,password){
  const r=await pool.query(`select u.*,coalesce((select count(*) from follows f where f.following_id=u.id),0) followers_count,coalesce((select count(*) from follows f where f.follower_id=u.id),0) following_count from users u where username=$1 or email=$1`,[identifier.toLowerCase()]);
  if(!r.rowCount)throw new HttpError(401,'اطلاعات ورود نادرست است.');
  const u=r.rows[0];
  if(u.status!=='approved')throw new HttpError(403,'حساب شما هنوز توسط ادمین تأیید نشده است.');
  if(!(await bcrypt.compare(password,u.password_hash)))throw new HttpError(401,'اطلاعات ورود نادرست است.');
  return publicUser(u);
}

export async function createSession(userId,refreshJti,tokenHash){
  await pool.query('insert into sessions(user_id,jti,token_hash,expires_at) values($1,$2,$3,now()+($4 || \' days\')::interval)',[userId,refreshJti,tokenHash,String(process.env.REFRESH_TOKEN_TTL_DAYS||30)]);
}

export async function consumeSession(jti,tokenHash){
  const r=await pool.query('delete from sessions where jti=$1 and token_hash=$2 and expires_at>now() returning user_id,jti',[jti,tokenHash]);
  return r.rows[0]||null;
}

export async function revokeSession(jti){await pool.query('delete from sessions where jti=$1',[jti]);}
