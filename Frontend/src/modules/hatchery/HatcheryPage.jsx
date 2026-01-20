import { useRef, useEffect, useState } from "react";
import { Upload, AlertTriangle, Bell } from "lucide-react";
import StatSummaryCard from "../../shared/components/ui/StatSummaryCard";
import TankVideoCard from "../../shared/components/ui/TankVideoCard";

export default function HatcheryPage() {
  const fileInputRef = useRef(null);
  const [alerts, setAlerts] = useState([]);

  // FILE UPLOAD
  const handleUploadClick = () => fileInputRef.current?.click();

  const handleFileChange = (event) => {
    const file = event.target.files?.[0];
    if (file) alert(`Selected file: ${file.name}`);
  };

  // REAL-TIME ALERT FETCH 
  useEffect(() => {
    const interval = setInterval(() => {
      fetch("http://localhost:5002/api/hatchery/alerts")
        .then((res) => res.json())
        .then(setAlerts)
        .catch(() => setAlerts([]));
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto p-4">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Hatchery Management
          </h1>
          <p className="text-gray-600">
            AI-based Species Detection & Behavior Monitoring
          </p>
        </div>

        <div>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="video/*"
            className="hidden"
          />
          <button
            onClick={handleUploadClick}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-semibold shadow"
          >
            <Upload className="w-5 h-5" />
            Upload Footage
          </button>
        </div>
      </div>

      {/* VIDEO */}
      <TankVideoCard tankId="tankA" tankLabel="Tank A" />

      {/* STATS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <StatSummaryCard
          value="118"
          label="Total Hatchlings"
          colorTheme="blue"
        />
        <StatSummaryCard
          value="98.5%"
          label="Survival Rate"
          colorTheme="green"
        />
      </div>

      {/* ALERT PANEL */}
      <div className="bg-white rounded-2xl border p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <AlertTriangle className="w-6 h-6 text-orange-600" />
          <div>
            <h3 className="text-lg font-bold">System Alerts</h3>
            <p className="text-sm text-gray-500">
              Real-time abnormal behavior & mixed species alerts
            </p>
          </div>
        </div>

        {alerts.length === 0 ? (
          <div className="h-40 flex flex-col items-center justify-center text-gray-400 border-2 border-dashed rounded-xl">
            <Bell className="w-10 h-10 mb-2" />
            <p>No active alerts</p>
          </div>
        ) : (
          <div className="space-y-3">
            {alerts.map((alert, idx) => (
              <div
                key={idx}
                className={`p-4 rounded-xl border-l-4 ${
                  alert.type === "species"
                    ? "border-orange-500 bg-orange-50"
                    : "border-red-500 bg-red-50"
                }`}
              >
                <p className="font-semibold text-gray-800">{alert.message}</p>
                <p className="text-xs text-gray-500">
                  Tank {alert.tank} • {alert.time}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
