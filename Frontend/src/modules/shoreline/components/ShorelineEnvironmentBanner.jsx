import React from "react";
import { CloudRain, Waves } from "lucide-react";

export default function ShorelineEnvironmentBanner({ environment }) {
  if (!environment) return null;

  return (
    <div className="rounded-2xl border border-sky-200 bg-sky-50 p-4">
      <p className="text-xs font-bold uppercase tracking-wide text-sky-700">
        Active Environment Reading
      </p>

      <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-slate-700">
        <span>{environment.station || "Unknown station"}</span>

        <span className="inline-flex items-center gap-1.5">
          <CloudRain size={14} className="text-sky-600" />
          Rain 3h: {environment?.rain?.last3h_mm ?? "N/A"} mm
        </span>

        <span className="inline-flex items-center gap-1.5">
          <CloudRain size={14} className="text-sky-600" />
          Rain 6h: {environment?.rain?.next6h_mm ?? "N/A"} mm
        </span>

        <span className="inline-flex items-center gap-1.5">
          <Waves size={14} className="text-indigo-600" />
          Tide: {environment?.tide?.height_m ?? "N/A"} m
        </span>

        <span>Trend: {environment?.tide?.trend ?? "unknown"}</span>
      </div>
    </div>
  );
}
