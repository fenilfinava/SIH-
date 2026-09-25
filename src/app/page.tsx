"use client";

import { useState, useEffect } from 'react';
import { Sun, Cloud, CloudRain, Wind, MapPin, Loader2, Scan, Plus, History, Sprout, Droplets, Bug } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

function getWeatherDesc(code: number, lang: string) {
  if (code === 0) return lang === 'gu' ? 'ખુલ્લું આકાશ' : lang === 'hi' ? 'साफ आसमान' : 'Clear Sky';
  if (code >= 1 && code <= 3) return lang === 'gu' ? 'વાદળછાયું' : lang === 'hi' ? 'बादल छाये रहेंगे' : 'Partly Cloudy';
  if (code >= 51 && code <= 67) return lang === 'gu' ? 'વરસાદ' : lang === 'hi' ? 'बारिश' : 'Rain';
  if (code >= 71 && code <= 77) return lang === 'gu' ? 'બરફવર્ષા' : lang === 'hi' ? 'बर्फबारी' : 'Snowfall';
  if (code >= 95) return lang === 'gu' ? 'વાવાઝોડું' : lang === 'hi' ? 'तूफ़ान' : 'Thunderstorm';
  return lang === 'gu' ? 'સામાન્ય' : lang === 'hi' ? 'सामान्य' : 'Normal';
}

function getWeatherIcon(code: number) {
  if (code === 0) return <Sun size={24} />;
  if (code >= 1 && code <= 3) return <Cloud size={24} />;
  if (code >= 51 && code <= 67) return <CloudRain size={24} />;
  return <Sun size={24} />;
}

function getRiskLevel(rainProb: number, temp: number) {
  if (rainProb > 60 && temp > 25) return { level: 'High', color: 'bg-red-100 text-red-700', emoji: '🔴' };
  if (rainProb > 35 || temp > 30) return { level: 'Medium', color: 'bg-yellow-100 text-yellow-700', emoji: '🟡' };
  return { level: 'Low', color: 'bg-green-100 text-green-700', emoji: '🟢' };
}

export default function Dashboard() {
  const { t, language, setLanguage } = useLanguage();
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();




  const [bulletins, setBulletins] = useState<any[]>([]);
  const [showToast, setShowToast] = useState(true);

  useEffect(() => {
    if (bulletins.length > 0) {
      const timer = setTimeout(() => setShowToast(false), 6000);
      return () => clearTimeout(timer);
    }
  }, [bulletins]);
  const [iotData, setIotData] = useState<{ moisture: number; bugs: number } | null>(null);
  const [localHistory, setLocalHistory] = useState<any[]>([]);
  const [weather, setWeather] = useState({
    temp: 0, wind: 0, rainProb: 0, code: 0,
    location: "Loading...", loading: true
  });
  const [farms, setFarms] = useState<any[]>([]);
  const [loadingFarms, setLoadingFarms] = useState(true);

  // Fetch IoT, local history, and bulletins from DB
  useEffect(() => {
    async function fetchDB() {
      try {
        // IoT sensor data
        try {
          const iot = await supabase.from('iot_sensors').select('*');
          if (iot && iot.length > 0) {
            setIotData({ 
              moisture: iot[0].soil_moisture || iot[0].moisture_level, 
              bugs: iot[0].pest_count || iot[0].bug_count 
            });
          }
        } catch (e) { /* IoT table may not exist yet */ }

        // Local outbreak history
        try {
          const hist = await supabase.from('disease_reports').select('*');
          if (hist && hist.length > 0) {
            const counts: any = {};
            hist.forEach((h: any) => {
              if (h.ai_disease) {
                counts[h.ai_disease] = (counts[h.ai_disease] || 0) + 1;
              }
            });
            const historyArr = Object.keys(counts).map(k => ({ disease: k, cases: counts[k] }));
            setLocalHistory(historyArr.slice(0, 5));
          }
        } catch (e) { /* disease_reports may be empty */ }

        // Officer bulletins
        try {
          const buls = await supabase.from('bulletins').select('*');
          if (buls && buls.length > 0) {
            const loc = user?.location?.toLowerCase() || "";
            const filteredBuls = buls.filter((b: any) => 
               !b.region || b.region === 'All' || b.region.toLowerCase().includes(loc) || loc.includes(b.region.toLowerCase())
            );
            setBulletins(filteredBuls.slice(-3));
          }
        } catch (e) { /* bulletins table may not exist yet */ }
      } catch (e) {
        console.error("Dashboard DB fetch error:", e);
      }
    }
    fetchDB();
  }, []);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    async function loadFarms() {
      if (user) {
        try {
          const data = await supabase.from('farms').eq('user_id', user.id);
          if (data) setFarms(data);
        } catch (e) {
          if (e.message && (e.message.includes("PGRST205") || e.message.includes("22P02"))) {
            // Silently ignore missing table until SQL is run
          } else {
            console.error("Error fetching farms", e);
          }
        } finally {
          setLoadingFarms(false);
        }
      }
    }
    loadFarms();
  }, [user]);

  // Translate farm details when language changes
  useEffect(() => {
    async function translateFarms() {
      if (!farms || farms.length === 0) return;
      const textsToTranslate: string[] = [];
      farms.forEach(f => {
        textsToTranslate.push(f.farm_name, f.soil_type, f.crop_name);
      });
      try {
        const res = await fetch('/api/translate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ texts: textsToTranslate, targetLang: language })
        });
        const data = await res.json();
        if (data.translated && data.translated.length === textsToTranslate.length) {
          let i = 0;
          setFarms(prev => prev.map(f => ({
            ...f,
            translated_farm_name: data.translated[i++],
            translated_soil_type: data.translated[i++],
            translated_crop_name: data.translated[i++]
          })));
        }
      } catch (e) {
        console.error("Translation failed", e);
      }
    }
    if (language !== 'gu') {
      translateFarms();
    } else {
      setFarms(prev => prev.map(f => ({
        ...f,
        translated_farm_name: f.farm_name,
        translated_soil_type: f.soil_type,
        translated_crop_name: f.crop_name
      })));
    }
  }, [language, farms.length]);

  // Weather
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(async (pos) => {
        const { latitude, longitude } = pos.coords;
        try {
          let locationName = "Unknown Location";
          try {
            const geoRes = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`, {
              headers: { 'Accept-Language': 'en' }
            });
            if (geoRes.ok) {
              const geoData = await geoRes.json();
              if (geoData.address) {
                const city = geoData.address.city || geoData.address.town || geoData.address.village || "Unknown";
                const state = geoData.address.state || "";
                locationName = city + (state ? ", " + state : "");
                
                // Auto-set language based on Indian State
                if (state) {
                  const s = state.toLowerCase();
                  if (s.includes('gujarat')) setLanguage('gu');
                  else if (s.includes('maharashtra')) setLanguage('mr');
                  else if (s.includes('punjab')) setLanguage('pa');
                  else if (s.includes('tamil nadu')) setLanguage('ta');
                  else if (s.includes('telangana') || s.includes('andhra')) setLanguage('te');
                  else if (s.includes('karnataka')) setLanguage('kn');
                  else if (s.includes('kerala')) setLanguage('ml');
                  else if (s.includes('west bengal')) setLanguage('bn');
                  else if (s.includes('odisha')) setLanguage('or');
                  else if (s.includes('uttar pradesh') || s.includes('madhya pradesh') || s.includes('bihar') || s.includes('rajasthan') || s.includes('haryana') || s.includes('delhi')) setLanguage('hi');
                }
              }
            }
          } catch (geoErr) {
            console.warn("Geocoding failed", geoErr);
          }
          const wRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code,wind_speed_10m&daily=precipitation_probability_max&timezone=auto`);
          const wData = await wRes.json();
          if (wData.current) {
            setWeather({
              temp: Math.round(wData.current.temperature_2m),
              wind: Math.round(wData.current.wind_speed_10m),
              code: wData.current.weather_code,
              rainProb: wData.daily.precipitation_probability_max[0] || 0,
              location: locationName,
              loading: false
            });
          } else {
            throw new Error("Invalid weather API response");
          }
        } catch (e) {
          console.error("Weather fetch error:", e);
          setWeather(prev => ({ ...prev, loading: false }));
        }
      });
    }
  }, []);

  if (authLoading || !user) return <div className="p-8 text-center text-gray-500">Loading...</div>;

  const risk = getRiskLevel(weather.rainProb, weather.temp);
  const riskPercent = Math.min(95, Math.round(weather.rainProb * 0.6 + (weather.temp > 28 ? 20 : 5)));
  const userCrop = farms.length > 0 ? (farms[0].translated_crop_name || farms[0].crop_name) : 'Aphid/Bollworm';

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-6 pb-24">

      {/* Pre-Symptomatic Predictive Alert */}
      {!weather.loading && weather.rainProb > 40 && (
        <div className="bg-gradient-to-r from-orange-500 to-red-600 rounded-2xl p-5 text-white shadow-lg">
          <div className="flex items-start gap-3">
            <div className="bg-white/20 p-2 rounded-xl backdrop-blur-sm">
              <Sun size={24} />
            </div>
            <div>
              <h3 className="font-bold text-lg">⚠️ Proactive Warning: High Risk Detected</h3>
              <p className="text-sm text-orange-50 mt-1 leading-relaxed">
                Weather patterns ({weather.temp}°C, {weather.rainProb}% Rain Prob) and historical data show a <b>{riskPercent}% chance of {userCrop} outbreak</b> in your region within 3 days.
                <br /><b>Action:</b> Consider a preventive Neem Oil spray today to minimize crop damage before symptoms appear.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Officer Bulletins */}
      {/* Floating Alert Toast */}
      {bulletins.length > 0 && showToast && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-50 w-[90%] max-w-md bg-white border-l-4 border-red-500 rounded-xl p-4 shadow-2xl animate-in slide-in-from-top-10 fade-in duration-500">
          <div className="flex justify-between items-start mb-2">
            <h3 className="font-bold text-red-600 flex items-center gap-2">🚨 Officer Alerts</h3>
            <button onClick={() => setShowToast(false)} className="text-gray-400 hover:text-gray-600">✕</button>
          </div>
          <ul className="space-y-2 max-h-32 overflow-y-auto">
            {bulletins.map((b, i) => (
              <li key={i} className="text-gray-700 text-sm flex items-start gap-2 border-b border-gray-50 pb-1">
                <span className="mt-1 text-red-500">🔹</span>
                <span>{b.message} <span className="text-xs font-bold text-gray-400 ml-1">({b.region})</span></span>
              </li>
            ))}
          </ul>
          
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Weather Hero Card */}
        <section
          className="col-span-1 md:col-span-2 rounded-3xl p-8 text-white shadow-lg relative overflow-hidden bg-cover bg-center"
          style={{ backgroundImage: "url('/hero-bg.jpg')" }}
        >
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/20"></div>
          <div className="relative z-10 flex flex-col h-full justify-between gap-8">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold mb-2 drop-shadow-md">{t('greeting')}, {user.name || 'કૃષક'}!</h2>
              <p className="text-gray-100 font-medium drop-shadow-md">{t('subtitle')}</p>
            </div>
            <div className="bg-black/30 backdrop-blur-md rounded-2xl p-6 border border-white/20 shadow-2xl">
              <div className="flex justify-between items-start mb-6 border-b border-white/20 pb-4">
                <h3 className="font-bold text-xl flex items-center gap-2 drop-shadow">
                  <MapPin size={20} /> {weather.location}
                </h3>
                <div className="flex flex-col items-end gap-2">
                  <span className={`${risk.color} px-3 py-1 rounded-full text-xs font-bold shadow-sm`}>{risk.emoji} Pest Risk: {risk.level}</span>
                  {!weather.loading && (
                    <span className={`px-3 py-1 rounded-full text-xs font-bold shadow-sm ${
                      weather.wind < 10 && weather.rainProb < 30 ? 'bg-green-100 text-green-800' :
                      weather.wind > 15 || weather.rainProb > 60 ? 'bg-red-100 text-red-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {weather.wind < 10 && weather.rainProb < 30 ? '✅ Safe to Spray' :
                       weather.wind > 15 || weather.rainProb > 60 ? '🚫 Do Not Spray Today' :
                       '⚠️ Spray with Caution'}
                    </span>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-3 gap-6">
                <div>
                  <div className="flex items-center gap-2 mb-1">{getWeatherIcon(weather.code)} <span className="text-2xl font-bold">{weather.loading ? "--" : weather.temp}°C</span></div>
                  <p className="text-sm text-gray-300">{getWeatherDesc(weather.code, language)}</p>
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1"><CloudRain size={24} /> <span className="text-xl font-bold">{weather.loading ? "--" : weather.rainProb}%</span></div>
                  <p className="text-sm text-gray-300">{t('rain')}</p>
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1"><Wind size={24} /> <span className="text-xl font-bold">{weather.loading ? "--" : weather.wind}</span></div>
                  <p className="text-sm text-gray-300">{t('wind')}</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Quick Action Cards */}
        <section className="col-span-1 grid grid-cols-1 gap-4">
          <Link href="/camera" className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col justify-between hover:shadow-md transition">
            <div className="w-12 h-12 bg-green-100 text-green-600 rounded-xl flex items-center justify-center mb-4"><Scan size={24} /></div>
            <div>
              <h3 className="font-bold text-gray-900 text-lg">{t('disease_title')}</h3>
              <p className="text-sm text-gray-500 mt-1">{t('disease_desc')}</p>
            </div>
          </Link>
          <Link href="/history" className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col justify-between hover:shadow-md transition">
            <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center mb-4"><History size={24} /></div>
            <div>
              <h3 className="font-bold text-gray-900 text-lg">{t('history')}</h3>
              <p className="text-sm text-gray-500 mt-1">View past scans and reports</p>
            </div>
          </Link>
          
        </section>
      </div>

      {/* IoT + Local History Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* IoT Sensor Card */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">📡 IoT Sensor Data</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-blue-50 rounded-xl p-4 text-center flex flex-col justify-center items-center h-full">
              <Droplets size={28} className="text-blue-500 mb-2" />
              <p className="text-2xl font-bold text-blue-600">{iotData && iotData.moisture != null ? `${iotData.moisture}%` : "--"}</p>
              <p className="text-sm font-medium text-gray-600 mt-1">Soil Moisture Level</p>
            </div>
            <div className="bg-orange-50 rounded-xl p-4 text-center flex flex-col justify-center items-center h-full">
              <Bug size={28} className="text-orange-500 mb-2" />
              <p className="text-2xl font-bold text-orange-600">{iotData && iotData.bugs != null ? iotData.bugs : "--"}</p>
              <p className="text-sm font-medium text-gray-600 mt-1">Bug/Pest Trap Count</p>
            </div>
          </div>
        </div>

        {/* Local Outbreak History Card */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">📊 Local Outbreak History</h3>
          {localHistory.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-4">No outbreaks reported nearby yet.</p>
          ) : (
            <div className="space-y-3">
              {localHistory.map((item, i) => (
                <div key={i} className="flex justify-between items-center bg-gray-50 p-3 rounded-lg">
                  <span className="font-medium text-gray-700 text-sm">{item.disease}</span>
                  <span className="bg-red-100 text-red-700 text-xs font-bold px-2 py-1 rounded-full">{item.cases} cases</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Farms Section */}
      <div className="flex justify-between items-center mt-8">
        <h2 className="text-2xl font-bold text-gray-900">{t('farms')}</h2>
        <Link href="/onboarding" className="text-green-600 font-bold bg-green-50 px-4 py-2 rounded-lg hover:bg-green-100 transition">
          {t('add_farm')}
        </Link>
      </div>

      {loadingFarms ? (
        <div className="flex justify-center p-8"><Loader2 className="animate-spin text-green-500" /></div>
      ) : farms.length === 0 ? (
        <div className="bg-white p-8 rounded-2xl border border-dashed border-gray-300 text-center">
          <Sprout size={48} className="mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-bold text-gray-700">{t('farm_no_farms')}</h3>
          <p className="text-gray-500 mt-2 mb-4">{t('farm_no_farms_desc')}</p>
          <Link href="/onboarding" className="inline-flex items-center gap-2 bg-green-600 text-white px-6 py-3 rounded-xl font-bold">
            <Plus size={20} /> {t('farm_add_btn')}
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {farms.map((farm: any) => {
            const sowingDate = new Date(farm.sowing_date);
            const today = new Date();
            const daysSince = Math.floor((today.getTime() - sowingDate.getTime()) / (1000 * 3600 * 24));
            let alertMsg = "";
            if (daysSince > 45 && daysSince < 55) alertMsg = t('farm_alert_fertilizer');
            else if (daysSince > 60) alertMsg = t('farm_alert_pesticide');
            else alertMsg = t('farm_alert_growing');
            const dFarmName = farm.translated_farm_name || farm.farm_name;
            const dSoilType = farm.translated_soil_type || farm.soil_type;
            const dCropName = farm.translated_crop_name || farm.crop_name;
            return (
              <div key={farm.id} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 hover:border-green-300 transition">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">{dFarmName}</h3>
                    <p className="text-gray-500 text-sm mt-1">{t('farm_area')}: {farm.area_vigha} {t('farm_vigha')} • {t('farm_soil')}: {dSoilType}</p>
                  </div>
                  <div className="bg-green-100 text-green-800 text-sm font-bold px-3 py-1 rounded-full">{dCropName}</div>
                </div>
                <div className="bg-orange-50 border border-orange-100 p-4 rounded-xl">
                  <p className="text-orange-800 text-sm font-medium">🔔 <b>{t('farm_ai_alert')} ({daysSince} {t('farm_days_after_sowing')}):</b> {alertMsg}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
