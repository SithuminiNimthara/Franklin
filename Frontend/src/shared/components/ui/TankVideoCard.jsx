import { useState, useEffect } from "react";
import { Activity, Heart, Eye, Wifi, ShieldCheck, AlertCircle } from "lucide-react";

export default function TankVideoCard({ tankId, tankLabel }) {
  const [data, setData] = useState({
    status: "Connecting...",
    health: "Unknown",
    species: "Detecting...",
  });

  // Fetch data every 1 second
  useEffect(() => {
    const i = setInterval(() => {
      fetch(`http://localhost:5001/data/${tankId}`)
        .then((r) => r.json())
        .then(setData)
        .catch(() => setData({ status: "Offline", health: "--", species: "--" }));
    }, 1000);
    return () => clearInterval(i);
  }, [tankId]);

  // Dynamic Styles based on Health
  const getHealthStyles = (health) => {
    if (health === "Healthy") return { 
      bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200", icon: ShieldCheck 
    };
    if (health === "Critical") return { 
      bg: "bg-red-50", text: "text-red-700", border: "border-red-200", icon: AlertCircle 
    };
    return { 
      bg: "bg-gray-50", text: "text-gray-700", border: "border-gray-200", icon: Activity 
    };
  };

  const style = getHealthStyles(data.health);
  const HealthIcon = style.icon;

  return (
    <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-100 flex flex-col lg:flex-row h-full min-h-[450px]">
      
      {/* LEFT: Cinematic Video Area */}
      <div className="relative w-full lg:w-3/5 bg-gray-900 flex items-center justify-center group">
        <img
          src={`http://localhost:5001/stream/${tankId}`}
          className="w-full h-full object-contain"
          alt="Live Stream"
        />
        
        {/* "LIVE" Pulsing Badge */}
        <div className="absolute top-5 left-5 flex items-center gap-2 bg-black/50 backdrop-blur-md px-3 py-1.5 rounded-full z-10 border border-white/10">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
          </span>
          <span className="text-white text-xs font-bold tracking-widest">LIVE FEED</span>
        </div>

        {/* Connection Status Overlay */}
        <div className="absolute bottom-5 right-5 flex items-center gap-1.5 text-xs text-white/70 bg-black/40 px-3 py-1 rounded-lg backdrop-blur-sm">
           <Wifi className="w-3 h-3 text-green-400" />
           <span>Signal Stable</span>
        </div>
      </div>

      {/* RIGHT: Modern Stats Panel */}
      <div className="w-full lg:w-2/5 p-8 flex flex-col justify-center bg-white relative">
        
        {/* Header */}
        <div className="mb-8 border-b border-gray-100 pb-6">
          <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">{tankLabel}</h2>
          <p className="text-gray-500 text-sm mt-1">Real-time AI behavioral analysis</p>
        </div>

        {/* Stats Grid */}
        <div className="space-y-5">
          
          {/* 1. Species Card */}
          <div className="flex items-center p-4 rounded-2xl bg-slate-50 border border-slate-100 transition-all hover:shadow-md">
            <div className="p-3 bg-white rounded-xl shadow-sm mr-4">
              <Eye className="w-6 h-6 text-indigo-600" />
            </div>
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Detected Species</p>
              <p className="text-lg font-bold text-gray-800">{data.species}</p>
            </div>
          </div>

          {/* 2. Behavior Card */}
          <div className="flex items-center p-4 rounded-2xl bg-slate-50 border border-slate-100 transition-all hover:shadow-md">
            <div className="p-3 bg-white rounded-xl shadow-sm mr-4">
              <Activity className="w-6 h-6 text-orange-500" />
            </div>
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Current Behavior</p>
              <p className="text-lg font-bold text-gray-800">{data.status}</p>
            </div>
          </div>

          {/* 3. Health Status (Dynamic Color) */}
          <div className={`flex items-center p-5 rounded-2xl border-2 ${style.bg} ${style.border} transition-all`}>
            <div className={`p-3 bg-white rounded-xl shadow-sm mr-4`}>
              <HealthIcon className={`w-6 h-6 ${style.text}`} />
            </div>
            <div>
              <p className={`text-xs font-bold uppercase tracking-wider ${style.text} opacity-80`}>Health Status</p>
              <p className={`text-xl font-extrabold ${style.text}`}>{data.health}</p>
            </div>
          </div>

        </div>

        {/* Decorative ID at bottom */}
        <div className="absolute bottom-4 right-6 text-[10px] text-gray-300 font-mono">
           ID: {tankId.toUpperCase()}_CAM_01
        </div>
      </div>
    </div>
  );
}