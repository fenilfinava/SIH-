"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { CheckCircle, AlertTriangle, MapPin, Edit3, FlaskConical, Megaphone } from "lucide-react";
import MapComponent from "@/components/MapComponent";

export default function ExpertDashboard() {
  const { user, isLoading } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();
  const [queue, setQueue] = useState<any[]>([]);
  const [bulletin, setBulletin] = useState("");

  useEffect(() => {
    if (!isLoading && (!user || user.role !== 'OFFICER')) {
      router.push('/');
    }
  }, [user, isLoading, router]);

  useEffect(() => {
    async function fetchQueue() {
      try {
        const res = await supabase.from('disease_reports').select('*');
        const pending = res.filter((d: any) => d.status === 'pending');
        setQueue(pending);
      } catch (e) {}
    }
    fetchQueue();
    const interval = setInterval(fetchQueue, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleAction = async (id: string, newStatus: string, extraData: any = {}) => {
    try {
      await supabase.from('disease_reports').eq('id', id).update({ status: newStatus, ...extraData });
      setQueue(q => q.filter((i: any) => i.id !== id));
    } catch(e) {}
  };

  const handleSendBulletin = async (e: any) => {
    e.preventDefault();
    const newBulletin = { 
        id: Date.now().toString(),
        officer_id: user?.id, 
        region: user?.location || 'All', 
        message: bulletin,
        created_at: new Date().toISOString()
    };
    
    // Save to local storage for demo fallback
    const saved = JSON.parse(localStorage.getItem('demo_bulletins') || '[]');
    localStorage.setItem('demo_bulletins', JSON.stringify([newBulletin, ...saved]));

    try {
      await supabase.from('bulletins').insert({ 
        officer_id: user?.id, 
        region: user?.location || 'All', 
        message: bulletin 
      });
    } catch(e) {
      console.log("Supabase insert failed, using local storage fallback");
    }
    
    alert("Bulletin sent to all farmers in your zone!");
    setBulletin("");
  };

  if (isLoading || !user) return null;

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      

      <div className="max-w-7xl mx-auto px-4 mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-xl font-bold text-gray-800">{t('exp_pending') || 'Pending Validations'} ({queue.length})</h2>
          
          {queue.length === 0 ? (
             <div className="bg-white p-8 rounded-2xl text-center shadow-sm">
               <CheckCircle className="mx-auto text-green-400 mb-2" size={48} />
               <p className="text-gray-500 font-medium">{t('exp_zero') || 'Inbox Zero! No pending cases.'}</p>
             </div>
          ) : queue.map((item: any) => (
            <div key={item.id} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col gap-4">
               <div className="flex gap-4">
                 <img src={item.image_url || 'https://images.unsplash.com/photo-1592982537447-7440770cbfc9'} className="w-32 h-32 rounded-xl object-cover border border-gray-200" />
                 <div className="flex-1">
                   <div className="flex justify-between items-start">
                     <div>
                       <h3 className="font-bold text-lg text-gray-900 flex items-center gap-2">
                         {item.ai_disease} 
                         {item.crop && <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">🌱 {item.crop}</span>}
                       </h3>
                       <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                         <MapPin size={12} /> {item.location_name || 'Farmer Location'} 
                       </p>
                       <p className="text-sm font-bold text-blue-600 mt-1">
                         🧑‍🌾 {item.farmer_name}
                       </p>
                     </div>
                     <span className={`text-sm font-bold px-2 py-1 rounded-full ${item.confidence_score < 80 ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'}`}>
                       {item.confidence_score}% AI
                     </span>
                   </div>
                   
                   {item.officer_notes?.includes("Farmer Query:") && (
                     <div className="mt-2 p-2 bg-yellow-50 text-yellow-800 text-sm rounded-lg border border-yellow-200 font-medium">
                       🗣️ {item.officer_notes}
                     </div>
                   )}
                   
                   <textarea id={`note-${item.id}`} placeholder="Add your advice or lab instruction..." className="w-full mt-2 p-2 bg-gray-50 rounded-lg text-sm border border-gray-200" rows={2}></textarea>
                 </div>
               </div>
               
               <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                 <button onClick={() => handleAction(item.id, 'validated')} className="flex items-center justify-center gap-1 bg-green-100 text-green-700 font-bold p-2 rounded-lg hover:bg-green-200 text-sm">
                   <CheckCircle size={16}/> {t('exp_confirm') || 'Confirm'}
                 </button>
                 <button onClick={() => {
                   const corrected = prompt("Enter correct disease name:");
                   if(corrected) handleAction(item.id, 'validated', { ai_disease: corrected, officer_notes: "Corrected AI mistake" });
                 }} className="flex items-center justify-center gap-1 bg-blue-100 text-blue-700 font-bold p-2 rounded-lg hover:bg-blue-200 text-sm">
                   <Edit3 size={16}/> {t('exp_correct') || 'Correct'}
                 </button>
                 <button onClick={() => {
                   const note = (document.getElementById(`note-${item.id}`) as HTMLTextAreaElement).value;
                   handleAction(item.id, 'rejected', { officer_notes: note || "Lab test required", followup_status: "lab_referral" });
                   alert("Referral to KVK Lab generated for farmer.");
                 }} className="flex items-center justify-center gap-1 bg-purple-100 text-purple-700 font-bold p-2 rounded-lg hover:bg-purple-200 text-sm">
                   <FlaskConical size={16}/> {t('exp_reqlab') || 'Req Lab'}
                 </button>
                 <button onClick={() => handleAction(item.id, 'rejected')} className="flex items-center justify-center gap-1 bg-gray-100 text-gray-700 font-bold p-2 rounded-lg hover:bg-gray-200 text-sm">
                   Escalate
                 </button>
               </div>
            </div>
          ))}
        </div>

        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2"><Megaphone size={18} className="text-blue-500" /> {t('exp_compose') || 'Compose Bulletin'}</h3>
            <form onSubmit={handleSendBulletin} className="space-y-3">
               <textarea 
                 required 
                 value={bulletin} 
                 onChange={e => setBulletin(e.target.value)} 
                 placeholder="E.g. Warning: Pink Bollworm spotted in your zone. Please spray Neem Oil." 
                 className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200 h-24"
               ></textarea>
               <button type="submit" className="w-full bg-blue-600 text-white font-bold p-3 rounded-xl hover:bg-blue-700">{t('exp_push') || 'Push Alert to Farmers'}</button>
            </form>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2"><AlertTriangle size={18} className="text-orange-500" /> {t('exp_hotspots') || 'Zone Hotspots'}</h3>
            <div className="h-48 rounded-xl overflow-hidden">
               <MapComponent />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
