import { useEffect, useState } from "react";
import { Bell, Turtle, Layers, Heart, Database } from "lucide-react";

import TankVideoCard from "../../shared/components/ui/TankVideoCard";
import UploadAnalyzer from "../../shared/components/ui/UploadAnalyzer";
import StatSummaryCard from "../../shared/components/ui/StatSummaryCard";

export default function HatcheryPage() {
  const [alerts, setAlerts] = useState([]);

  const [showAllAlerts, setShowAllAlerts] = useState(false);

  const ALERT_PREVIEW_COUNT = 6;

  const tanks = [
    { id: "tankA", label: "Tank Alpha" },
    { id: "tankB", label: "Tank Beta" },
    { id: "tankC", label: "Tank Gamma" },
    { id: "tankD", label: "Tank Delta" },
  ];

  useEffect(() => {
    const fetchTodayAlerts = () => {
      fetch("http://localhost:5002/api/hatchery/alerts")
        .then((res) => res.json())
        .then((data) => {
          const today = new Date().toDateString();
          setAlerts(
            data.filter((a) => new Date(a.createdAt).toDateString() === today),
          );
        })
        .catch(() => setAlerts([]));
    };

    fetchTodayAlerts();
    const interval = setInterval(fetchTodayAlerts, 5000);
    return () => clearInterval(interval);
  }, []);

  const visibleAlerts = showAllAlerts
    ? alerts
    : alerts.slice(0, ALERT_PREVIEW_COUNT);

  return (
    <div className="flex flex-col gap-6">
      {/* HEADER */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Hatchery Management
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1 text-md">
            Automated monitoring of hatchling vitality and development
          </p>
        </div>

        <div className="bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300 px-4 py-2 rounded-xl font-bold text-xs flex items-center shadow-sm">
          <span className="inline-block h-2 w-2 bg-teal-500 rounded-full mr-2 animate-pulse" />
          RECIRCULATION OPERATIONAL
        </div>
      </div>

      {/* STATS */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatSummaryCard icon={Turtle} value="40" label="Total Hatchlings" />
        <StatSummaryCard icon={Layers} value="2" label="Species Diversity" />
        <StatSummaryCard icon={Heart} value="92%" label="Vitality Avg" />
        <StatSummaryCard icon={Database} value="4" label="Active Units" />
      </section>

      {/* VIDEOS */}
      <section className="bg-white dark:bg-slate-900 rounded-2xl border dark:border-slate-800 shadow-xl overflow-hidden">
        <div className="px-6 py-4 border-b bg-gray-50 dark:bg-slate-800/40">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            Live Surveillance Detections
          </h2>
        </div>

        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          {tanks.map((tank) => (
            <TankVideoCard
              key={tank.id}
              tankId={tank.id}
              tankLabel={tank.label}
            />
          ))}
        </div>
      </section>

      {/* ANALYZER */}
      <section className="bg-white dark:bg-slate-900 rounded-2xl border dark:border-slate-800 shadow-xl p-6">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
          Historical Behavior Analysis
        </h3>
        <UploadAnalyzer />
      </section>

      {/* ALERTS */}
      <section className="bg-white dark:bg-slate-900 rounded-2xl border dark:border-slate-800 shadow-xl flex flex-col">
        <div className="px-6 py-4 border-b bg-gray-50 dark:bg-slate-800/40 flex justify-between">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">
            Anomaly Log
          </h3>
          <span className="text-gray-500 dark:text-gray-400 font-semibold">
            Today
          </span>
        </div>

        <div className="p-6 overflow-y-auto max-h-[500px] custom-scrollbar">
          {alerts.length === 0 ? (
            <div className="h-[300px] flex flex-col items-center justify-center border-2 border-dashed rounded-xl text-gray-400 dark:text-gray-500">
              <Bell className="w-8 h-8 mb-3" />
              <p className="text-lg">Alerts</p>
            </div>
          ) : (
            <>
              <div className="flex flex-col gap-4">
                {visibleAlerts.map((alert) => (
                  <div
                    key={alert._id}
                    className="p-4 bg-gray-50 dark:bg-slate-800 border-l-4 border-red-500 rounded-xl"
                  >
                    <div className="flex justify-between mb-1">
                      <span className="text-sm font-bold text-gray-700 dark:text-gray-300">
                        {alert.tank} Unit
                      </span>
                      <span className="text-sm font-bold text-gray-700 dark:text-gray-300">
                        {alert.status}
                      </span>
                    </div>
                    <p className="text-md font-semibold text-gray-900 dark:text-white">
                      {alert.message}
                    </p>
                  </div>
                ))}
              </div>

              {/* SEE MORE BUTTON */}
              {alerts.length > ALERT_PREVIEW_COUNT && (
                <div className="mt-6 flex justify-center">
                  <button
                    onClick={() => setShowAllAlerts((prev) => !prev)}
                    className="px-4 py-2 text-sm font-semibold rounded-lg bg-teal-100 text-teal-700 hover:bg-teal-200 dark:bg-teal-900/40 dark:text-teal-300 dark:hover:bg-teal-900 transition"
                  >
                    {showAllAlerts ? "See less" : "See more"}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </section>
    </div>
  );
}
