import { useState, useEffect } from "react";
import {
  Activity,
  Eye,
  Wifi,
  ShieldCheck,
  AlertCircle,
  Maximize2,
  X,
} from "lucide-react";

export default function TankVideoCard({ tankId, tankLabel }) {
  const [isZoomed, setIsZoomed] = useState(false);
  const [data, setData] = useState({
    status: "Connecting...",
    health: "Unknown",
    species: "Detecting...",
  });

  useEffect(() => {
    const interval = setInterval(() => {
      fetch(`http://localhost:5001/data/${tankId}`)
        .then((res) => res.json())
        .then(setData)
        .catch(() =>
          setData({ status: "Offline", health: "Unknown", species: "Unknown" }),
        );
    }, 1000);
    return () => clearInterval(interval);
  }, [tankId]);

  const HealthIcon = data.health === "Critical" ? AlertCircle : ShieldCheck;
  const healthColor =
    data.health === "Critical" ? "text-red-600" : "text-emerald-600";
  const healthBg = data.health === "Critical" ? "bg-red-50" : "bg-emerald-50";

  return (
    <>
      {/* 1. THE MAIN CARD */}
      <div className="max-w-4xl bg-white rounded-3xl shadow-md border border-gray-100 overflow-hidden flex flex-col sm:flex-row h-auto sm:h-64 transition-all hover:shadow-lg">
        {/* VIDEO SECTION */}
        <div
          className="relative w-full sm:w-3/5 bg-black flex-shrink-0 group cursor-pointer"
          onClick={() => setIsZoomed(true)}
        >
          <img
            src={`http://localhost:5001/stream/${tankId}`}
            className="w-full h-full object-cover"
            alt="Live Stream"
          />

          <div className="absolute top-4 left-4 bg-black/40 backdrop-blur-md text-white px-3 py-1 rounded-full text-xs font-bold flex items-center gap-2">
            <span className="h-2 w-2 bg-red-500 rounded-full animate-ping" />
            {tankId}
          </div>

          
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <div className="bg-white/20 p-3 rounded-full backdrop-blur-md border border-white/30">
              <Maximize2 className="text-white w-8 h-8" />
            </div>
          </div>
        </div>

        {/* STATS SECTION */}
        <div className="flex-1 p-6 flex flex-col justify-between bg-white">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-xl font-bold text-gray-900">{tankLabel}</h2>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <div className="flex flex-cols items-center gap-2">
              <p className="text-sm text-gray-500 font-bold uppercase">
                Species :
              </p>
              <p className="text-sm font-bold text-gray-800">{data.species}</p>
            </div>
            <div className="flex flex-cols items-center gap-2">
              <p className="text-sm text-gray-500 font-bold uppercase">
                Behavior
              </p>
              <p className="text-sm font-bold text-gray-800">{data.status}</p>
            </div>
          </div>

          <div
            className={`mt-2 px-4 py-3 rounded-2xl flex items-center gap-3 ${healthBg}`}
          >
            <HealthIcon className={`w-5 h-5 ${healthColor}`} />
            <span
              className={`text-xs font-black uppercase tracking-wide ${healthColor}`}
            >
              Health: {data.health}
            </span>
          </div>
        </div>
      </div>

      {/* 2. THE ZOOMED MODAL (Only shows when isZoomed is true) */}
      {isZoomed && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 p-4 md:p-10">
          <button
            onClick={() => setIsZoomed(false)}
            className="absolute top-6 right-6 p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
          >
            <X className="w-8 h-8" />
          </button>

          <div className="w-full max-w-6xl aspect-video rounded-2xl overflow-hidden shadow-2xl border border-white/10">
            <img
              src={`http://localhost:5001/stream/${tankId}`}
              className="w-full h-full object-contain"
              alt="Live Stream Large"
            />
            <div className="absolute bottom-10 left-10 text-white">
              <h2 className="text-3xl font-bold">{tankLabel}</h2>
              <p className="text-emerald-400 font-bold flex items-center gap-2">
                <span className="h-3 w-3 bg-red-600 rounded-full animate-pulse" />
                {tankId} - {data.species} & {data.status}
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
