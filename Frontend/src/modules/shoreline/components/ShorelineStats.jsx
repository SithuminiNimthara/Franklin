import React from "react";
import { AlertTriangle, MapPin, Shield, ShieldAlert } from "lucide-react";
import { LiveDot } from "../constants/shorelineTheme.jsx";

function StatCard({
  label,
  value,
  subText,
  accent,
  softBackground,
  borderColor,
  icon: Icon,
  pulse = false,
}) {
  return (
    <div
      className="relative overflow-hidden rounded-2xl p-5 shadow-sm transition-all hover:shadow-md"
      style={{
        backgroundColor: softBackground,
        border: `1px solid ${borderColor}`,
      }}
    >
      <div
        className="absolute left-0 top-0 h-1 w-full"
        style={{ backgroundColor: accent }}
      />

      <div className="flex items-start justify-between">
        <div
          className="flex h-11 w-11 items-center justify-center rounded-xl"
          style={{
            backgroundColor: "#ffffffcc",
            color: accent,
          }}
        >
          <Icon size={18} />
        </div>

        {pulse && <LiveDot color={accent} />}
      </div>

      <div className="mt-4">
        <p
          className="text-3xl font-bold tracking-tight"
          style={{ color: accent }}
        >
          {value}
        </p>

        <p className="mt-1 text-xs font-semibold uppercase tracking-[0.12em] text-slate-600">
          {label}
        </p>

        {subText && <p className="mt-1 text-xs text-slate-500">{subText}</p>}
      </div>
    </div>
  );
}

export default function ShorelineStats({
  highRiskCount,
  warningCount,
  monitoredCount,
  crossedBoundary,
}) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard
        label="High Risk"
        value={highRiskCount}
        accent="#ef4444"
        softBackground="#fef2f2"
        borderColor="#fecaca"
        icon={AlertTriangle}
        pulse={highRiskCount > 0}
      />

      <StatCard
        label="Warnings"
        value={warningCount}
        accent="#f59e0b"
        softBackground="#fffbeb"
        borderColor="#fde68a"
        icon={MapPin}
        pulse={warningCount > 0}
      />

      <StatCard
        label="Monitored"
        value={monitoredCount}
        accent="#0ea5e9"
        softBackground="#f0f9ff"
        borderColor="#bae6fd"
        icon={MapPin}
      />

      <StatCard
        label="Boundary"
        value={crossedBoundary ? "BREACH" : "SECURE"}
        subText={
          crossedBoundary ? "immediate response needed" : "within safe range"
        }
        accent={crossedBoundary ? "#ef4444" : "#16a34a"}
        softBackground={crossedBoundary ? "#fef2f2" : "#f0fdf4"}
        borderColor={crossedBoundary ? "#fecaca" : "#bbf7d0"}
        icon={crossedBoundary ? ShieldAlert : Shield}
        pulse={crossedBoundary}
      />
    </div>
  );
}
