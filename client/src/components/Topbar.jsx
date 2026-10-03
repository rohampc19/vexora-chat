import {Link,NavLink} from "react-router-dom";
import {Bell,Home,Newspaper,Users,MessageCircle,UserCircle} from "lucide-react";
import {useAuth} from "../context/AuthContext";

const items=[["/","خانه",Home],["/news","اخبار",Newspaper],["/community","کامیونیتی",Users],["/chat","چت",MessageCircle],["/profile","پروفایل",UserCircle]];

export default function Topbar(){
  const {user}=useAuth();
  return <header className="site-topbar sticky top-0 z-40 border-b border-white/8 bg-[#050812]/75 backdrop-blur-xl">
    <div className="container-tx flex min-h-16 items-center gap-5 py-2">
      <Link to="/" className="glow-text shrink-0 text-lg font-black tracking-wide" dir="ltr">VEXORA <span className="text-cyan-300">CHAT</span></Link>
      <nav aria-label="ناوبری اصلی" className="hidden min-w-0 flex-1 items-center justify-center gap-1 md:flex">
        {items.map(([to,label,Icon])=><NavLink key={to} to={to} end={to==="/"} className={({isActive})=>"topbar-link group inline-flex h-11 items-center gap-2 rounded-full px-4 text-sm font-medium transition "+(isActive?"is-active bg-white/[0.08] text-white shadow-[inset_0_1px_0_rgba(255,255,255,.05)]":"text-white/65 hover:bg-white/[0.045] hover:text-white")}>
          <Icon size={17} strokeWidth={1.6}/><span>{label}</span>
        </NavLink>)}
      </nav>
      <div className="mr-auto flex shrink-0 items-center gap-1">
        <Link to="/notifications" aria-label="اعلان‌ها" className="focus-ring rounded-full p-2.5 text-slate-300 hover:bg-white/5"><Bell size={19}/></Link>
        {user?<Link to="/profile" className="focus-ring max-w-36 truncate rounded-full border border-cyan-300/20 bg-white/5 px-3 py-2 text-sm">{user.displayName}</Link>:<><Link to="/login" className="focus-ring rounded-full px-3 py-2 text-sm text-slate-300">ورود</Link><Link to="/register" className="focus-ring rounded-full bg-cyan-300 px-3 py-2 text-sm font-bold text-slate-950">ثبت‌نام</Link></>}
      </div>
    </div>
  </header>
}