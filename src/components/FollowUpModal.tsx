"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { CheckCircle, XCircle, AlertCircle, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";

export default function FollowUpModal() {
  const [showModal, setShowModal] = useState(false);
  const [originalReport, setOriginalReport] = useState<any>(null);
  const [daysSince, setDaysSince] = useState(0);
  const [loading, setLoading] = useState(false);
  
  const pathname = usePathname();
  const { user } = useAuth();
  const { language } = useLanguage();

  useEffect(() => {
    if (!user || pathname === '/login') return;
    
    async function checkFollowUp() {
      try {
        const data = await supabase.from('disease_reports').select('*');
        const myReports = data.filter((d: any) => d.farmer_id === user?.id && d.status === 'validated' && !d.followup_status);
        
        if (myReports.length > 0) {
          const oldReport = myReports.find((d: any) => {
            const days = (new Date().getTime() - new Date(d.created_at).getTime()) / (1000 * 3600 * 24);
            return days >= 1; // 1+ day for demo; production: 7 days
          });
          
          if (oldReport) {
            setOriginalReport(oldReport);
            const days = Math.floor((new Date().getTime() - new Date(oldReport.created_at).getTime()) / (1000 * 3600 * 24));
            setDaysSince(days);
            setShowModal(true);
          }
        }
      } catch(e) {}
    }
    
    const timer = setTimeout(checkFollowUp, 3000);
    return () => clearTimeout(timer);
  }, [pathname, user]);

  const handleYes = async () => {
    if (!originalReport) return;
    setLoading(true);
    try {
      await supabase.from('disease_reports').eq('id', originalReport.id).update({ followup_status: 'resolved' });
      alert("Great! Your feedback has been recorded.");
    } catch(e) {}
    setLoading(false);
    setShowModal(false);
  };

  const handleNo = async () => {
    if (!originalReport) return;
    setLoading(true);
    try {
      await supabase.from('disease_reports').eq('id', originalReport.id).update({ followup_status: 'escalated' });
      await supabase.from('disease_reports').insert({
        farmer_id: user?.id,
        farmer_name: user?.name,
        crop: originalReport.crop,
        ai_disease: originalReport.ai_disease + " (Unresolved)",
        confidence_score: originalReport.confidence_score,
        lat: originalReport.lat,
        lng: originalReport.lng,
        location_name: originalReport.location_name,
        status: 'pending',
        image_url: originalReport.image_url
      });
      alert("Ticket created! An extension worker has been notified.");
    } catch (e) {}
    setLoading(false);
    setShowModal(false);
  };

  if (!showModal || !originalReport) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-300">
        <div className="bg-green-600 p-6 text-white text-center">
          <AlertCircle size={40} className="mx-auto mb-3 opacity-90" />
          <h2 className="text-xl font-bold">Follow-Up Monitoring</h2>
          <p className="text-green-100 text-sm mt-1">Field Confirmation Required</p>
        </div>
        
        <div className="p-6">
          <p className="text-gray-700 font-medium text-center mb-6">
            {language === 'gu'
              ? <>તમે {daysSince} દિવસ પહેલાં <span className="font-bold text-gray-900">{originalReport.ai_disease}</span> માટે સ્કેન કર્યું હતું. <br/><br/>શું AI દ્વારા સૂચવેલી સારવાર કામ કરી?</>
              : language === 'hi'
              ? <>{daysSince} दिन पहले आपने <span className="font-bold text-gray-900">{originalReport.ai_disease}</span> के लिए स्कैन किया था। <br/><br/>क्या AI द्वारा सुझाया गया उपचार काम आया?</>
              : <>You scanned for <span className="font-bold text-gray-900">{originalReport.ai_disease}</span> {daysSince} day(s) ago. <br/><br/>Did the AI-recommended treatment work?</>
            }
          </p>
          <div className="grid grid-cols-2 gap-4">
            <button onClick={handleYes} disabled={loading} className="flex flex-col items-center justify-center p-4 rounded-2xl border-2 border-green-100 bg-green-50 text-green-700 font-bold gap-2">
              <CheckCircle size={32} /> {language === "gu" ? "હા (Yes)" : language === "hi" ? "हाँ (Yes)" : "✅ Yes, It Worked"}
            </button>
            <button onClick={handleNo} disabled={loading} className="flex flex-col items-center justify-center p-4 rounded-2xl border-2 border-red-100 bg-red-50 text-red-700 font-bold gap-2">
              {loading ? <Loader2 className="animate-spin" size={32} /> : <XCircle size={32} />} {language === "gu" ? "ના (No)" : language === "hi" ? "नहीं (No)" : "❌ No, Still Sick"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
