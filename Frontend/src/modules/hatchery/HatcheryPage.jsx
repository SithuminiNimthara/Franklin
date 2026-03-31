import { Turtle, Layers, Heart, Database } from "lucide-react";
import TankVideoCard from "../../shared/components/ui/TankVideoCard";
import UploadAnalyzer from "../../shared/components/ui/UploadAnalyzer";
import StatSummaryCard from "../../shared/components/ui/StatSummaryCard";
import HatcheryAlertList from "../../shared/components/ui/HatcheryAlertList";

const tanks = [
  { id: "tankA", label: "Tank Alpha" },
  { id: "tankF", label: "Tank Beta" },
  { id: "tankC", label: "Tank Gamma" },
  { id: "tankE", label: "Tank Delta" },
];

export default function HatcheryPage() {
  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
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

      {/* Videos */}
      <section className="bg-white dark:bg-slate-900 rounded-2xl border dark:border-slate-800 shadow-xl overflow-hidden">
        <div className="px-6 py-4 border-b dark:bg-slate-800/40">
          <h2 className="text-xl font-semibold text-black dark:text-white">
            Hatchery Tank Surveillance
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

      {/* Upload Videos */}
      <section className="bg-white dark:bg-slate-900 rounded-2xl border dark:border-slate-800 shadow-xl p-6">
        <h3 className="text-xl font-semibold text-black dark:text-white mb-4">
          Historical Species and Behavior Analysis
        </h3>
        <UploadAnalyzer />
      </section>

      {/* Alerts */}
      <HatcheryAlertList />
    </div>
  );
}
