import {useEffect,useRef,useState} from "react";
import {Link} from "react-router-dom";
import {Send,Users,MessageCircle,LogIn} from "lucide-react";
import {useAuth} from "../context/AuthContext";
import {createSocket} from "../services/socket";
import GlassCard from "../components/GlassCard";
import {Empty} from "../components/States";
import {useToast} from "../context/ToastContext";

export default function Community(){
  const {user}=useAuth(),toast=useToast(),socketRef=useRef(null),messagesEndRef=useRef(null);
  const [messages,setMessages]=useState([]),[text,setText]=useState(""),[online,setOnline]=useState({}),[loading,setLoading]=useState(true),[connected,setConnected]=useState(false);
  useEffect(()=>{
    if(!user){setLoading(false);return}
    const socket=createSocket();socketRef.current=socket;
    const onConnect=()=>{setConnected(true);socket.emit("global:history",{limit:60})};
    const onDisconnect=()=>setConnected(false);
    const onHistory=r=>{setMessages(r.items||[]);setLoading(false)};
    const onMessage=m=>setMessages(v=>v.some(x=>x.id===m.id)?v:[...v,m]);
    const onPresence=p=>setOnline(v=>({...v,[p.username]:p.online}));
    socket.on("connect",onConnect);socket.on("disconnect",onDisconnect);socket.on("global:history",onHistory);socket.on("global:message",onMessage);socket.on("presence:update",onPresence);socket.on("chat:error",e=>toast.error(e.message));
    return()=>{socket.disconnect();socketRef.current=null};
  },[user?.username]);
  useEffect(()=>{messagesEndRef.current?.scrollIntoView({behavior:"smooth"})},[messages]);
  const send=e=>{e.preventDefault();const value=text.trim();if(!value||!socketRef.current)return;socketRef.current.emit("global:send",{text:value});setText("")};
  if(!user)return <div className="mx-auto max-w-4xl"><GlassCard className="py-16 text-center"><Users className="mx-auto text-cyan-300" size={42}/><h1 className="mt-5 text-3xl font-black">گلوبال چت VEXORA</h1><p className="mx-auto mt-3 max-w-xl text-slate-400">اینجا فید پست نیست؛ یک چت زنده برای صحبت‌کردن با گیمرهای VEXORA است.</p><Link to="/login" className="mt-7 inline-flex items-center gap-2 rounded-full bg-cyan-300 px-5 py-3 font-bold text-slate-950"><LogIn size={17}/>ورود برای چت</Link></GlassCard></div>;
  return <div className="mx-auto max-w-5xl"><GlassCard className="overflow-hidden p-0">
    <div className="flex items-center justify-between border-b border-white/8 px-5 py-4 md:px-7"><div className="flex items-center gap-3"><div className="grid h-11 w-11 place-items-center rounded-full bg-cyan-300/10 text-cyan-300"><MessageCircle size={21}/></div><div><p className="text-xs text-cyan-300">VEXORA CHAT</p><h1 className="text-xl font-black">گلوبال چت</h1></div></div><div className="text-left"><p className="text-xs text-slate-500">{Object.values(online).filter(Boolean).length||"—"} آنلاین</p><span className={connected?"text-[10px] text-emerald-300":"text-[10px] text-rose-300"}>{connected?"● متصل":"● در حال اتصال"}</span></div></div>
    <div className="h-[min(68vh,720px)] overflow-y-auto px-4 py-5 md:px-7">{loading?<p className="py-16 text-center text-sm text-slate-500">در حال اتصال به گلوبال چت...</p>:messages.length===0?<Empty label="هنوز پیامی در گلوبال چت نیست. اولین پیام را بفرست."/>:<div className="space-y-2">{messages.map(m=><div key={m.id} className="flex items-start gap-3 py-2"><div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/5 text-sm font-bold text-cyan-200">{(m.from||"?").slice(0,1).toUpperCase()}</div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-baseline gap-2"><b className="text-sm text-white">@{m.from}</b><span className="text-[10px] text-slate-600">{new Date(m.createdAt).toLocaleTimeString("fa-IR",{hour:"2-digit",minute:"2-digit"})}</span></div><p className="mt-1 break-words leading-7 text-slate-200">{m.text}</p></div></div>)}</div>}<div ref={messagesEndRef}/></div>
    <form onSubmit={send} className="border-t border-white/8 bg-white/[0.02] p-3 md:p-4"><div className="flex items-center gap-2"><input value={text} onChange={e=>setText(e.target.value)} maxLength={2000} placeholder="پیامت را برای همه بنویس..." className="min-w-0 flex-1 rounded-full border border-white/10 bg-white/5 px-5 py-3.5 outline-none"/><button disabled={!connected||!text.trim()} aria-label="ارسال پیام" className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-cyan-300 text-slate-950 disabled:opacity-40"><Send size={18}/></button></div><p className="mt-2 px-2 text-[10px] text-slate-600">گفتگو عمومی است؛ اطلاعات شخصی یا رمز عبور را ارسال نکن.</p></form>
  </GlassCard></div>
}