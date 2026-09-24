"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Home, Camera, History, Sprout, LogOut, Droplets, Bell, Users, CheckCircle } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { useAuth } from '@/context/AuthContext';
import { LanguageCode } from '@/utils/translations';

export default function TopNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { t, language, setLanguage } = useLanguage();
  const { user, logout } = useAuth();
  const [showBell, setShowBell] = useState(false);
  const [alerts, setAlerts] = useState<any[]>([]);

  useEffect(() => {
    if (user && user.role === 'FARMER') {
      const fetchAlerts = async () => {
        try {
          const res = await supabase.from('bulletins').select('*');
          if (res && res.length > 0) setAlerts(res.slice(0,5));
          else throw new Error("empty");
        } catch(e) {
          const saved = JSON.parse(localStorage.getItem('demo_bulletins') || '[]');
          setAlerts(saved.slice(0,5));
        }
      };
      fetchAlerts();
      const interval = setInterval(fetchAlerts, 10000);
      return () => clearInterval(interval);
    }
  }, [user]);

  useEffect(() => {
    if (user?.role === 'ADMIN' && language !== 'en') {
      setLanguage('en' as LanguageCode);
    } else if (user?.role === 'OFFICER' && !['en', 'hi'].includes(language)) {
      setLanguage('hi' as LanguageCode);
    }
  }, [user?.role, language, setLanguage]);


  
  let links = [];
  if (user?.role === 'ADMIN') {
    links = [
      { href: '/official-dashboard', label: 'Command Center', icon: Home },
      { href: '/hotspots', label: 'Hotspot Map', icon: History },
      { href: '/officers', label: 'Officers Data', icon: Users }
    ];
  } else if (user?.role === 'OFFICER') {
    links = [
      { href: '/expert-dashboard', label: 'Validation Queue', icon: Home },
      { href: '/hotspots', label: 'My Region', icon: History },
      { href: '/history', label: 'Resolved Cases', icon: CheckCircle }
    ];
  } else {
    links = [
      { href: '/', label: t('dashboard') || 'Dashboard', icon: Home },
      { href: '/camera', label: t('disease_title') || 'Scan', icon: Camera },
      { href: '/history', label: t('history') || 'History', icon: History },
    ];
  }


  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  if (pathname === '/login' || pathname === '/onboarding') return null;

  return (
    <>
    <nav className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16 gap-4">
          <Link href="/" className="flex items-center gap-3">
            <img src="/logo.jpg" alt="Krushi Sarathi Logo" className="w-10 h-10 object-contain rounded-full border border-gray-100 shadow-sm" />
            <span className="text-2xl font-bold text-green-700 hidden sm:block">Krushi Sarathi</span>
          </Link>
          <div className="hidden md:flex space-x-8 shrink-0 h-full flex-1 justify-center">
            {links.map((link) => {
              const isActive = pathname === link.href;
              const Icon = link.icon;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`inline-flex items-center h-full px-1 border-b-2 text-sm font-medium ${
                    isActive
                      ? 'border-green-600 text-green-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="mr-2" size={18} />
                  <span className="hidden sm:inline">{link.label}</span>
                </Link>
              );
            })}
          </div>
          <div className="flex items-center space-x-2 md:space-x-4 shrink-0">
             {(!user || user?.role === 'FARMER') && (
              <div className="relative">
                <button 
                  onClick={() => setShowBell(!showBell)}
                  className="p-2 text-gray-500 hover:text-red-500 hover:bg-red-50 rounded-full transition relative"
                >
                  <Bell size={20} />
                  {alerts.length > 0 && <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-500 rounded-full"></span>}
                </button>
                
                {showBell && (
                  <div className="absolute right-0 mt-2 w-72 bg-white border border-gray-100 rounded-xl shadow-lg z-50 p-4">
                    <h4 className="font-bold text-gray-800 mb-2 border-b pb-2">🚨 Notifications</h4>
                    {alerts.length === 0 ? (
                      <p className="text-sm text-gray-500">No new alerts.</p>
                    ) : (
                      <ul className="space-y-3">
                        {alerts.map((a:any, i:number) => (
                          <li key={i} className="text-sm text-gray-700 bg-red-50 p-2 rounded-lg border border-red-100">
                            <span className="text-xs font-bold text-red-800 block mb-1">{a.region}</span>
                            {a.message}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>
             )}
             {user?.role === 'ADMIN' && (
               <button 
                 onClick={() => window.dispatchEvent(new Event('export-csv'))} 
                 className="bg-blue-600 text-white hover:bg-blue-700 px-3 py-1.5 rounded-lg flex items-center gap-2 font-bold text-sm transition"
               >
                 <span className="hidden sm:inline">Export</span> CSV
               </button>
             )}
             {/* Language Dropdown */}
             <select 
               value={language}
               onChange={(e) => setLanguage(e.target.value as LanguageCode)}
               className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-green-500 focus:border-green-500 block p-2 outline-none cursor-pointer"
             >
             {user?.role === 'ADMIN' && (
                 <option value="en">English</option>
               )}
               {user?.role === 'OFFICER' && (
                 <>
                   <option value="hi">हिंदी</option>
                   <option value="en">English</option>
                 </>
               )}
               {(!user || user?.role === 'FARMER') && (
                 <>
                   <option value="gu">ગુજરાતી (Gujarati)</option>
                   <option value="hi">हिंदी (Hindi)</option>
                   <option value="en">English</option>
                   <option value="mr">मराठी (Marathi)</option>
                   <option value="pa">ਪੰਜਾਬੀ (Punjabi)</option>
                   <option value="ta">தமிழ் (Tamil)</option>
                   <option value="te">తెలుగు (Telugu)</option>
                   <option value="bn">বাংলা (Bengali)</option>
                   <option value="kn">ಕನ್ನಡ (Kannada)</option>
                   <option value="ml">മലയാളം (Malayalam)</option>
                   <option value="or">ଓଡ଼ିଆ (Odia)</option>
                   <option value="ur">اردو (Urdu)</option>
                 </>
               )}
             </select>

             {user ? (
               <div className="flex items-center gap-3">
                 <Link href="/profile" className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center text-green-800 font-bold shadow-sm hover:bg-green-200 transition">
                   {user.name.charAt(0).toUpperCase()}
                 </Link>
                 <button onClick={handleLogout} className="text-red-500 hover:text-red-700 p-2 rounded-full hover:bg-red-50 transition">
                   <LogOut size={20} />
                 </button>
               </div>
             ) : (
               <Link href="/login" className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-bold">
                 Login
               </Link>
             )}
          </div>
        </div>
      </div>
    </nav>

    {/* Mobile Bottom Navigation */}
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 flex justify-around items-center h-16 px-2 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] pb-safe">
      {links.map((link) => {
        const isActive = pathname === link.href;
        const Icon = link.icon;
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${
              isActive ? 'text-green-600' : 'text-gray-500 hover:text-green-500'
            }`}
          >
            <Icon size={22} className={isActive ? 'animate-bounce' : ''} style={{ animationIterationCount: 1 }} />
            <span className="text-[10px] font-bold text-center leading-tight truncate w-full px-1">{link.label}</span>
          </Link>
        );
      })}
    </div>
    </>
  );
}
