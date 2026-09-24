"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Users, Activity, Target, Download, LineChart } from "lucide-react";
import MapComponent from "@/components/MapComponent";

export default function OfficialDashboard() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState({ totalFarmers: 0, scansToday: 0, accuracy: 0, coverage: 0 });
  const [officers, setOfficers] = useState<any[]>([]);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);

  useEffect(() => {
    if (!isLoading && (!user || user.role !== 'ADMIN')) {
      router.push('/');
    }
  }, [user, isLoading, router]);

  useEffect(() => {
    const handleExport = () => exportCSV();
    window.addEventListener('export-csv', handleExport);
    return () => window.removeEventListener('export-csv', handleExport);
  }, [reports]);

  useEffect(() => {
    async function fetchData() {
      try {
        const users = await supabase.from('users').select('*');
        const rpts = await supabase.from('disease_reports').select('*');
        
        const farmers = users.filter((u: any) => u.role === 'FARMER');
        const offics = users.filter((u: any) => u.role === 'OFFICER');
        
        let correct = rpts.filter((r: any) => r.status === 'validated').length;
        let total = rpts.filter((r: any) => r.status === 'validated' || r.status === 'rejected').length;
        let acc = total > 0 ? Math.round((correct / total) * 100) : 85;

        setStats({
          totalFarmers: farmers.length,
          scansToday: rpts.length,
          accuracy: acc,
          coverage: Math.min(100, Math.round((farmers.length / 100) * 100)) // mock %
        });
        setOfficers(offics);
        setAllUsers(users);
        setReports(rpts);
      } catch(e) {}
    }
    fetchData();
  }, []);

  const exportCSV = () => {
    const csvContent = "data:text/csv;charset=utf-8," 
      + "ID,Farmer,Disease,Confidence,Status,Location,Date\n"
      + reports.map(r => `${r.id},${r.farmer_name},${r.ai_disease},${r.confidence_score},${r.status},${r.location_name},${r.created_at}`).join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "disease_outbreak_report.csv");
    document.body.appendChild(link);
    link.click();
  };

  if (isLoading || !user) return null;

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      


      <div className="max-w-7xl mx-auto px-4 mt-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
            <Users className="text-blue-600 mb-2" />
            <p className="text-gray-500 text-sm">Surveillance Coverage</p>
            <p className="text-2xl font-bold">{stats.coverage}%</p>
          </div>
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
            <Activity className="text-purple-600 mb-2" />
            <p className="text-gray-500 text-sm">Total Cases</p>
            <p className="text-2xl font-bold">{stats.scansToday}</p>
          </div>
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
            <Target className="text-green-600 mb-2" />
            <p className="text-gray-500 text-sm">Model Accuracy</p>
            <p className="text-2xl font-bold">{stats.accuracy}%</p>
          </div>
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-center">
            <label className="text-gray-500 text-xs font-bold uppercase mb-1">AI Threshold Control</label>
            <input type="range" min="50" max="95" defaultValue="80" className="w-full accent-blue-600" />
            <span className="text-xs text-center font-bold text-gray-700 mt-1">Flag if &lt; 80%</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-gray-800">Live Outbreak Map</h3>
              <div className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1"><LineChart size={12}/> Live Trends</div>
            </div>
            <div className="h-[400px]">
              <MapComponent />
            </div>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <h3 className="font-bold text-gray-800 mb-4 flex justify-between items-center"><span>Recruit New Field Officer</span><a href="/officers" className="text-sm text-blue-600 hover:underline">View All Officers →</a></h3>
            <form className="space-y-3" onSubmit={async (e:any) => {
              e.preventDefault();
              const name = e.target.name.value;
              const phone = e.target.phone.value;
              const state = e.target.state.value;
              const dist = e.target.district.value;
              const tal = e.target.taluka.value;
              const vil = e.target.village.value;
              const loc = [vil, tal, dist, state].filter(Boolean).join(', ');
              const pass = e.target.password.value;
              try {
                // Insert real officer into DB
                await supabase.from('users').insert({ 
                  name, 
                  phone, 
                  password: pass, 
                  role: 'OFFICER', 
                  location: loc 
                });
                
                // Fetch updated officers from DB to refresh UI instantly
                const users = await supabase.from('users').select('*');
                const offics = users.filter((u:any) => u.role === 'OFFICER');
                setOfficers(offics);

                e.target.reset();
                alert(`✅ Officer Created Successfully!\n\nPlease share these login details with the officer:\nID (Phone): ${phone}\nPassword: ${pass}`);
              } catch(err) {
                alert("Error creating officer. Phone number might already exist.");
              }
            }}>
              <input name="name" required placeholder="Officer Name" className="w-full p-2 bg-gray-50 rounded-lg border border-gray-200 text-sm" />
              <input name="phone" required placeholder="Phone Number (Login ID)" className="w-full p-2 bg-gray-50 rounded-lg border border-gray-200 text-sm" />
              <input name="password" required placeholder="Set Password" type="text" className="w-full p-2 bg-gray-50 rounded-lg border border-gray-200 text-sm" />
              <div className="flex gap-2">
                <select name="state" required className="w-1/2 p-2 bg-gray-50 rounded-lg border border-gray-200 text-sm">
                  <option value="">Select State...</option>
                  <option value="Andhra Pradesh">Andhra Pradesh</option>
<option value="Arunachal Pradesh">Arunachal Pradesh</option>
<option value="Assam">Assam</option>
<option value="Bihar">Bihar</option>
<option value="Chhattisgarh">Chhattisgarh</option>
<option value="Goa">Goa</option>
<option value="Gujarat">Gujarat</option>
<option value="Haryana">Haryana</option>
<option value="Himachal Pradesh">Himachal Pradesh</option>
<option value="Jharkhand">Jharkhand</option>
<option value="Karnataka">Karnataka</option>
<option value="Kerala">Kerala</option>
<option value="Madhya Pradesh">Madhya Pradesh</option>
<option value="Maharashtra">Maharashtra</option>
<option value="Manipur">Manipur</option>
<option value="Meghalaya">Meghalaya</option>
<option value="Mizoram">Mizoram</option>
<option value="Nagaland">Nagaland</option>
<option value="Odisha">Odisha</option>
<option value="Punjab">Punjab</option>
<option value="Rajasthan">Rajasthan</option>
<option value="Sikkim">Sikkim</option>
<option value="Tamil Nadu">Tamil Nadu</option>
<option value="Telangana">Telangana</option>
<option value="Tripura">Tripura</option>
<option value="Uttar Pradesh">Uttar Pradesh</option>
<option value="Uttarakhand">Uttarakhand</option>
<option value="West Bengal">West Bengal</option>
<option value="Andaman and Nicobar Islands">Andaman and Nicobar Islands</option>
<option value="Chandigarh">Chandigarh</option>
<option value="Dadra and Nagar Haveli and Daman and Diu">Dadra and Nagar Haveli and Daman and Diu</option>
<option value="Delhi">Delhi</option>
<option value="Jammu and Kashmir">Jammu and Kashmir</option>
<option value="Ladakh">Ladakh</option>
<option value="Lakshadweep">Lakshadweep</option>
<option value="Puducherry">Puducherry</option>
                </select>
                <input name="district" required placeholder="District *" className="w-1/2 p-2 bg-gray-50 rounded-lg border border-gray-200 text-sm" />
              </div>
              <div className="flex gap-2">
                <input name="taluka" placeholder="Taluka (Optional)" className="w-1/2 p-2 bg-gray-50 rounded-lg border border-gray-200 text-sm" />
                <input name="village" placeholder="Village (Optional)" className="w-1/2 p-2 bg-gray-50 rounded-lg border border-gray-200 text-sm" />
              </div>
              <button type="submit" className="w-full bg-blue-600 text-white font-bold p-2 rounded-lg hover:bg-blue-700 text-sm">Create & Assign Officer</button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
