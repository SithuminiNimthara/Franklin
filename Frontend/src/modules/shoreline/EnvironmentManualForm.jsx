import React, { useEffect, useState } from "react";
import {
  CloudRain,
  Waves,
  TrendingUp,
  TrendingDown,
  Minus,
} from "lucide-react";

import {
  getEnvironmentCurrent,
  saveManualEnvironment,
} from "./api/shorelineApi.js";
import { COLORS, SectionHeader } from "./Shorelinetheme.jsx";

function Field({ label, children }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500">
        {label}
      </label>
      {children}
    </div>
  );
}

const inputCls =
  "w-full rounded-xl px-3 py-2.5 text-sm font-medium text-slate-700 bg-white border border-[#dbe7f3] focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition-all";

function TrendIcon({ trend }) {
  if (trend === "rising")
    return <TrendingUp size={12} style={{ color: COLORS.danger }} />;
  if (trend === "falling")
    return <TrendingDown size={12} style={{ color: COLORS.success }} />;
  return <Minus size={12} style={{ color: COLORS.muted }} />;
}

function EnvSummary({ env }) {
  if (!env) return null;

  return (
    <div className="mb-4 rounded-xl border border-sky-100 bg-sky-50 p-3">
      <div className="mb-2 flex items-center gap-1.5">
        <span className="text-[10px] font-bold uppercase tracking-wider text-sky-600">
          Active Reading
        </span>
        <span className="rounded bg-sky-100 px-1.5 py-0.5 text-[9px] font-bold text-sky-700">
          {env.source || "unknown"}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {[
          {
            icon: CloudRain,
            label: "Rain 3h",
            value: `${env?.rain?.last3h_mm ?? "N/A"} mm`,
            color: "#0ea5e9",
          },
          {
            icon: CloudRain,
            label: "Rain 6h",
            value: `${env?.rain?.next6h_mm ?? "N/A"} mm`,
            color: "#0ea5e9",
          },
          {
            icon: Waves,
            label: "Tide",
            value: `${env?.tide?.height_m ?? "N/A"} m`,
            color: "#6366f1",
          },
        ].map(({ icon: Icon, label, value, color }) => (
          <div key={label} className="flex items-center gap-2">
            <Icon size={12} style={{ color }} />
            <div>
              <p className="text-[10px] text-slate-500">{label}</p>
              <p className="text-xs font-bold text-slate-700">{value}</p>
            </div>
          </div>
        ))}

        <div className="flex items-center gap-2">
          <TrendIcon trend={env?.tide?.trend} />
          <div>
            <p className="text-[10px] text-slate-500">Trend</p>
            <p className="text-xs font-bold text-slate-700">
              {env?.tide?.trend ?? "unknown"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function EnvironmentManualForm({ onSaved }) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [currentEnv, setCurrentEnv] = useState(null);

  const [station, setStation] = useState("Kosgoda Beach");
  const [rain3h, setRain3h] = useState("");
  const [rain6h, setRain6h] = useState("");
  const [tideHeight, setTideHeight] = useState("");
  const [trend, setTrend] = useState("rising");

  async function loadCurrent() {
    try {
      const env = await getEnvironmentCurrent();
      setCurrentEnv(env);
      return env;
    } catch (e) {
      console.warn("Failed to load current env:", e.message || e);
      return null;
    }
  }

  useEffect(() => {
    loadCurrent();
  }, []);

  async function onSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      await saveManualEnvironment({
        station,
        quality: "good",
        observedAt: new Date().toISOString(),
        rain: {
          last3h_mm: rain3h === "" ? null : Number(rain3h),
          next6h_mm: rain6h === "" ? null : Number(rain6h),
        },
        tide: {
          height_m: tideHeight === "" ? null : Number(tideHeight),
          trend,
        },
      });

      const latest = await loadCurrent();
      onSaved?.(latest);

      setSuccess("Manual reading saved successfully.");
    } catch (e2) {
      setError(e2.message || "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-2xl border border-[#dbe7f3] bg-white p-5 shadow-sm">
      <SectionHeader
        icon={CloudRain}
        title="Manual Environment Entry"
        accent="#0ea5e9"
      />

      {error && (
        <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
          {error}
        </div>
      )}

      <EnvSummary env={currentEnv} />

      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <Field label="Station / Beach">
            <input
              value={station}
              onChange={(e) => setStation(e.target.value)}
              className={inputCls}
              placeholder="e.g., Kosgoda Beach"
            />
          </Field>

          <Field label="Tide Trend">
            <select
              value={trend}
              onChange={(e) => setTrend(e.target.value)}
              className={inputCls}
            >
              <option value="rising">rising</option>
              <option value="falling">falling</option>
              <option value="steady">steady</option>
              <option value="unknown">unknown</option>
            </select>
          </Field>

          <Field label="Rainfall Last 3h (mm)">
            <input
              type="number"
              step="0.1"
              value={rain3h}
              onChange={(e) => setRain3h(e.target.value)}
              className={inputCls}
              placeholder="e.g., 12"
            />
          </Field>

          <Field label="Rain Forecast Next 6h (mm)">
            <input
              type="number"
              step="0.1"
              value={rain6h}
              onChange={(e) => setRain6h(e.target.value)}
              className={inputCls}
              placeholder="e.g., 8"
            />
          </Field>

          <Field label="Tide Height (m)">
            <input
              type="number"
              step="0.01"
              value={tideHeight}
              onChange={(e) => setTideHeight(e.target.value)}
              className={inputCls}
              placeholder="e.g., 1.25"
            />
          </Field>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          {success ? (
            <span className="text-xs font-semibold text-green-600">
              {success}
            </span>
          ) : (
            <p className="text-[11px] text-slate-500">
              Used as a fallback when live environment API is unavailable.
            </p>
          )}

          <button
            type="submit"
            disabled={saving}
            className={`rounded-xl px-4 py-2 text-xs font-bold transition-all ${
              saving
                ? "cursor-not-allowed bg-slate-100 text-slate-400"
                : "bg-gradient-to-r from-sky-500 to-cyan-500 text-white shadow-md hover:shadow-lg"
            }`}
          >
            {saving ? "Saving..." : "Save Reading"}
          </button>
        </div>
      </form>
    </div>
  );
}
