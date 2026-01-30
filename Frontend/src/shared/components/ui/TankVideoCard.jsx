import { useState, useEffect } from "react";
import { AlertCircle, ShieldCheck, Maximize2, X } from "lucide-react";

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
          setData({
            status: "Offline",
            health: "Unknown",
            species: "Unknown",
          })
        );
    }, 1000);
    return () => clearInterval(interval);
  }, [tankId]);

  const HealthIcon =
    data.health === "Critical" ? AlertCircle : ShieldCheck;

  return (
    <>
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-lg border dark:border-slate-800 overflow-hidden flex flex-col sm:flex-row h-auto sm:h-52">
        <div
          className="relative w-full sm:w-1/2 bg-black cursor-pointer"
          onClick={() => setIsZoomed(true)}
        >
          <img
            src={`http://localhost:5001/stream/${tankId}`}
            className="w-full h-full object-cover"
            alt="Live Stream"
          />
        </div>

        <div className="flex-1 p-4 flex flex-col justify-between">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {tankLabel}
          </h2>

          <div className="space-y-2 my-3">
            <div className="flex justify-between">
              <span className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase">
                Species
              </span>
              <span className="text-sm font-black text-gray-900 dark:text-white">
                {data.species}
              </span>
            </div>

            <div className="flex justify-between">
              <span className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase">
                Behavior
              </span>
              <span className="text-sm font-black text-gray-800 dark:text-white">
                {data.status}
              </span>
            </div>
          </div>

          <div className="px-3 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border">
            <HealthIcon className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            <span className="text-xs font-black tracking-widest text-emerald-700 dark:text-emerald-300">
              Condition: {data.health}
            </span>
          </div>
        </div>
      </div>

      {isZoomed && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 p-4"
          onClick={() => setIsZoomed(false)}
        >
          <button className="absolute top-6 right-6 text-white">
            <X />
          </button>
          <img
            src={`http://localhost:5001/stream/${tankId}`}
            className="max-w-5xl w-full object-contain"
            alt="Fullscreen"
          />
        </div>
      )}
    </>
  );
}
