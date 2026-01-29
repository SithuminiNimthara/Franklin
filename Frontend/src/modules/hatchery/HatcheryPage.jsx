import { useEffect, useState } from "react";
import { Bell, History, AlertTriangle, Turtle, Layers, Heart, Database } from "lucide-react";
import TankVideoCard from "../../shared/components/ui/TankVideoCard";
import UploadAnalyzer from "../../shared/components/ui/UploadAnalyzer";
import StatSummaryCard from "../../shared/components/ui/StatSummaryCard";

export default function HatcheryPage() {
  const [alerts, setAlerts] = useState([]);

  const tanks = [
    { id: "tankA", label: "Tank Alpha" },
    { id: "tankB", label: "Tank Beta" },
    { id: "tankC", label: "Tank Gamma" },
    { id: "tankD", label: "Tank Delta" },
  ];

  useEffect(() => {
    const fetchTodayAlerts = () => {
      fetch("http://localhost:5002/api/hatchery/alerts")
        .then((res) => { if (!res.ok) throw new Error(`HTTP ${res.status}`); return res.json(); })
        .then((data) => {
          const today = new Date().toDateString();
          setAlerts(data.filter((a) => new Date(a.createdAt).toDateString() === today));
        })
        .catch((err) => { console.error("Error fetching alerts:", err); setAlerts([]); });
    };
    fetchTodayAlerts();
    const interval = setInterval(fetchTodayAlerts, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold dark:text-white">Hatchery Management</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1 text-sm italic">Automated monitoring of hatchling vitality and development</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-teal-50 dark:bg-teal-900/10 text-teal-700 dark:text-teal-400 px-4 py-2 rounded-xl font-bold text-xs border border-teal-100 dark:border-teal-900/20 flex items-center shadow-sm">
            <span className="inline-block h-2 w-2 bg-teal-500 rounded-full mr-2 animate-pulse"></span>
            RECIRCULATION OPERATIONAL
          </div>
        </div>
      </div>

      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatSummaryCard icon={Turtle} value="40" label="Total Hatchlings" subtext="Across all sectors" colorTheme="cyan" />
        <StatSummaryCard icon={Layers} value="2" label="Species Divers" subtext="Green & Olive Ridley" colorTheme="teal" />
        <StatSummaryCard icon={Heart} value="92%" label="Vitality Avg" subtext="Optimal conditions" colorTheme="amber" />
        <StatSummaryCard icon={Database} value="4" label="Active Units" subtext="Monitoring live" colorTheme="purple" />
      </section>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 space-y-6">
          <section className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-xl overflow-hidden transition-all">
            <div className="px-6 py-4 border-b border-gray-50 dark:border-slate-800 bg-gray-50/30 dark:bg-slate-800/20">
              <h2 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-widest">Live Surveillance Detections</h2>
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              {tanks.map((tank) => (
                <div key={tank.id} className="rounded-xl overflow-hidden border border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-900 shadow-sm hover:shadow-lg transition-all border-none">
                  <TankVideoCard tankId={tank.id} tankLabel={tank.label} />
                </div>
              ))}
            </div>
          </section>

          <section className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-3xl p-1 shadow-2xl">
            <div className="bg-white dark:bg-slate-900 rounded-[calc(1.5rem-1px)] p-6">
              <h3 className="text-sm font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest mb-4 flex items-center">
                <Database className="h-4 w-4 mr-2" />
                Historical Behavior Analysis
              </h3>
              <UploadAnalyzer />
            </div>
          </section>
        </div>

        <section className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-xl flex flex-col transition-all h-fit">
          <div className="px-6 py-4 border-b border-gray-50 dark:border-slate-800 flex items-center justify-between bg-gray-50/30 dark:bg-slate-800/20">
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-gray-400 dark:text-gray-500" />
              <h3 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-widest">Anomaly log</h3>
            </div>
            <span className="text-[10px] font-bold text-gray-400 uppercase">Today</span>
          </div>

          <div className="p-6 overflow-y-auto max-h-[700px] custom-scrollbar">
            {alerts.length === 0 ? (
              <div className="py-20 flex flex-col items-center justify-center border-2 border-dashed border-gray-100 dark:border-slate-800 rounded-xl text-gray-400 dark:text-gray-600">
                <Bell className="w-8 h-8 mb-3 opacity-20" />
                <p className="text-[10px] font-bold uppercase tracking-widest">Quiet Period Detected</p>
              </div>
            ) : (
              <div className="space-y-3">
                {alerts.map((alert) => (
                  <div key={alert._id} className="p-4 bg-gray-50 dark:bg-slate-800/50 border-l-4 border-red-500 rounded-xl shadow-sm hover:translate-x-1 transition-transform">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
                        <span className="text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase">{alert.tank} Unit</span>
                      </div>
                      <span className={`text-[8px] px-2 py-0.5 rounded-full font-black uppercase tracking-tighter ${alert.status === "pending" ? "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400" : "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"}`}>
                        {alert.status}
                      </span>
                    </div>
                    <p className="text-xs font-bold text-gray-900 dark:text-white leading-tight">{alert.message}</p>
                    <p className="text-[8px] text-gray-400 dark:text-gray-500 mt-2 font-bold uppercase tracking-widest">Timestamp: {new Date(alert.createdAt).toLocaleTimeString()}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>

      <style dangerouslySetInnerHTML={{
        __html: `
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
        .dark .custom-scrollbar::-webkit-scrollbar-thumb { background: #334155; }
      `}} />
    </div>
  );
}
