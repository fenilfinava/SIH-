"use client";

import { useEffect, useState } from "react";
import { Sprout } from "lucide-react";

export default function SplashScreen({ onFinish }: { onFinish: () => void }) {
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    const timer1 = setTimeout(() => setFadeOut(true), 1800);
    const timer2 = setTimeout(() => onFinish(), 2300);
    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, [onFinish]);

  return (
    <div className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center transition-opacity duration-500 ${fadeOut ? 'opacity-0' : 'opacity-100'}`}>
      {/* Background */}
      <div 
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: "url('/hero-bg.jpg')" }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-green-900/80 via-green-800/70 to-black/90" />
      
      {/* Content */}
      <div className="relative z-10 flex flex-col items-center">
        {/* Logo with pulse animation */}
        <div className="relative mb-8">
          <div className="absolute inset-0 rounded-full bg-green-400/30 animate-ping" style={{ animationDuration: '2s' }} />
          <img 
            src="/logo.jpg" 
            alt="Krushi Sarathi" 
            className="w-32 h-32 rounded-full shadow-2xl border-4 border-white/30 relative z-10 animate-bounce"
            style={{ animationDuration: '2s', animationIterationCount: '1' }}
          />
          <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-green-500 rounded-full flex items-center justify-center shadow-lg z-20">
            <Sprout size={20} className="text-white" />
          </div>
        </div>

        {/* Title */}
        <h1 className="text-5xl font-bold text-white drop-shadow-lg mb-3 animate-fade-in">
          Krushi Sarathi
        </h1>
        <p className="text-green-200 text-lg drop-shadow animate-fade-in-delay">
          Your Digital Farmer Friend 🌾
        </p>

        {/* Loading dots */}
        <div className="flex gap-2 mt-10">
          <div className="w-3 h-3 bg-green-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
          <div className="w-3 h-3 bg-green-300 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
          <div className="w-3 h-3 bg-green-200 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    </div>
  );
}
