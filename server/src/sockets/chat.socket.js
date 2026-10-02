import {Message} from '../models/message.js';
import {Presence} from '../models/presence.js';
import {ChatEvent} from '../models/event.js';
import {pool} from '../config/db.js';
import {create as notify} from '../services/notification.service.js';

const key=(a,b)=>[a.toLowerCase(),b.toLowerCase()].sort().join(':');
const cleanText=(text,max=2000)=>String(text??'').trim().slice(0,max);

async function approvedUser(username){
  const r=await pool.query("select id,username from users where username=$1 and status='approved'",[String(username||'').toLowerCase()]);
  return r.rows[0]||null;
}

async function allowedGroup(userId,groupId){
  const r=await pool.query("select role from group_members where group_id=$1 and user_id=$2 and status='approved'",[groupId,userId]);
  return r.rows[0]||null;
}

async function saveEvent(type,payload){ChatEvent.create({type,meta:payload}).catch(()=>{});}

export function registerChat(io){
  io.on('connection',socket=>{
    const u=socket.user;
    let windowStarted=Date.now(),sentInWindow=0;
    let typingWindowStarted=Date.now(),typingEvents=0;
    const allowMessage=()=>{const now=Date.now();if(now-windowStarted>=10000){windowStarted=now;sentInWindow=0}if(sentInWindow>=12)return false;sentInWindow+=1;return true};
    const allowTyping=()=>{const now=Date.now();if(now-typingWindowStarted>=10000){typingWindowStarted=now;typingEvents=0}if(typingEvents>=30)return false;typingEvents+=1;return true};

    socket.join(`user:${u.username}`);
    Presence.findOneAndUpdate({username:u.username},{online:true,lastSeen:new Date()},{upsert:true,new:true}).catch(()=>{});
    io.emit('presence:update',{username:u.username,online:true});

    socket.on('chat:private:send',async({to,text}={})=>{
      try{
        if(!allowMessage())throw new Error('تعداد پیام‌ها در این لحظه زیاد است؛ چند ثانیه بعد دوباره تلاش کن.');
        const target=await approvedUser(to);
        const clean=cleanText(text);
        if(!target||!clean||String(text).length>2000)throw new Error('پیام نامعتبر است.');
        const blocked=await pool.query('select 1 from blocks where (blocker_id=$1 and blocked_id=$2) or (blocker_id=$2 and blocked_id=$1)',[u.sub,target.id]);
        if(blocked.rowCount)throw new Error('این کاربر مسدود شده است.');
        const targetSockets=await io.in(`user:${target.username}`).fetchSockets();
        const delivered=targetSockets.length>0;
        const msg=await Message.create({conversationKey:key(u.username,target.username),from:u.username,to:target.username,text:clean,deliveredAt:delivered?new Date():null});
        const payload={id:String(msg._id),from:u.username,to:target.username,text:clean,createdAt:msg.createdAt,delivered,seen:false};
        io.to(`user:${target.username}`).emit('chat:message',payload);
        socket.emit('chat:message',payload);
        if(!delivered)await notify(target.id,{type:'message',title:'پیام جدید',body:`از @${u.username} یک پیام جدید داری.`});
        await saveEvent('private_message',{from:u.username,to:target.username,messageId:String(msg._id)});
      }catch(e){socket.emit('chat:error',{message:e.message||'ارسال پیام ناموفق بود.'})}
    });

    socket.on('chat:private:history',async({withUser,before,limit=30}={})=>{
      try{
        if(!allowMessage())throw new Error('تعداد درخواست‌های چت در این لحظه زیاد است؛ چند ثانیه بعد دوباره تلاش کن.');
        const target=await approvedUser(withUser);if(!target)throw new Error('کاربر پیدا نشد.');
        const q={conversationKey:key(u.username,target.username)};
        if(before)q.createdAt={$lt:new Date(before)};
        const safe=Math.min(Math.max(Number(limit)||30,1),50);
        const rows=await Message.find(q).sort({createdAt:-1}).limit(safe).lean();
        socket.emit('chat:history',{items:rows.reverse(),hasMore:rows.length===safe});
      }catch(e){socket.emit('chat:error',{message:e.message||'تاریخچه در دسترس نیست.'})}
    });

    socket.on('chat:private:seen',async({messageId}={})=>{
      try{
        const m=await Message.findOneAndUpdate({_id:messageId,to:u.username},{seenAt:new Date()},{new:true});
        if(m?.from)io.to(`user:${m.from}`).emit('chat:seen',{messageId:String(m._id),seen:true});
      }catch{}
    });

    socket.on('group:join',async({groupId}={})=>{
      try{
        if(!groupId)throw new Error('گروه نامعتبر است.');
        const membership=await allowedGroup(u.sub,groupId);
        if(!membership)throw new Error('عضویت تأییدشده نیست.');
        socket.join(`group:${groupId}`);
        socket.emit('group:joined',{groupId});
      }catch(e){socket.emit('chat:error',{message:e.message})}
    });

    socket.on('group:history',async({groupId,before,limit=30}={})=>{
      try{
        if(!allowMessage())throw new Error('تعداد درخواست‌های چت در این لحظه زیاد است؛ چند ثانیه بعد دوباره تلاش کن.');
        if(!(await allowedGroup(u.sub,groupId)))throw new Error('عضویت تأییدشده نیست.');
        const q={groupId:String(groupId)};
        if(before)q.createdAt={$lt:new Date(before)};
        const safe=Math.min(Math.max(Number(limit)||30,1),50);
        const rows=await Message.find(q).sort({createdAt:-1}).limit(safe).lean();
        socket.emit('group:history',{items:rows.reverse(),hasMore:rows.length===safe});
      }catch(e){socket.emit('chat:error',{message:e.message})}
    });

    socket.on('group:send',async({groupId,text}={})=>{
      try{
        if(!allowMessage())throw new Error('تعداد پیام‌ها در این لحظه زیاد است؛ چند ثانیه بعد دوباره تلاش کن.');
        if(!(await allowedGroup(u.sub,groupId)))throw new Error('عضویت تأییدشده نیست.');
        const raw=String(text??'');const clean=cleanText(raw);if(!clean||raw.length>2000)throw new Error('پیام نامعتبر است.');
        const msg=await Message.create({groupId:String(groupId),from:u.username,text:clean});
        io.to(`group:${groupId}`).emit('group:message',{id:String(msg._id),groupId,from:u.username,text:clean,createdAt:msg.createdAt});
        await saveEvent('group_message',{groupId,from:u.username,messageId:String(msg._id)});
      }catch(e){socket.emit('chat:error',{message:e.message||'ارسال پیام گروهی ناموفق بود.'})}
    });

    socket.on('typing',async({to,isTyping}={})=>{
      try{
        if(!allowTyping())return;
        const target=await approvedUser(to);
        if(target)io.to(`user:${target.username}`).emit('typing',{from:u.username,isTyping:!!isTyping});
      }catch{}
    });

    socket.on('disconnect',()=>{Presence.findOneAndUpdate({username:u.username},{online:false,lastSeen:new Date()}).catch(()=>{});io.emit('presence:update',{username:u.username,online:false});});
  });
}
