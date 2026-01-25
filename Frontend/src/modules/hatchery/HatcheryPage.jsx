import { useEffect, useState } from "react";
import {
  Bell,
  History,
  AlertTriangle,
  Turtle,
  Layers,
  Heart,
  Database,
} from "lucide-react";
import TankVideoCard from "../../shared/components/ui/TankVideoCard";
import UploadAnalyzer from "../../shared/components/ui/UploadAnalyzer";
import StatSummaryCard from "../../shared/components/ui/StatSummaryCard";

export default function HatcheryPage() {
  const [alerts, setAlerts] = useState([]);

  const tanks = [
    { id: "tankA", label: "Tank A" },
    { id: "tankB", label: "Tank B" },
    { id: "tankC", label: "Tank C" },
    { id: "tankD", label: "Tank D" },
  ];

  // Fetch today's alerts for the main page display
  useEffect(() => {
    const fetchTodayAlerts = () => {
      fetch("http://localhost:5002/api/hatchery/alerts")
        .then((res) => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          return res.json();
        })
        .then((data) => {
          // console.log(`Fetched ${data.length} total alerts from DB`);

          const today = new Date().toDateString();
          const todayAlerts = data.filter(
            (a) => new Date(a.createdAt).toDateString() === today,
          );

          // console.log(` Today's alerts: ${todayAlerts.length}`);
          setAlerts(todayAlerts);
        })
        .catch((err) => {
          console.error(" Error fetching alerts:", err);
          setAlerts([]);
        });
    };

    fetchTodayAlerts();
    const interval = setInterval(fetchTodayAlerts, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="max-w-[1600px] mx-auto flex flex-col gap-8 bg-[#F8FAFC] min-h-screen p-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold text-black">Hatchery Monitoring</h1>
          <p className="text-slate-500">
            Real-time AI monitoring of hatchling behavior & species
          </p>
        </div>
      </div>

      {/* Stats Cards Grid */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatSummaryCard
          icon={Turtle}
          value="40"
          label="Total Hatchlings"
          subtext="Across all tanks"
          colorTheme="cyan"
        />

        <StatSummaryCard
          icon={Layers}
          value="2"
          label="Species Types"
          subtext="Green, Olive Ridley"
          colorTheme="teal"
        />

        <StatSummaryCard
          icon={Heart}
          value="80%"
          label="Health Average"
          subtext="Good condition"
          colorTheme="amber"
        />

        <StatSummaryCard
          icon={Database}
          value="4"
          label="Active Tanks"
          subtext="All operational"
          colorTheme="purple"
        />
      </section>

      {/* Tank Grid */}
      <section className="bg-white rounded-3xl border border-slate-200 shadow-sm p-8">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-slate-900">
            Live Tank Monitoring
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Real-time video streams with AI detection
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {tanks.map((tank) => (
            <div
              key={tank.id}
              className="rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition"
            >
              <TankVideoCard tankId={tank.id} tankLabel={tank.label} />
            </div>
          ))}
        </div>
      </section>

      {/* Upload Analyzer */}
      <section className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-3xl p-1 shadow-lg">
        <div className="bg-white rounded-[calc(1.5rem-1px)] p-4">
          <UploadAnalyzer />
        </div>
      </section>

      {/* Today's Alert Log */}
      <section className="bg-white rounded-3xl border border-slate-200 shadow-sm">
        <div className="px-8 py-4 border-b flex items-center gap-3">
          <History className="w-5 h-5 text-slate-600" />
          <h3 className="font-bold text-slate-800">Today's Anomaly Activity</h3>
        </div>

        <div className="p-8">
          {alerts.length === 0 ? (
            <div className="h-40 flex flex-col items-center justify-center border-2 border-dashed rounded-xl text-slate-400">
              <Bell className="w-10 h-10 mb-2 opacity-30" />
              <p>No anomalies detected today</p>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {alerts.map((alert) => (
                <div
                  key={alert._id}
                  className="p-5 bg-white border-l-4 border-red-500 rounded-xl shadow-sm hover:shadow-md transition-all"
                >
                  <div className="flex items-start justify-between mb-2">
                    <AlertTriangle className="w-5 h-5 text-red-500" />
                    <span
                      className={`text-xs px-2 py-1 rounded-full font-semibold ${
                        alert.status === "pending"
                          ? "bg-amber-100 text-amber-700"
                          : "bg-green-100 text-green-700"
                      }`}
                    >
                      {alert.status.toUpperCase()}
                    </span>
                  </div>
                  <p className="font-bold text-slate-800">{alert.message}</p>
                  <p className="text-xs text-slate-500 mt-2">
                    {alert.tank} ·{" "}
                    {new Date(alert.createdAt).toLocaleTimeString()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
