"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { supabase } from "@/lib/supabase";
import { Loader2, Trash2, Edit3, User, MapPin } from "lucide-react";
import { useRouter } from "next/navigation";

export default function ProfilePage() {
  const { user, logout } = useAuth();
  const { t, language } = useLanguage();
  const router = useRouter();
  const [farms, setFarms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // For Editing
  const [editingFarm, setEditingFarm] = useState<any>(null);
  const [editData, setEditData] = useState({ farm_name: '', crop_name: '', soil_type: '', area_vigha: '' });

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }
    if (user.role === 'FARMER') {
      fetchFarms();
    } else {
      setLoading(false);
    }
  }, [user]);

  const fetchFarms = async () => {
    setLoading(true);
    try {
      const data = await supabase.from('farms').eq('user_id', user!.id);
      if (data) setFarms(data);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this farm?")) return;
    try {
      // @ts-ignore
      await supabase.from('farms').eq('id', id).delete();
      alert("Farm deleted successfully!");
      fetchFarms();
    } catch (e) {
      alert("Failed to delete farm.");
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingFarm) return;
    
    try {
      // @ts-ignore
      await supabase.from('farms').eq('id', editingFarm.id).update({
        farm_name: editData.farm_name,
        crop_name: editData.crop_name,
        soil_type: editData.soil_type,
        area_vigha: parseFloat(editData.area_vigha)
      });
      alert("Farm updated successfully!");
      setEditingFarm(null);
      fetchFarms();
    } catch (e) {
      alert("Failed to update farm.");
    }
  };

  if (!user) return null;

  return (
    <div className="p-4 sm:p-8 max-w-4xl mx-auto pb-24">
      <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100 mb-8 flex flex-col md:flex-row items-center gap-6">
        <div className="w-24 h-24 bg-green-100 text-green-700 rounded-full flex items-center justify-center text-4xl font-bold">
          {user.name.charAt(0).toUpperCase()}
        </div>
        <div className="text-center md:text-left">
          <h1 className="text-3xl font-bold text-gray-900">{user.name}</h1>
          <p className="text-gray-500 text-lg flex items-center justify-center md:justify-start gap-2 mt-2">
            <User size={18} /> +91 {user.phone}
          </p>
          <p className="text-blue-600 font-bold bg-blue-50 inline-block px-3 py-1 rounded-full text-sm mt-2">
            {user.role} {user.location && `• ${user.location}`}
          </p>
        </div>
        <button onClick={() => { logout(); router.push('/login'); }} className="ml-auto mt-4 md:mt-0 bg-red-50 text-red-600 px-6 py-2 rounded-xl font-bold hover:bg-red-100 transition">
          Logout
        </button>
      </div>

      {user.role === 'FARMER' && (
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">તમારા ખેતર (My Farms)</h2>
      </div>
      )}

      {loading ? (
        <div className="flex justify-center p-12">
          <Loader2 className="animate-spin text-green-500 w-8 h-8" />
        </div>
      ) : user.role !== 'FARMER' ? (
        <div className="bg-white p-8 rounded-2xl text-center text-gray-500 shadow-sm border border-gray-100">
          <h3 className="text-xl font-bold text-gray-800 mb-2">Welcome to {user.role} Profile</h3>
          <p>You have special access rights. Return to your dashboard to manage system operations.</p>
        </div>
      ) : farms.length === 0 ? (
        <div className="bg-gray-50 p-8 rounded-2xl text-center text-gray-500">
          કોઈ ખેતર ઉમેરેલું નથી.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {farms.map(farm => (
            <div key={farm.id} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
              <h3 className="text-xl font-bold text-gray-900 mb-2">{farm.farm_name}</h3>
              <p className="text-gray-600 mb-1"><strong>પાક:</strong> {farm.crop_name}</p>
              <p className="text-gray-600 mb-1"><strong>માટી:</strong> {farm.soil_type}</p>
              <p className="text-gray-600 mb-4"><strong>વિસ્તાર:</strong> {farm.area_vigha} વીઘા</p>
              
              <div className="flex gap-2">
                <button 
                  onClick={() => {
                    setEditingFarm(farm);
                    setEditData({ farm_name: farm.farm_name, crop_name: farm.crop_name, soil_type: farm.soil_type, area_vigha: farm.area_vigha.toString() });
                  }}
                  className="flex-1 bg-blue-50 text-blue-600 py-2 rounded-xl flex justify-center items-center gap-2 font-bold hover:bg-blue-100 transition"
                >
                  <Edit3 size={18} /> સુધારો
                </button>
                <button 
                  onClick={() => handleDelete(farm.id)}
                  className="flex-1 bg-red-50 text-red-600 py-2 rounded-xl flex justify-center items-center gap-2 font-bold hover:bg-red-100 transition"
                >
                  <Trash2 size={18} /> કાઢી નાખો
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit Modal */}
      {editingFarm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">ખેતરની માહિતી સુધારો</h2>
            <form onSubmit={handleUpdate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ખેતરનું નામ</label>
                <input required type="text" value={editData.farm_name} onChange={e => setEditData({...editData, farm_name: e.target.value})} className="w-full border border-gray-300 rounded-xl p-3 outline-none focus:ring-2 focus:ring-green-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">કયો પાક છે?</label>
                <input required type="text" value={editData.crop_name} onChange={e => setEditData({...editData, crop_name: e.target.value})} className="w-full border border-gray-300 rounded-xl p-3 outline-none focus:ring-2 focus:ring-green-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">જમીનનો પ્રકાર</label>
                <input required type="text" value={editData.soil_type} onChange={e => setEditData({...editData, soil_type: e.target.value})} className="w-full border border-gray-300 rounded-xl p-3 outline-none focus:ring-2 focus:ring-green-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">વિસ્તાર (વીઘામાં)</label>
                <input required type="number" step="0.1" value={editData.area_vigha} onChange={e => setEditData({...editData, area_vigha: e.target.value})} className="w-full border border-gray-300 rounded-xl p-3 outline-none focus:ring-2 focus:ring-green-500" />
              </div>
              
              <div className="flex gap-2 mt-6">
                <button type="button" onClick={() => setEditingFarm(null)} className="w-1/2 bg-gray-100 text-gray-700 py-3 rounded-xl font-bold hover:bg-gray-200">રદ કરો (Cancel)</button>
                <button type="submit" className="w-1/2 bg-green-600 text-white py-3 rounded-xl font-bold hover:bg-green-700">સાચવો (Save)</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
