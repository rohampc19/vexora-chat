import {Link} from 'react-router-dom';import {Bell} from 'lucide-react';import {useAuth} from '../context/AuthContext';

export default function Topbar(){
  const {user}=useAuth();
  return <header className="site-topbar sticky top-0 z-40 border-b border-white/8 bg-[#050812]/70 backdrop-blur-xl">
    <div className="container-tx flex h-16 items-center justify-between gap-4">
      <Link to="/" className="glow-text text-lg font-black tracking-wide" dir="ltr">VEXORA <span className="text-cyan-300">CHAT</span></Link>
      <div className="flex items-center gap-2">
        <Link to="/notifications" aria-label="اعلان‌ها" className="focus-ring rounded-2xl p-2 text-slate-300 hover:bg-white/5"><Bell size={19}/></Link>
        {user?<Link to="/profile" className="focus-ring rounded-full border border-cyan-300/20 bg-white/5 px-3 py-2 text-sm">{user.displayName}</Link>:<><Link to="/login" className="focus-ring rounded-2xl px-3 py-2 text-sm text-slate-300">ورود</Link><Link to="/register" className="focus-ring rounded-2xl bg-cyan-300 px-3 py-2 text-sm font-bold text-slate-950">ثبت‌نام</Link></>}
      </div>
    </div>
  </header>
}