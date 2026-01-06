import { useRef } from "react";
import { Droplets, Activity, Upload, AlertTriangle, Bell } from "lucide-react"; // Added Bell & AlertTriangle
import StatSummaryCard from "../../shared/components/ui/StatSummaryCard";
import TankVideoCard from "../../shared/components/ui/TankVideoCard";

export default function HatcheryPage() {
  const fileInputRef = useRef(null);

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event) => {
    const file = event.target.files?.[0];
    if (file) {
      console.log("Selected file for upload:", file.name);
      alert(`Selected: ${file.name}`);
    }
  };

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto p-4">
      {/* 1. Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-2">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Hatchery Management
          </h1>
          <p className="text-gray-800 mt-1">
            Species Detection and Behaviors Analysis
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
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-semibold transition-all shadow-lg hover:shadow-indigo-200 active:scale-95"
          >
            <Upload className="w-5 h-5" />
            <span>Upload Footage</span>
          </button>
        </div>
      </div>

      {/* 2. Main Content: Video & Real-time Stats */}
      <div className="flex flex-col lg:h-[600px]">
        <TankVideoCard tankId="tankA" tankLabel="Tank A" />
      </div>

      {/* 3. Bottom Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <StatSummaryCard
          value="118"
          label="Total Hatchlings Count"
          colorTheme="blue"
        />
        <StatSummaryCard
          value="98.5%"
          label="Survival Rate"
          colorTheme="green"
        />
      </div>

      {/* Alert System  */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2">
              <AlertTriangle className="w-6 h-6 text-orange-600" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">System Alerts</h3>
              <p className="text-sm text-gray-500">
                Real-time notifications for critical events
              </p>
            </div>
          </div>
          <span className="px-3 py-1 bg-gray-100 text-gray-600 text-xs font-bold rounded-full border border-gray-200">
            System Idle
          </span>
        </div>

        {/* Empty State Box */}
        <div className="h-48 border-2 border-dashed border-gray-200 rounded-xl flex flex-col items-center justify-center bg-gray-50/50">
          <Bell className="w-10 h-10 text-gray-300 mb-3" />
          <p className="text-gray-500 font-medium">No active alerts detected</p>
          <p className="text-sm text-gray-400">
            Abnormal behaviors and mix species will appear here automatically.
          </p>
        </div>
      </div>
    </div>
  );
}
