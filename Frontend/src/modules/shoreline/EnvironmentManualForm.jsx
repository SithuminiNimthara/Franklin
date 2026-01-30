import React, { useEffect, useState } from "react";
import DashboardCard from "../../shared/components/ui/DashboardCard.jsx";
import {
  getEnvironmentCurrent,
  saveManualEnvironment,
} from "./api/shorelineApi.js";

export default function EnvironmentManualForm() {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [station, setStation] = useState("Kosgoda Beach");
  const [rain3h, setRain3h] = useState("");
  const [rain6h, setRain6h] = useState("");
  const [tideHeight, setTideHeight] = useState("");
  const [trend, setTrend] = useState("rising");

  const [currentEnv, setCurrentEnv] = useState(null);

  async function loadCurrent() {
    try {
      const env = await getEnvironmentCurrent();
      setCurrentEnv(env);
    } catch (e) {
      console.warn("Failed to load current env:", e.message || e);
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
      const payload = {
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
      };

      await saveManualEnvironment(payload);
      setSuccess("✅ Manual environment reading saved.");
      await loadCurrent();
    } catch (e2) {
      setError(e2.message || "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <DashboardCard title="Manual Environment Entry (Tide + Rain)">
      {error && (
        <div className="mb-3 px-3 py-2 rounded-lg bg-red-50 text-red-700 text-sm">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-3 px-3 py-2 rounded-lg bg-green-50 text-green-700 text-sm">
          {success}
        </div>
      )}

      {/* Current env preview */}
      {currentEnv && (
        <div className="mb-4 p-3 rounded-2xl bg-gray-50 dark:bg-slate-900/40 border border-gray-100 dark:border-slate-800 text-xs text-gray-700 dark:text-gray-200">
          <div className="font-semibold mb-1">
            Current Environment (used in alerts)
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="px-2 py-1 rounded-lg bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700">
              Source: <b>{currentEnv.source}</b>
            </span>
            <span className="px-2 py-1 rounded-lg bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700">
              Station: <b>{currentEnv.station || "N/A"}</b>
            </span>
            <span className="px-2 py-1 rounded-lg bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700">
              Rain 3h: <b>{currentEnv?.rain?.last3h_mm ?? "N/A"} mm</b>
            </span>
            <span className="px-2 py-1 rounded-lg bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700">
              Rain 6h: <b>{currentEnv?.rain?.next6h_mm ?? "N/A"} mm</b>
            </span>
            <span className="px-2 py-1 rounded-lg bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700">
              Tide: <b>{currentEnv?.tide?.height_m ?? "N/A"} m</b>
            </span>
            <span className="px-2 py-1 rounded-lg bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700">
              Trend: <b>{currentEnv?.tide?.trend ?? "unknown"}</b>
            </span>
          </div>
        </div>
      )}

      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Station / Beach name">
            <input
              value={station}
              onChange={(e) => setStation(e.target.value)}
              className="w-full rounded-xl px-3 py-2 border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              placeholder="e.g., Kosgoda Beach"
            />
          </Field>

          <Field label="Tide trend">
            <select
              value={trend}
              onChange={(e) => setTrend(e.target.value)}
              className="w-full rounded-xl px-3 py-2 border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
            >
              <option value="rising">rising</option>
              <option value="falling">falling</option>
              <option value="steady">steady</option>
              <option value="unknown">unknown</option>
            </select>
          </Field>

          <Field label="Rainfall last 3 hours (mm)">
            <input
              type="number"
              step="0.1"
              value={rain3h}
              onChange={(e) => setRain3h(e.target.value)}
              className="w-full rounded-xl px-3 py-2 border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              placeholder="e.g., 12"
            />
          </Field>

          <Field label="Rain forecast next 6 hours (mm)">
            <input
              type="number"
              step="0.1"
              value={rain6h}
              onChange={(e) => setRain6h(e.target.value)}
              className="w-full rounded-xl px-3 py-2 border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              placeholder="e.g., 8"
            />
          </Field>

          <Field label="Tide height (m)">
            <input
              type="number"
              step="0.01"
              value={tideHeight}
              onChange={(e) => setTideHeight(e.target.value)}
              className="w-full rounded-xl px-3 py-2 border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              placeholder="e.g., 1.25"
            />
          </Field>
        </div>

        <button
          disabled={saving}
          className={`px-4 py-2 rounded-xl font-medium text-white ${
            saving ? "bg-gray-400" : "bg-blue-600 hover:bg-blue-700"
          }`}
        >
          {saving ? "Saving..." : "Save Manual Reading"}
        </button>

        <p className="text-xs text-gray-500">
          This manual reading is used as fallback when the environment API is
          unavailable.
        </p>
      </form>
    </DashboardCard>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-sm font-semibold text-gray-700 mb-1">
        {label}
      </label>
      {children}
    </div>
  );
}
