import { useState, useEffect } from "react";
import { Activity, Eye, Wifi, ShieldCheck, AlertCircle } from "lucide-react";

export default function TankVideoCard({ tankId, tankLabel }) {
  const [data, setData] = useState({
    status: "Connecting...",
    health: "Unknown",
    species: "Detecting..."
  });

  useEffect(() => {
    const interval = setInterval(() => {
      fetch(`http://localhost:5001/data/${tankId}`)
        .then(res => res.json())
        .then(setData)
        .catch(() =>
          setData({ status: "Offline", health: "Unknown", species: "Unknown" })
        );
    }, 1000);

    return () => clearInterval(interval);
  }, [tankId]);

  const HealthIcon =
    data.health === "Critical" ? AlertCircle : ShieldCheck;

  const healthColor =
    data.health === "Critical" ? "text-red-600" : "text-emerald-600";

  return (
    <div className="bg-white rounded-3xl shadow-xl overflow-hidden border flex flex-col lg:flex-row min-h-[450px]">

      {/* VIDEO */}
      <div className="relative w-full lg:w-3/5 bg-black">
        <img
          src={`http://localhost:5001/stream/${tankId}`}
          className="w-full h-full object-contain"
          alt="Live Stream"
        />

        <div className="absolute top-4 left-4 bg-black/60 text-white px-3 py-1 rounded-full text-xs flex items-center gap-2">
          <span className="h-2 w-2 bg-red-500 rounded-full animate-ping" />
          LIVE
        </div>

        <div className="absolute bottom-4 right-4 text-white text-xs bg-black/60 px-3 py-1 rounded-full flex items-center gap-1">
          <Wifi className="w-3 h-3 text-green-400" />
          Signal Stable
        </div>
      </div>

      {/* STATS */}
      <div className="w-full lg:w-2/5 p-8 space-y-6">
        <h2 className="text-2xl font-bold">{tankLabel}</h2>

        <div className="p-4 border rounded-xl flex items-center gap-4">
          <Eye className="w-6 h-6 text-green-600" />
          <div>
            <p className="text-xs text-gray-500">Detected Species</p>
            <p className="font-bold">{data.species}</p>
          </div>
        </div>

        <div className="p-4 border rounded-xl flex items-center gap-4">
          <Activity className="w-6 h-6 text-orange-500" />
          <div>
            <p className="text-xs text-gray-500">Behavior</p>
            <p className="font-bold">{data.status}</p>
          </div>
        </div>

        <div className={`p-4 border rounded-xl flex items-center gap-4 ${healthColor}`}>
          <HealthIcon className="w-6 h-6" />
          <div>
            <p className="text-xs">Health Status</p>
            <p className="font-bold">{data.health}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
