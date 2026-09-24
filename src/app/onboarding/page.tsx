"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { Loader2, Mic, Sprout } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/context/LanguageContext";

export default function OnboardingPage() {
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isListening, setIsListening] = useState<string | null>(null);

  const [farmData, setFarmData] = useState({
    farm_name: "",
    area_vigha: "",
    crop_name: "",
    soil_type: "",
    sowing_date: ""
  });

  useEffect(() => {
    if (!user) {
      router.push('/login');
    }
  }, [user, router]);

  if (!user) return null;

  const startListening = (field: keyof typeof farmData) => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return alert(t('ob_err_voice'));
    
    setIsListening(field);
    const recognition = new SpeechRecognition();
    recognition.lang = language === 'gu' ? 'gu-IN' : language === 'hi' ? 'hi-IN' : 'en-IN';
    recognition.onresult = (e: any) => {
      setFarmData(prev => ({ ...prev, [field]: e.results[0][0].transcript }));
    };
    recognition.onend = () => setIsListening(null);
    recognition.start();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await supabase.from("farms").insert({
        user_id: user.id,
        farm_name: farmData.farm_name,
        area_vigha: parseFloat(farmData.area_vigha),
        crop_name: farmData.crop_name,
        soil_type: farmData.soil_type,
        sowing_date: farmData.sowing_date
      });
      router.push("/");
    } catch (e) {
      alert("Error adding farm / ખેતર ઉમેરવામાં ભૂલ આવી");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-green-50 p-4 pb-24">
      <div className="max-w-xl mx-auto pt-8">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <Sprout size={32} />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">{t('ob_title')}</h1>
          <p className="text-gray-600 mt-2">{t('ob_subtitle')}</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-3xl p-6 shadow-xl border border-green-100 space-y-6">
          {/* Farm Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">{t('ob_farm_name')}</label>
            <div className="flex gap-2">
              <input 
                type="text" required value={farmData.farm_name} onChange={e => setFarmData(prev => ({ ...prev, farm_name: e.target.value }))}
                placeholder={t('ob_farm_name_ph')}
                className="flex-1 border border-gray-300 rounded-xl p-4 outline-none focus:ring-2 focus:ring-green-500"
              />
              <button type="button" onClick={() => startListening("farm_name")} className={`p-4 rounded-xl border ${isListening === "farm_name" ? 'bg-red-100 border-red-300 text-red-600 animate-pulse' : 'bg-gray-50 border-gray-300 text-gray-500'}`}>
                <Mic size={24} />
              </button>
            </div>
          </div>
          
          {/* Area */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">{t('ob_area')}</label>
            <input 
              type="number" step="0.1" required value={farmData.area_vigha} onChange={e => setFarmData(prev => ({ ...prev, area_vigha: e.target.value }))}
              placeholder={t('ob_area_ph')}
              className="w-full border border-gray-300 rounded-xl p-4 outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>

          {/* Crop Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">{t('ob_crop')}</label>
            <div className="flex gap-2">
              <input 
                type="text" required value={farmData.crop_name} onChange={e => setFarmData(prev => ({ ...prev, crop_name: e.target.value }))}
                placeholder={t('ob_crop_ph')}
                className="flex-1 border border-gray-300 rounded-xl p-4 outline-none focus:ring-2 focus:ring-green-500"
              />
              <button type="button" onClick={() => startListening("crop_name")} className={`p-4 rounded-xl border ${isListening === "crop_name" ? 'bg-red-100 border-red-300 text-red-600 animate-pulse' : 'bg-gray-50 border-gray-300 text-gray-500'}`}>
                <Mic size={24} />
              </button>
            </div>
          </div>

          {/* Soil Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">{t('ob_soil')}</label>
            <div className="flex gap-2">
              <input 
                type="text" required value={farmData.soil_type} onChange={e => setFarmData(prev => ({ ...prev, soil_type: e.target.value }))}
                placeholder={t('ob_soil_ph')}
                className="flex-1 border border-gray-300 rounded-xl p-4 outline-none focus:ring-2 focus:ring-green-500"
              />
              <button type="button" onClick={() => startListening("soil_type")} className={`p-4 rounded-xl border ${isListening === "soil_type" ? 'bg-red-100 border-red-300 text-red-600 animate-pulse' : 'bg-gray-50 border-gray-300 text-gray-500'}`}>
                <Mic size={24} />
              </button>
            </div>
          </div>
          
          {/* Sowing Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">{t('ob_date')}</label>
            <input 
              type="date" required value={farmData.sowing_date} onChange={e => setFarmData(prev => ({ ...prev, sowing_date: e.target.value }))}
              className="w-full border border-gray-300 rounded-xl p-4 outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>

          <button 
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-green-600 text-white font-bold text-lg py-4 rounded-xl hover:bg-green-700 transition flex justify-center items-center gap-2 shadow-md mt-8"
          >
            {isSubmitting ? <Loader2 className="animate-spin" /> : t('ob_save')}
          </button>
        </form>
      </div>
    </div>
  );
}
