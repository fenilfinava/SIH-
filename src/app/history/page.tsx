"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { supabase } from "@/lib/supabase";
import { Loader2, History, Leaf, Camera, CheckCircle, AlertTriangle, AlertCircle } from "lucide-react";
import Link from "next/link";

export default function HistoryPage() {
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchHistory() {
      if (!user) return;
      try {
        const scans = await supabase.from("disease_reports").select("*");
        let myScans = [];
        if (user.role === 'OFFICER') {
          myScans = scans.filter((s:any) => s.status !== 'pending' && (s.location_name || '').toLowerCase() === (user.location || '').toLowerCase());
        } else {
          myScans = scans.filter((s:any) => s.farmer_id === user.id);
        }
        
        if (myScans && myScans.length > 0) {
          const localeCode = language === 'gu' ? 'gu-IN' : language === 'hi' ? 'hi-IN' : 'en-IN';
          const formattedHistory = myScans.reverse().map((scan: any) => ({
            id: scan.id,
            date: new Date(scan.created_at).toLocaleDateString(localeCode, { day: 'numeric', month: 'short', year: 'numeric' }),
            disease: scan.ai_disease,
            confidence: scan.confidence_score,
            status: scan.status,
            notes: scan.officer_notes,
            image: scan.image_url
          }));
          setHistory(formattedHistory);
        } else {
          setHistory([]);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    
    fetchHistory();
  }, [user, language]);

  const handleDispute = async (id: string) => {
    try {
      await supabase.from("disease_reports").eq("id", id).update({ status: 'pending', officer_notes: "Disputed by Farmer: Please re-check" });
      alert("Dispute raised. An officer will re-verify this report manually.");
      setHistory(h => h.map(item => item.id === id ? { ...item, status: 'pending', notes: "Disputed by Farmer" } : item));
    } catch(e) {}
  };

  if (!user) return <div className="p-8 text-center text-gray-500">Loading...</div>;

  return (
    <div className="p-4 sm:p-8 max-w-4xl mx-auto pb-24">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center">
          <History size={24} />
        </div>
        <h1 className="text-3xl font-bold text-gray-900">{t('history')}</h1>
      </div>

      {loading ? (
        <div className="flex justify-center p-12">
          <Loader2 className="animate-spin text-green-500 w-8 h-8" />
        </div>
      ) : history.length === 0 ? (
        <div className="bg-white p-12 rounded-3xl border border-dashed border-gray-300 text-center shadow-sm">
          <Leaf size={48} className="mx-auto text-gray-300 mb-4" />
          <h3 className="text-xl font-bold text-gray-700">No History Found</h3>
          <p className="text-gray-500 mt-2 mb-6">You haven't scanned any crops yet.</p>
          <div className="flex justify-center">
            <Link href="/camera" className="bg-green-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-green-700 transition">Scan Now</Link>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {history.map((item, index) => (
            <div key={index} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row gap-6 hover:border-green-300 transition">
              <div className="w-full md:w-32 h-32 bg-gray-100 rounded-xl overflow-hidden shrink-0">
                 <img src={item.image || "https://images.unsplash.com/photo-1592982537447-7440770cbfc9"} className="w-full h-full object-cover" />
              </div>
              
              <div className="flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start">
                    <h3 className="text-lg font-bold text-gray-900">{item.disease}</h3>
                    <span className={`px-2 py-1 text-xs font-bold rounded-full ${item.status === 'validated' ? 'bg-green-100 text-green-700' : item.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>
                      {user.role === 'OFFICER' ? (item.status === 'validated' ? 'Resolved' : 'Referred to Lab') : (item.status === 'validated' ? 'Confirmed by Officer' : item.status === 'rejected' ? 'Lab Test Req' : 'AI Verification Pending')}
                    </span>
                  </div>
                  <p className="text-sm font-bold text-gray-400 mt-1">{item.date} • Confidence: {item.confidence}%</p>
                </div>
                
                {item.notes && (
                  <div className="bg-blue-50 p-3 rounded-lg mt-3 border border-blue-100 text-sm text-blue-800 flex items-start gap-2">
                    <AlertCircle size={16} className="mt-0.5 shrink-0" />
                    <span><b>Officer Note:</b> {item.notes}</span>
                  </div>
                )}
                
                {item.status === 'validated' && user.role !== 'OFFICER' && (
                  <div className="mt-4 flex justify-end">
                    <button onClick={() => handleDispute(item.id)} className="text-sm text-red-500 font-bold border border-red-200 px-3 py-1.5 rounded-lg hover:bg-red-50">
                      Dispute / Request Re-check
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
