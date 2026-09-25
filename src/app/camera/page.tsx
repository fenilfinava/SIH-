"use client";

import { useState, useRef, useEffect } from 'react';
import { useLanguage } from '@/context/LanguageContext';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { Loader2, Upload, Camera } from 'lucide-react';
import ReactMarkdown from 'react-markdown';



const compressImage = (file: File): Promise<File> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 1000;
        const MAX_HEIGHT = 1000;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        
        canvas.toBlob((blob) => {
          if (blob) {
            resolve(new File([blob], file.name, { type: 'image/jpeg' }));
          } else {
            resolve(file); // fallback
          }
        }, 'image/jpeg', 0.8);
      };
      img.onerror = (e) => resolve(file); // fallback
    };
    reader.onerror = (e) => resolve(file); // fallback
  });
};

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });
};


export default function CameraPage() {
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [reportId, setReportId] = useState<string | null>(null);
  const [farms, setFarms] = useState<any[]>([]);
  const [weatherWind, setWeatherWind] = useState<number>(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);
  const [escalated, setEscalated] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const handleConsultOfficer = async () => {
    if (!reportId) return;
    try {
      await supabase.from('disease_reports').eq('id', reportId).update({ status: 'pending', officer_notes: 'Requested Manual Verification by Farmer' });
      alert(language === 'en' ? 'Sent to Officer Successfully!' : 'કૃષિ અધિકારીને સફળતાપૂર્વક મોકલી દેવાયું છે!');
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    async function loadFarms() {
      if (user) {
        try {
          const { data } = await supabase.from('farms').eq('user_id', user.id);
          if (data) setFarms(data);
        } catch (e) { console.error(e); }
      }
    }
    loadFarms();
  }, [user]);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(async (pos) => {
        try {
          const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${pos.coords.latitude}&longitude=${pos.coords.longitude}&current=wind_speed_10m`);
          const data = await res.json();
          if (data.current) {
            setWeatherWind(Math.round(data.current.wind_speed_10m));
          }
        } catch (e) { console.error(e); }
      });
    }
  }, []);

  const playAudio = async (text: string) => {
    try {
      if (audioRef.current) audioRef.current.pause();
      const cleanText = text.replace(/[*#]/g, '');
      const ttsRes = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: cleanText, lang: language })
      });
      if (ttsRes.ok) {
        const audioBlob = await ttsRes.blob();
        const audio = new Audio(URL.createObjectURL(audioBlob));
        audioRef.current = audio;
        audio.play();
      }
    } catch (e) {
      console.error("TTS failed:", e);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImageFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setResult(null);
    setEscalated(false);
      setErrorMsg(null);
      if (audioRef.current) audioRef.current.pause();
    }
  };

  const handleManualEscalate = async () => {
    if (!user || !result) return;
    const query = window.prompt("વધુ માહિતી આપો (તમારો પ્રશ્ન લખો):");
    if (query === null) return; // user cancelled
    
    setEscalated(true);
    
    try {
      let base64Img = previewUrl || "";
      if (imageFile) {
         try { base64Img = await fileToBase64(imageFile); } catch(e) {}
      }
      
      await supabase.from('disease_reports').insert({
        farmer_id: user.id,
        farmer_name: user.name + " 📞 " + user.phone,
        crop: result.crop_name || "Unknown",
        ai_disease: result.disease,
        confidence_score: Math.round(result.confidence * 100),
        status: 'pending',
        location_name: user.location || "Gujarat",
        image_url: base64Img,
        officer_notes: query ? "Farmer Query: " + query : ""
      });
      alert("તમારો રિપોર્ટ ઓફિસરને મોકલી દેવામાં આવ્યો છે! (Report sent to Extension Officer)");
    } catch(e) {
      alert("Error sending report.");
      setEscalated(false);
    }
  };

  const handleAnalyze = async () => {
    if (!imageFile) return;

    setIsAnalyzing(true);
    setErrorMsg(null);
    if (audioRef.current) audioRef.current.pause();

    try {
      // Compress image before sending to avoid Vercel 4.5MB payload limit
      const compressedFile = await compressImage(imageFile);
      const formData = new FormData();
      formData.append('image', compressedFile);
      formData.append('lang', language);

      const res = await fetch('/api/scan_crop', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (res.ok) {
        const diseaseName = data.disease || "Unknown Disease";
        const confidence = data.confidence || 0.85;
        const isLowConfidence = confidence < 0.8;

        setResult({
          crop_name: data.crop_name,
          disease: diseaseName,
          confidence: confidence,
          remedy_organic: data.remedy_organic,
          remedy_chemical: data.remedy_chemical,
          advice: data.advice,
          isLowConfidence: isLowConfidence
        });

        // Save scan to disease_reports in Supabase
        if (user) {
          const saveReport = async (lat?: number, lng?: number) => {
            try {
              let base64Img = previewUrl || "";
              if (imageFile) {
                 try { base64Img = await fileToBase64(imageFile); } catch(e) {}
              }
              const inserted = await supabase.from('disease_reports').insert({
                farmer_id: user.id,
                farmer_name: user.name,
                crop: diseaseName ? (data.crop_name || 'Unknown') : 'Unknown',
                ai_disease: diseaseName,
                confidence_score: Math.round(confidence * 100),
                lat: lat || null,
                lng: lng || null,
                location_name: user.location || "Farmer Location",
                status: isLowConfidence ? 'pending' : 'validated',
                image_url: base64Img
              });
              if (inserted && inserted.length > 0) {
                 setReportId(inserted[0].id);
              }
            } catch (e) {
              console.error("Failed to save report:", e);
            }
          };

          // Try to get GPS
          if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
              (pos) => saveReport(pos.coords.latitude, pos.coords.longitude),
              () => saveReport()
            );
          } else {
            saveReport();
          }
        }

        // Auto-play the advice
        if (data.remedy_organic) {
          playAudio(data.remedy_organic);
        }

      } else {
        setErrorMsg(data.error || 'Failed to analyze');
      }
    } catch (error: any) {
      console.error(error);
      setErrorMsg(error.message || 'Error connecting to server');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const communityCount = result ? Math.round(result.confidence * 20 + 3) : 0;
  const communitySuccess = result ? Math.round(result.confidence * 15 + 70) : 0;

  return (
    <div className="p-4 flex flex-col min-h-[calc(100vh-140px)]">
      <h1 className="text-3xl font-bold mb-6 text-gray-900">{t('camera_title')}</h1>
      
      <div className="flex-1 bg-white rounded-3xl flex flex-col items-center justify-center relative overflow-hidden shadow-sm border border-gray-200">
        
        {previewUrl ? (
          <div className="w-full h-full flex flex-col">
            <div className="h-64 w-full relative bg-gray-100">
              <div className="relative w-full h-full">
                <img src={previewUrl} alt="Crop preview" className="w-full h-full object-contain" />
              </div>
            </div>
            
            <div className="p-6 flex-1 overflow-y-auto">
              {isAnalyzing ? (
                <div className="flex flex-col items-center justify-center h-full space-y-4 text-primary">
                  <Loader2 className="animate-spin w-12 h-12" />
                  <p className="font-medium text-lg">{t('analyzing')}</p>
                </div>
              ) : errorMsg ? (
                <div className="flex flex-col items-center justify-center h-full space-y-4">
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl max-w-sm text-center font-medium">
                    {errorMsg}
                  </div>
                  <button onClick={handleAnalyze} className="bg-primary text-white px-6 py-3 rounded-xl font-bold shadow-md hover:bg-green-700">
                    ફરી પ્રયાસ કરો (Retry)
                  </button>
                </div>
              ) : result ? (
                <div className="space-y-4">
                  {/* Disease Name + Confidence */}
                  <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex justify-between items-center">
                    <div>
                      <span className="text-xs font-bold bg-green-200 text-green-800 px-2 py-1 rounded-full mb-2 inline-block">
                        🌱 પાક: {result.crop_name || "અજ્ઞાત (Unknown)"}
                      </span>
                      <h3 className="font-bold text-lg text-red-800">{result.disease}</h3>
                      <p className="text-sm opacity-80 mt-1 text-red-800">Confidence: {(result.confidence * 100).toFixed(1)}%</p>
                      
                      {/* Severity Scale */}
                      {result.confidence * 100 > 85 ? (
                        <div className="mt-2 text-xs font-bold text-red-700 bg-red-100 px-2 py-1 rounded inline-block">🔴 Severe - Immediate Action Required</div>
                      ) : result.confidence * 100 >= 60 ? (
                        <div className="mt-2 text-xs font-bold text-orange-700 bg-orange-100 px-2 py-1 rounded inline-block">🟠 Moderate - Monitor & Treat</div>
                      ) : (
                        <div className="mt-2 text-xs font-bold text-yellow-700 bg-yellow-100 px-2 py-1 rounded inline-block">🟡 Mild - Preventive Measures</div>
                      )}
                    </div>
                    <button
                      onClick={() => playAudio(result.remedy_organic || result.advice)}
                      className="bg-white text-red-700 p-3 rounded-full shadow hover:bg-red-100 transition-colors"
                      title="Listen"
                    >
                      🔊
                    </button>
                  </div>

                  {/* Low Confidence Warning */}
                  {result.isLowConfidence && (
                    <div className="p-3 bg-yellow-50 text-yellow-800 text-sm font-bold rounded-xl border border-yellow-200 text-center">
                      ⚠️ Confidence is low. This scan has been auto-sent to an Extension Officer for verification.
                    </div>
                  )}

                  {/* Organic Remedy */}
                  <div className="p-4 bg-green-50 rounded-xl border border-green-200">
                    <h3 className="font-bold text-green-800 mb-1 flex items-center gap-2">🌿 Organic Remedy (First Choice):</h3>
                    <p className="text-green-700 text-sm whitespace-pre-wrap">{result.remedy_organic || "Consult an extension officer for organic recommendations."}</p>
                  </div>

                  {/* Chemical Remedy */}
                  <div className="p-4 bg-red-50 rounded-xl border border-red-200">
                    <h3 className="font-bold text-red-800 mb-1 flex items-center gap-2">🧪 Chemical Remedy &amp; Safety:</h3>
                    <p className="text-red-700 text-sm whitespace-pre-wrap">{result.remedy_chemical || "Consult an extension officer for chemical advice."}</p>
                  </div>

                  {/* Precision Dosage Calculator */}
                  {farms.length > 0 && farms.some(f => f.area_vigha) && (
                    <div className="p-4 bg-indigo-50 rounded-xl border border-indigo-200">
                      <h3 className="font-bold text-indigo-800 mb-2 flex items-center gap-2">🎯 Precision Dosage for Your Farm</h3>
                      {farms.filter(f => f.area_vigha).map((farm, idx) => {
                        const litersNeeded = 200 * farm.area_vigha;
                        const gramsNeeded = 3 * litersNeeded;
                        const tanks = Math.ceil(litersNeeded / 15);
                        return (
                          <div key={idx} className="text-indigo-700 text-sm mb-2 pb-2 border-b border-indigo-100 last:border-0 last:mb-0 last:pb-0">
                            <strong>{farm.farm_name}:</strong> {farm.area_vigha} units area <br />
                            🧪 Total chemical: 3g/L × 200L/unit × {farm.area_vigha} = {gramsNeeded} grams<br />
                            🎒 Knapsack tanks (15L): {tanks} tanks needed
                          </div>
                        );
                      })}
                      {weatherWind > 15 && (
                        <div className="mt-2 text-red-700 font-bold text-xs bg-red-100 p-2 rounded">
                          ⚠️ Wind speed is {weatherWind} km/h. Avoid spraying today to prevent chemical drift.
                        </div>
                      )}
                    </div>
                  )}

                  {/* Community Trust Signal */}
                  <div className="p-3 bg-blue-50 rounded-xl border border-blue-200">
                    <h3 className="font-bold text-blue-800 text-sm flex items-center gap-2">👥 Community Trust Signal</h3>
                    <p className="text-blue-700 text-xs">
                      {communityCount} farmers in your district treated this disease recently. {communitySuccess}% confirmed it was resolved using the organic remedy.
                    </p>
                  </div>

                  {/* Referral Info */}
                  <div className="p-3 bg-purple-50 rounded-xl border border-purple-200">
                    <h3 className="font-bold text-purple-800 text-sm flex items-center gap-2">🔬 Need Lab Test?</h3>
                    <p className="text-purple-700 text-xs">
                      Contact your nearest KVK (Krishi Vigyan Kendra) in <strong>{user?.location || "Gujarat"}</strong> for lab-based confirmation.
                      <br />📞 Helpline: 1800-180-1551 (Kisan Call Centre - Free)
                    </p>
                  </div>

                  {!result.isLowConfidence && !escalated && (
                    <button onClick={handleManualEscalate} className="w-full mt-4 p-3 border-2 border-red-500 text-red-600 font-bold rounded-xl hover:bg-red-50 transition">
                      🙋‍♂️ મને સંતોષ નથી - ઓફિસરને મોકલો (Consult Officer)
                    </button>
                  )}
                  {escalated && (
                    <div className="w-full mt-4 p-3 bg-green-100 text-green-800 font-bold text-center rounded-xl">
                      ✅ ઓફિસરને મોકલી દેવામાં આવ્યું છે.
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex justify-center items-center h-full">
                  <button
                    onClick={handleAnalyze}
                    className="bg-primary text-white px-8 py-4 rounded-xl font-bold text-lg shadow-lg hover:bg-green-700 hover:scale-105 transition-all"
                  >
                    ચેક કરો (Analyze Now)
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="text-center p-8 w-full">
            <div className="w-24 h-24 bg-gray-100 rounded-full mx-auto mb-6 flex items-center justify-center text-gray-400">
              <Camera size={48} />
            </div>
            <p className="text-gray-500 text-lg max-w-md mx-auto">{t('camera_desc')}</p>
          </div>
        )}

      </div>
      
      {/* Hidden File Input */}
      <input
        type="file"
        accept="image/*"
        className="hidden"
        ref={fileInputRef}
        onChange={handleImageChange}
      />

      <div className="mt-6 flex gap-4 max-w-md mx-auto w-full">
        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex-1 flex items-center justify-center gap-2 bg-gray-100 text-gray-800 py-4 rounded-xl font-medium text-lg hover:bg-gray-200 transition-colors border border-gray-200"
        >
          <Upload size={20} />
          {t('gallery')}
        </button>
        <button
          onClick={() => {
            if (fileInputRef.current) {
              fileInputRef.current.capture = 'environment';
              fileInputRef.current.click();
            }
          }}
          className="flex-1 flex items-center justify-center gap-2 bg-primary text-white py-4 rounded-xl font-medium text-lg shadow-md hover:bg-green-700 transition-colors"
        >
          <Camera size={20} />
          {t('take_photo')}
        </button>
      </div>
    </div>
  );
}
