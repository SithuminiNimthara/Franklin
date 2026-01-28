import { useState, useEffect } from "react";
import { Activity, Eye, Wifi, ShieldCheck, AlertCircle, Maximize2, X } from "lucide-react";

export default function TankVideoCard({ tankId, tankLabel }) {
  const [isZoomed, setIsZoomed] = useState(false);
  const [data, setData] = useState({ status: "Connecting...", health: "Unknown", species: "Detecting..." });

  useEffect(() => {
    const interval = setInterval(() => {
      fetch(`http://localhost:5001/data/${tankId}`)
        .then((res) => res.json())
        .then(setData)
        .catch(() => setData({ status: "Offline", health: "Unknown", species: "Unknown" }));
    }, 1000);
    return () => clearInterval(interval);
  }, [tankId]);

  const HealthIcon = data.health === "Critical" ? AlertCircle : ShieldCheck;
  const healthColor = data.health === "Critical" ? "text-red-500" : "text-emerald-500";
  const healthBg = data.health === "Critical" ? "bg-red-50 dark:bg-red-900/10" : "bg-emerald-50 dark:bg-emerald-900/10";

  return (
    <>
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-lg border border-gray-100 dark:border-slate-800 overflow-hidden flex flex-col sm:flex-row h-auto sm:h-52 hover:shadow-xl transition-all group">
        <div className="relative w-full sm:w-1/2 bg-black flex-shrink-0 cursor-pointer overflow-hidden" onClick={() => setIsZoomed(true)}>
          <img src={`http://localhost:5001/stream/${tankId}`} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" alt="Live Stream" />
          <div className="absolute top-3 left-3 bg-black/40 backdrop-blur-md text-white px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest flex items-center gap-2">
            <span className="h-1.5 w-1.5 bg-red-500 rounded-full animate-ping" />{tankId}
          </div>
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <Maximize2 className="text-white w-6 h-6" />
          </div>
        </div>

        <div className="flex-1 p-4 flex flex-col justify-between">
          <div>
            <h2 className="text-lg font-black text-gray-900 dark:text-white uppercase leading-tight">{tankLabel}</h2>
            <p className="text-[10px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-tighter mt-1">Surveillance Unit 0.4.1</p>
          </div>

          <div className="space-y-2 my-3">
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-black text-gray-400 dark:text-gray-500 uppercase">Species</span>
              <span className="text-[10px] font-black text-gray-800 dark:text-gray-200">{data.species}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-black text-gray-400 dark:text-gray-500 uppercase">Behavior</span>
              <span className="text-[10px] font-black text-gray-800 dark:text-gray-200">{data.status}</span>
            </div>
          </div>

          <div className={`px-3 py-2 rounded-xl flex items-center gap-2 ${healthBg} border border-white/10`}>
            <HealthIcon className={`w-3.5 h-3.5 ${healthColor}`} />
            <span className={`text-[9px] font-black uppercase tracking-widest ${healthColor}`}>Condition: {data.health}</span>
          </div>
        </div>
      </div>

      {isZoomed && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-xl animate-fadeIn p-4 overflow-hidden" onClick={() => setIsZoomed(false)}>
          <button className="absolute top-6 right-6 p-4 bg-white/5 hover:bg-white/10 rounded-full text-white transition-all shadow-2xl"><X className="w-6 h-6" /></button>
          <div className="w-full max-w-5xl rounded-3xl overflow-hidden shadow-[0_0_100px_rgba(0,0,0,0.5)] border border-white/10 relative" onClick={(e) => e.stopPropagation()}>
            <img src={`http://localhost:5001/stream/${tankId}`} className="w-full h-full object-contain bg-black" alt="Fullscreen View" />
            <div className="absolute bottom-10 left-10 p-6 bg-black/40 backdrop-blur-md rounded-2xl border border-white/10 text-white animate-slideUp">
              <h2 className="text-3xl font-black uppercase mb-2">{tankLabel}</h2>
              <div className="flex items-center space-x-4 opacity-90">
                <span className="text-xs font-black bg-white/20 px-3 py-1 rounded-full">{data.species}</span>
                <span className="text-xs font-black bg-cyan-500/30 text-cyan-400 px-3 py-1 rounded-full font-serif italic uppercase">{data.status}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
