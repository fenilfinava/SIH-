"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { useRouter } from "next/navigation";
import { Loader2, Sprout } from "lucide-react";
import { auth } from "@/lib/firebase";
import { RecaptchaVerifier, signInWithPhoneNumber } from "firebase/auth";

declare global {
  interface Window {
    recaptchaVerifier: any;
  }
}

export default function LoginPage() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [step, setStep] = useState<"form" | "otp">("form");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [generatedOtp, setGeneratedOtp] = useState("");
  const [confirmationResult, setConfirmationResult] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { login, user, isLoading: authLoading } = useAuth();
  const { t, language, setLanguage } = useLanguage();
  const router = useRouter();

  useEffect(() => {
    if (typeof window !== 'undefined' && !window.recaptchaVerifier) {
      window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
        'size': 'invisible',
      });
    }
  }, []);


  useEffect(() => {
    if (!authLoading && user) {
      if (user.role === 'ADMIN') router.replace('/official-dashboard');
      else if (user.role === 'OFFICER') router.replace('/expert-dashboard');
      else router.replace('/');
    }
  }, [user, authLoading, router]);

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === "signup" && !name) return alert(t('login_err_name'));
    if (!phone || !password) return alert(t('login_err_fill'));
    if (phone.length !== 10) return alert(t('login_err_phone'));

    if (phone === "9999999999" || phone === "8888888888") {
      setGeneratedOtp("123456");
      setStep("otp");
      return;
    }
    
    try {
      const appVerifier = window.recaptchaVerifier;
      const phoneNumber = `+91${phone}`;
      const confirmation = await signInWithPhoneNumber(auth, phoneNumber, appVerifier);
      setConfirmationResult(confirmation);
      setStep("otp");
    } catch (error: any) {
      console.error(error);
      alert("SMS Error: " + error.message);
    }
  };

  
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setIsLoading(true);
    
    if (phone !== "9999999999" && phone !== "8888888888") {
      try {
        await confirmationResult.confirm(otp);
      } catch (error) {
        setIsLoading(false);
        return alert("Invalid OTP entered!");
      }
    } else {
      if (otp !== "123456") {
        setIsLoading(false);
        return alert("Invalid OTP entered!");
      }
    }
    try {
      const loggedUser = await login(mode, mode === "signup" ? name : "existing_user", phone, password);
      setTimeout(() => {
        if (mode === "signup") {
          router.push("/onboarding");
        } else {
          // Check role from localStorage since login updates it
          const stored = localStorage.getItem("krushi_user");
          if (stored) {
             const u = JSON.parse(stored);
             if (u.role === 'ADMIN') router.push('/official-dashboard');
             else if (u.role === 'OFFICER') router.push('/expert-dashboard');
             else router.push('/');
          } else {
             router.push('/');
          }
        }
      }, 500);
    } catch (e) {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative flex flex-col items-center justify-center p-4 overflow-hidden">
      
      {/* Language Selector Top Right */}
      <div className="absolute top-4 right-4 z-50">
        <select 
          value={language}
          onChange={(e) => setLanguage(e.target.value as any)}
          className="bg-white/20 backdrop-blur-md border border-white/40 text-white text-sm rounded-lg focus:ring-green-500 focus:border-green-500 block p-2 outline-none cursor-pointer"
        >
          <option value="gu" className="text-gray-900">ગુજરાતી</option>
          <option value="hi" className="text-gray-900">हिंदी</option>
          <option value="en" className="text-gray-900">English</option>
        </select>
      </div>
      {/* Background Image */}
      <div 
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: "url('/hero-bg.jpg')" }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-green-900/70 via-green-900/50 to-black/80" />

      {/* Content */}
      <div className="relative z-10 w-full max-w-md">
        {/* Logo & Title */}
        <div className="text-center mb-8">
          <div className="relative inline-block">
            <img src="/logo.jpg" alt="Logo" className="w-28 h-28 mx-auto rounded-full shadow-2xl border-4 border-white/30 mb-4" />
            <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-green-500 rounded-full flex items-center justify-center shadow-lg">
              <Sprout size={16} className="text-white" />
            </div>
          </div>
          <h1 className="text-4xl font-bold text-white drop-shadow-lg">{t('login_title') || 'Krushi Sarathi'}</h1>
          <p className="text-green-100 mt-2 text-lg drop-shadow">{t('login_subtitle') || 'Your Digital Farmer Friend'} 🌾</p>
        </div>

        {/* Card */}
        <div className="bg-white/95 backdrop-blur-xl rounded-3xl p-8 shadow-2xl border border-white/20">
          
          {step === "form" && (
            <div className="flex justify-between mb-8 bg-gray-100 rounded-2xl p-1">
              <button 
                className={`py-3 text-base font-bold w-1/2 rounded-xl transition-all ${mode === "signin" ? "bg-green-600 text-white shadow-md" : "text-gray-500 hover:text-gray-700"}`}
                onClick={() => setMode("signin")}
              >
                {t('login_tab_signin') || 'Sign In'}
              </button>
              <button 
                className={`py-3 text-base font-bold w-1/2 rounded-xl transition-all ${mode === "signup" ? "bg-green-600 text-white shadow-md" : "text-gray-500 hover:text-gray-700"}`}
                onClick={() => setMode("signup")}
              >
                {t('login_tab_signup') || 'Create Account'}
              </button>
            </div>
          )}

          {step === "form" ? (
            <form onSubmit={handleSendOtp} className="space-y-5">
              {mode === "signup" && (
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">{t('login_name_label')}</label>
                  <input 
                    type="text" required value={name} onChange={(e) => setName(e.target.value)}
                    placeholder={t('login_name_placeholder')}
                    className="w-full border border-gray-200 rounded-xl p-4 outline-none focus:ring-2 focus:ring-green-500 bg-gray-50 focus:bg-white transition"
                  />
                </div>
              )}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">{t('login_phone_label')}</label>
                <div className="flex">
                  <span className="inline-flex items-center px-4 rounded-l-xl border border-r-0 border-gray-200 bg-green-50 text-green-700 font-bold text-sm">+91</span>
                  <input 
                    type="tel" required maxLength={10} value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                    placeholder="9876543210"
                    className="w-full border border-gray-200 rounded-r-xl p-4 outline-none focus:ring-2 focus:ring-green-500 bg-gray-50 focus:bg-white transition"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">{t('login_pass_label')}</label>
                <input 
                  type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
                  placeholder={mode === "signup" ? t('login_pass_new') : t('login_pass_enter')}
                  className="w-full border border-gray-200 rounded-xl p-4 outline-none focus:ring-2 focus:ring-green-500 bg-gray-50 focus:bg-white transition"
                />
              </div>
              <button type="submit" className="w-full bg-green-600 text-white font-bold text-lg py-4 rounded-xl hover:bg-green-700 transition flex justify-center shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]">
                {t('login_btn_next')} →
              </button>
            </form>
          ) : (
            <form onSubmit={handleLogin} className="space-y-6">
              <div className="text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-3xl">📱</span>
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">{t('login_otp_title')}</h2>
                <p className="text-gray-500 text-sm">{t('login_otp_sent')} <span className="font-bold text-gray-700">+91 {phone}</span></p>
                {(phone === "9999999999" || phone === "8888888888") && (
                  <div className="mt-3 bg-green-50 border border-green-200 text-green-800 p-3 rounded-xl text-center">
                    <p className="text-xs text-green-600 font-medium mb-1">🔐 Demo Account OTP</p>
                    <p className="text-3xl font-black tracking-[0.3em] text-green-700">123456</p>
                  </div>
                )}
              </div>
              <div>
                <input 
                  type="text" required maxLength={6} value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  placeholder="• • • • • •"
                  className="w-full border-2 border-green-200 rounded-xl p-4 text-center text-3xl tracking-[1em] outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-green-50/50"
                />
              </div>
              <button type="submit" disabled={isLoading} className="w-full bg-green-600 text-white font-bold text-lg py-4 rounded-xl hover:bg-green-700 transition flex justify-center gap-2 shadow-lg">
                {isLoading ? <Loader2 className="animate-spin" /> : `✓ ${t('login_otp_verify')}`}
              </button>
              <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setStep("form"); }} className="w-full text-green-600 font-bold text-sm text-center hover:underline">
                ← {t('login_otp_back')}
              </button>
            </form>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-white/60 text-xs mt-6">
          {t('powered_by')}
        </p>
      </div>
      <div id="recaptcha-container"></div>
    </div>
  );
}
