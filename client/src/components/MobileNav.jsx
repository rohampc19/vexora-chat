import {NavLink} from 'react-router-dom';import {Home,Newspaper,Users,MessageCircle,UserCircle} from 'lucide-react';

const items=[['/','خانه',Home],['/news','اخبار',Newspaper],['/community','کامیونیتی',Users],['/chat','چت',MessageCircle],['/profile','پروفایل',UserCircle]];

export default function MobileNav(){
  return <nav aria-label="ناوبری اصلی" className="fixed left-1/2 bottom-[calc(16px+env(safe-area-inset-bottom))] z-[1400] w-[calc(100vw-32px)] max-w-[430px] -translate-x-1/2 rounded-full border border-white/[0.14] bg-white/[0.065] p-1.5 text-white shadow-[0_18px_45px_rgba(0,0,0,0.30),inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-[24px] backdrop-saturate-[120%] md:bottom-[22px] md:w-auto md:max-w-none">
    <div className="flex items-center justify-center gap-0.5">
      {items.map(([to,label,Icon])=><NavLink key={to} to={to} end={to==='/'} aria-label={label} title={label} className={({isActive})=>`group relative inline-flex h-12 min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-full px-1 text-[9px] font-medium leading-none text-white/65 no-underline transition duration-200 ease-out hover:-translate-y-px hover:bg-white/[0.045] hover:text-white/90 focus:outline-none focus-visible:ring-1 focus-visible:ring-white/40 md:h-[42px] md:min-w-[76px] md:flex-none md:flex-row md:gap-[7px] md:px-[13px] md:text-[12px] ${isActive?'bg-white/[0.075] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.045)]':'bg-transparent'}`}>
        <Icon aria-hidden="true" size={19} strokeWidth={1.55} className="shrink-0 md:size-[17px]"/>
        <span>{label}</span>
        {isActive&&<span aria-hidden="true" className="absolute bottom-[3px] left-1/2 h-[1.5px] w-[13px] -translate-x-1/2 rounded-full bg-white/55 shadow-[0_0_7px_rgba(255,255,255,0.12)]"/>}
      </NavLink>)}
    </div>
  </nav>
}