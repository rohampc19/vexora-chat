import {useEffect,useState} from 'react';
import {Link} from 'react-router-dom';
import {Crown,Store,WalletCards,Check,Sparkles} from 'lucide-react';
import GlassCard from '../components/GlassCard';
import {monetizationApi} from '../services/api';
import {useAuth} from '../context/AuthContext';
import {useToast} from '../context/ToastContext';
import {Loading,ErrorState} from '../components/States';

export default function Monetization(){
 const {user}=useAuth(); const toast=useToast(); const [data,setData]=useState(null),[state,setState]=useState(null),[tab,setTab]=useState('plus'),[err,setErr]=useState('');
 const load=async()=>{try{const c=await monetizationApi.catalog();setData(c);if(user)setState(await monetizationApi.me())}catch(e){setErr(e.message)}};
 useEffect(()=>{load()},[user?.id]);
 const buyPlus=async id=>{try{const r=await monetizationApi.buyPremium(id);if(r.mockAvailable){await monetizationApi.mockComplete(r.paymentId);await load();toast.success('VEXORA PLUS فعال شد.')}else toast.success('پرداخت ایجاد شد و آماده اتصال به درگاه است.')}catch(e){toast.error(e.message)}};
 const buyItem=async id=>{try{await monetizationApi.buyItem(id);await load();toast.success('آیتم به Inventory اضافه شد.')}catch(e){toast.error(e.message)}};
 if(err)return <ErrorState message={err} onRetry={load}/>;if(!data)return <Loading/>;
 const owned=new Set(state?.inventory?.map(x=>x.code)||[]);
 return <div className="space-y-6">
  <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs tracking-[.24em] text-cyan-300">VEXORA ECOSYSTEM</p><h1 className="mt-2 text-4xl font-black glow-text">VEXORA {tab==='plus'?'PLUS':'STORE'}</h1><p className="mt-2 text-slate-400">بخش درآمدی یکپارچه با حساب فعلی VEXORA CHAT.</p></div><div className="flex gap-1 rounded-2xl border border-white/10 bg-white/[.03] p-1"><button onClick={()=>setTab('plus')} className="rounded-xl px-4 py-2 text-sm" style={tab==='plus'?{background:'#38d9ff',color:'#050812'}:{}}>PLUS</button><button onClick={()=>setTab('store')} className="rounded-xl px-4 py-2 text-sm" style={tab==='store'?{background:'#38d9ff',color:'#050812'}:{}}>STORE</button></div></div>
  {state&&<div className="grid gap-4 sm:grid-cols-3"><GlassCard><WalletCards className="text-cyan-300"/><p className="mt-2 text-xs text-slate-500">موجودی</p><b>{state.wallet.coinBalance.toLocaleString('fa-IR')} VEX COIN</b></GlassCard><GlassCard><Crown className="text-purple-300"/><p className="mt-2 text-xs text-slate-500">Premium</p><b>{state.premium.isPremium?'فعال':'Free'}</b></GlassCard><Link to="/wallet"><GlassCard><p className="text-sm text-slate-400">VEX WALLET</p><b>مدیریت موجودی و تراکنش ←</b></GlassCard></Link></div>}
  {tab==='plus'?<div className="grid gap-4 lg:grid-cols-3">{data.plans.map(p=><GlassCard key={p.id}><Crown className="text-purple-300"/><h2 className="mt-3 text-2xl font-black">{p.name}</h2><p className="mt-3 text-3xl font-black">{Number(p.priceToman).toLocaleString('fa-IR')} <span className="text-sm text-slate-500">تومان</span></p><ul className="mt-5 space-y-2 text-sm text-slate-300">{['VIP/PLUS Badge','Premium Frame و Background','Themes و Name Effects','Premium Stickers و Emojis','حذف تبلیغات','امکانات ظاهری بیشتر'].map(x=><li key={x}><Check size={14} className="ml-1 inline text-cyan-300"/>{x}</li>)}</ul><button disabled={state?.premium?.isPremium} onClick={()=>buyPlus(p.id)} className="mt-6 w-full rounded-2xl bg-cyan-300 py-3 font-bold text-slate-950">{state?.premium?.isPremium?'Premium Active':'خرید VEXORA PLUS'}</button></GlassCard>)}</div>
  :<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{data.items.map(i=>{const isLocked=i.accessType==='PREMIUM'&&!state?.premium?.isPremium;return <GlassCard key={i.id}><div className="flex h-32 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-300/10 to-purple-400/10"><Sparkles className="text-cyan-300" size={34}/></div><div className="mt-4 flex justify-between gap-3"><div><b>{i.name}</b><p className="mt-1 text-xs text-slate-500">{i.description}</p></div><span className="text-xs text-cyan-300">{i.accessType==='PREMIUM'?'PLUS':i.price+' VEX'}</span></div><button disabled={!user||owned.has(i.code)||isLocked} onClick={()=>buyItem(i.id)} className="mt-4 w-full rounded-xl border border-cyan-300/20 bg-cyan-300/10 py-2 text-sm">{owned.has(i.code)?'Purchased':isLocked?'فقط PLUS':'خرید'}</button></GlassCard>})}</div>}
 </div>
}
