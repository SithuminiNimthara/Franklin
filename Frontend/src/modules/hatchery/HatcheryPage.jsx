import { useEffect, useState } from "react";
import { AlertTriangle, Bell } from "lucide-react";
import TankVideoCard from "../../shared/components/ui/TankVideoCard";
import UploadAnalyzer from "../../shared/components/ui/UploadAnalyzer";

export default function HatcheryPage() {
  // ALERTS STATE
  const [alerts, setAlerts] = useState([]);

  // ALERT FETCH
  useEffect(() => {
    const interval = setInterval(() => {
      fetch("http://localhost:5001/alerts")
        .then((res) => res.json())
        .then(setAlerts)
        .catch(() => setAlerts([]));
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col gap-4 max-w-[1600px] mx-auto bg-gray-50 min-h-screen">
      {/* HEADER */}
      <div className="flex flex-col">
        <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">
          Hatchery Monitoring
        </h1>
        <p className="text-gray-500 mt-1">
          Real-time AI monitoring for species identification and health
          analysis.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* LEFT COLUMN: Upload & Analysis */}
        <div className="lg:col-span-8 space-y-8">
          {/* 1. THE NEW UPLOAD COMPONENT */}
          <UploadAnalyzer />

          {/* 2. LIVE FEED */}
          <div className="bg-white rounded-2xl border shadow-sm p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-4">
              Current Tanks
            </h3>
            <TankVideoCard tankId="tankA" tankLabel="Tank A - Main Camera" />
          </div>
        </div>

        {/* RIGHT COLUMN: Alerts */}
        <div className="lg:col-span-4">
          <div className="bg-white rounded-2xl border shadow-sm p-6 sticky top-6">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b">
              <div className="p-2 bg-orange-100 rounded-lg">
                <AlertTriangle className="w-6 h-6 text-orange-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Live Alerts</h3>
                <p className="text-xs text-gray-500">Real-time anomalies</p>
              </div>
            </div>

            <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
              {alerts.length === 0 ? (
                <div className="h-40 flex flex-col items-center justify-center text-gray-400 border-2 border-dashed border-gray-100 rounded-xl bg-gray-50">
                  <Bell className="w-8 h-8 mb-2 opacity-50" />
                  <span className="text-sm">System Normal</span>
                </div>
              ) : (
                alerts.map((alert, idx) => (
                  <div
                    key={idx}
                    className={`p-4 rounded-xl border-l-4 shadow-sm transition-all hover:shadow-md ${
                      alert.type === "species"
                        ? "border-orange-500 bg-orange-50/50"
                        : "border-red-500 bg-red-50/50"
                    }`}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <span
                        className={`text-xs font-bold px-2 py-0.5 rounded uppercase ${
                          alert.type === "species"
                            ? "bg-orange-200 text-orange-800"
                            : "bg-red-200 text-red-800"
                        }`}
                      >
                        {alert.type}
                      </span>
                      <span className="text-xs text-gray-400 font-mono">
                        {alert.time}
                      </span>
                    </div>
                    <p className="font-semibold text-gray-800 text-sm mt-1">
                      {alert.message}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Source: {alert.tank}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
