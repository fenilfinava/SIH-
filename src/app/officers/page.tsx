
"use client";
import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Users, MapPin, CheckCircle, Clock } from "lucide-react";

export default function OfficersDataPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [officers, setOfficers] = useState<any[]>([]);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);

  useEffect(() => {
    if (!isLoading && (!user || user.role !== "ADMIN")) {
      router.push("/");
    }
  }, [user, isLoading, router]);

  useEffect(() => {
    async function fetchData() {
      try {
        const users = await supabase.from("users").select("*");
        const rpts = await supabase.from("disease_reports").select("*");
        
        setAllUsers(users || []);
        setReports(rpts || []);
        
        // Include DB officers
        let dbOfficers = (users || []).filter((u: any) => u.role === "OFFICER");
        
        // Add the standard demo officer
        const demoOfficer = { id: "officer-demo-001", name: "Field Officer (Demo)", phone: "8888888888", role: "OFFICER", location: "Rajkot, Gujarat" };
        
        // Check if demo officer is already in DB, if not, prepend it
        if (!dbOfficers.find((o: any) => o.phone === demoOfficer.phone)) {
           dbOfficers = [demoOfficer, ...dbOfficers];
        }
        
        setOfficers(dbOfficers);
      } catch(e) {}
    }
    fetchData();
  }, []);

  if (isLoading || !user) return null;

  return (
    <div className="min-h-screen bg-gray-50 pb-20 p-4 sm:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Officers Data Center</h1>
            <p className="text-gray-500 mt-1">Manage and monitor all active Extension Officers.</p>
          </div>
          <div className="bg-blue-100 text-blue-800 px-4 py-2 rounded-xl font-bold">
            Total Active Officers: {officers.length}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {officers.map((o: any, i) => {
            const farmersInLoc = allUsers.filter(u => u.role === "FARMER" && (u.location || "").toLowerCase() === (o.location || "").toLowerCase()).length;
            const repsInLoc = reports.filter(r => (r.location_name || "").toLowerCase() === (o.location || "").toLowerCase());
            const solvedInLoc = repsInLoc.filter(r => r.status === "validated").length;
            const pendingInLoc = repsInLoc.filter(r => r.status === "pending").length;

            return (
              <div key={i} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col hover:shadow-md transition">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                      <Users size={20} className="text-blue-500" /> {o.name}
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">📞 {o.phone}</p>
                  </div>
                  <span className="bg-blue-50 text-blue-700 text-xs font-bold px-3 py-1 rounded-full border border-blue-100 flex items-center gap-1">
                    <MapPin size={12} /> {o.location}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4 my-4">
                  <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                    <p className="text-xs text-gray-500 font-bold uppercase mb-1">Farmers Assigned</p>
                    <p className="text-2xl font-black text-gray-800">{farmersInLoc}</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                    <p className="text-xs text-gray-500 font-bold uppercase mb-1">Total Queries</p>
                    <p className="text-2xl font-black text-gray-800">{repsInLoc.length}</p>
                  </div>
                </div>

                <div className="flex gap-2 mb-4">
                  <div className="flex-1 flex items-center justify-center gap-1 bg-green-50 text-green-700 py-2 rounded-lg font-bold text-sm">
                    <CheckCircle size={16} /> {solvedInLoc} Solved
                  </div>
                  <div className="flex-1 flex items-center justify-center gap-1 bg-orange-50 text-orange-700 py-2 rounded-lg font-bold text-sm">
                    <Clock size={16} /> {pendingInLoc} Pending
                  </div>
                </div>

                <button 
                  onClick={async () => {
                    const msg = prompt("Send emergency directive to " + o.name + " & Farmers in " + o.location + ":");
                    if (msg) {
                      try {
                        await supabase.from("bulletins").insert({ officer_id: user.id, region: o.location, message: msg });
                        alert("Message pushed successfully to " + o.location);
                      } catch(e) { alert("Failed to send message"); }
                    }
                  }}
                  className="mt-auto w-full font-bold bg-blue-600 text-white py-3 rounded-xl hover:bg-blue-700 transition flex justify-center items-center gap-2"
                >
                  ✉️ Push Direct Message
                </button>
              </div>
            );
          })}
          {officers.length === 0 && (
            <div className="col-span-full p-12 text-center text-gray-400 font-bold bg-white rounded-2xl shadow-sm border border-gray-100">
              No field officers recruited yet. Add them from the Command Center.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
