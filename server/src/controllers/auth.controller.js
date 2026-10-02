import crypto from 'node:crypto';
import {registerUser,verifyCredentials,createSession,consumeSession,revokeSession} from '../services/auth.service.js';
import {signAccess,signRefresh,randomToken,verifyRefresh} from '../utils/auth.js';
import {env} from '../config/env.js';

const cookieOpts={httpOnly:true,sameSite:'lax',secure:env.COOKIE_SECURE,path:'/'};
const hash=t=>crypto.createHash('sha256').update(t).digest('hex');

export async function register(req,res){const user=await registerUser(req.body);res.status(201).json({message:'درخواست ثبت‌نام ارسال شد.',user})}

async function issue(user,res){
  const jti=randomToken(),refresh=signRefresh(user.id,jti),access=signAccess(user);
  await createSession(user.id,jti,hash(refresh));
  res.cookie('accessToken',access,{...cookieOpts,maxAge:15*60*1000});
  res.cookie('refreshToken',refresh,{...cookieOpts,maxAge:env.REFRESH_TOKEN_TTL_DAYS*86400000});
  res.json({user});
}

export async function login(req,res){const user=await verifyCredentials(req.body.identifier,req.body.password);await issue(user,res)}

export async function refresh(req,res){
  try{
    const token=req.cookies.refreshToken;
    if(!token)return res.status(401).json({message:'نشست منقضی شده است.'});
    const p=verifyRefresh(token);
    const session=await consumeSession(p.jti,hash(token));
    if(!session)return res.status(401).json({message:'نشست معتبر نیست.'});
    const user=await verifyCredentialsById(session.user_id);
    await issue(user,res);
  }catch{return res.status(401).json({message:'نشست معتبر نیست.'})}
}

async function verifyCredentialsById(id){
  const {pool}=await import('../config/db.js');
  const r=await pool.query(`select u.*,coalesce((select count(*) from follows where following_id=u.id),0) followers_count,coalesce((select count(*) from follows where follower_id=u.id),0) following_count from users u where u.id=$1`,[id]);
  if(!r.rowCount||r.rows[0].status!=='approved')throw new Error('unauthorized');
  const u=r.rows[0];
  return {id:u.id,username:u.username,displayName:u.display_name,email:u.email,role:u.role,bio:u.bio,online:false,followersCount:Number(u.followers_count),followingCount:Number(u.following_count),score:Number(u.score||0)}
}

export async function me(req,res){const user=await verifyCredentialsById(req.user.sub);res.json({user})}

export async function logout(req,res){
  try{
    const token=req.cookies.refreshToken;
    if(token){const p=verifyRefresh(token);await revokeSession(p.jti)}
  }catch{}
  res.clearCookie('accessToken',cookieOpts);
  res.clearCookie('refreshToken',cookieOpts);
  res.json({ok:true})
}
