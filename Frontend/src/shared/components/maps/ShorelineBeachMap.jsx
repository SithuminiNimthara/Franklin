import React from "react";

function nestColor(status) {
  if (status === "danger") return "bg-red-500 border-red-700 shadow-red-500/50";
  if (status === "warning") return "bg-amber-500 border-amber-700 shadow-amber-500/50";
  return "bg-emerald-500 border-emerald-700 shadow-emerald-500/50";
}

export default function ShorelineBeachMap({ boundary = [], shoreline = [], nests = [], crossedBoundary = false }) {
  const nestDanger = nests.some((n) => n.status === "danger");
  const riskLevel = crossedBoundary || nestDanger ? "high" : "low";

  const boundaryPoints = boundary.length ? boundary.map((p) => `${p.x},${p.y}`).join(" ") : "";
  const shorelinePoints = shoreline.length ? shoreline.map((p) => `${p.x},${p.y}`).join(" ") : "";

  return (
    <div className="relative w-full h-[500px] bg-gradient-to-br from-yellow-100 via-amber-50 to-blue-200 dark:from-slate-900 dark:via-slate-950 dark:to-cyan-950/20 rounded-2xl overflow-hidden shadow-inner transition-colors duration-700">
      <div className="absolute inset-0 opacity-10 dark:opacity-20 pointer-events-none">
        <svg className="w-full h-full">
          <pattern id="gridLarge" width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M 20 0 L 0 0 0 20" fill="none" stroke="currentColor" strokeWidth="0.5" className="text-gray-400 dark:text-gray-800" />
          </pattern>
          <rect width="100%" height="100%" fill="url(#gridLarge)" />
        </svg>
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-1/3 bg-gradient-to-t from-blue-400/40 dark:from-cyan-900/20 to-transparent pointer-events-none" />

      <svg className="absolute inset-0 w-full h-full z-10 pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
        {boundary.length && (
          <polyline points={boundaryPoints} fill="none" stroke="rgb(239,68,68)" strokeWidth="1" strokeDasharray="2 1" opacity="0.8" />
        )}
        {shoreline.length && (
          <polyline points={shorelinePoints} fill="none" stroke={riskLevel === "high" ? "#ef4444" : "#3b82f6"} strokeWidth="1.2" opacity="1" className="transition-all duration-300" />
        )}
      </svg>

      {nests.map((nest) => (
        <div key={nest.id} className="absolute z-20 transform -translate-x-1/2 -translate-y-1/2 group" style={{ left: `${nest.x}%`, top: `${nest.y}%` }}>
          <div className={`w-3.5 h-3.5 rounded-full border-2 border-white dark:border-slate-800 shadow-xl ${nestColor(nest.status || "safe")}`} />
          <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-[8px] px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap font-bold uppercase tracking-widest pointer-events-none">
            {nest.zone}
          </div>
        </div>
      ))}

      <div className="absolute top-4 left-4 z-30 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md rounded-xl p-3 shadow-xl border border-white/20 dark:border-slate-800 transition-all">
        <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2 border-b border-gray-100 dark:border-slate-800 pb-2">Topography Key</p>
        <div className="space-y-1.5 text-[9px] font-bold text-gray-700 dark:text-gray-300">
          <div className="flex items-center gap-2">
            <span className="w-4 h-[1px] bg-red-500 border-t border-dashed" />
            <span>Hazard Boundary</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-4 h-[1.5px] bg-blue-600" />
            <span>Tide Shoreline</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 border border-white dark:border-slate-800" />
            <span>Secure Site</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 border border-white dark:border-slate-800" />
            <span>Risk Warning</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 border border-white dark:border-slate-800" />
            <span>Critical Zone</span>
          </div>
        </div>
      </div>
    </div>
  );
}
