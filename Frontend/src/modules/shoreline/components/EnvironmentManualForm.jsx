import React, { useCallback, useEffect, useState } from "react";
import {
  CloudRain,
  Waves,
  TrendingUp,
  TrendingDown,
  Minus,
} from "lucide-react";

import {
  fetchCurrentEnvironment,
  saveManualEnvironment,
} from "../api/shoreline.api.js";
import {
  SectionHeader,
  SHORELINE_COLORS,
} from "../constants/shorelineTheme.jsx";

const INPUT_CLASS_NAME =
  "w-full rounded-xl border border-[#dbe7f3] bg-white px-3 py-2.5 text-sm font-medium text-slate-700 transition-all focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400";

const DEFAULT_FORM_STATE = {
  station: "Kosgoda Beach",
  rainLast3h: "",
  rainNext6h: "",
  tideHeight: "",
  tideTrend: "rising",
};

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

function TrendIcon({ trend }) {
  if (trend === "rising") {
    return <TrendingUp size={12} style={{ color: SHORELINE_COLORS.danger }} />;
  }

  if (trend === "falling") {
    return (
      <TrendingDown size={12} style={{ color: SHORELINE_COLORS.success }} />
    );
  }

  return <Minus size={12} style={{ color: SHORELINE_COLORS.muted }} />;
}

function EnvironmentSummary({ environment }) {
  if (!environment) return null;

  const summaryItems = [
    {
      icon: CloudRain,
      label: "Rain 3h",
      value: `${environment?.rain?.last3h_mm ?? "N/A"} mm`,
      color: SHORELINE_COLORS.info,
    },
    {
      icon: CloudRain,
      label: "Rain 6h",
      value: `${environment?.rain?.next6h_mm ?? "N/A"} mm`,
      color: SHORELINE_COLORS.info,
    },
    {
      icon: Waves,
      label: "Tide",
      value: `${environment?.tide?.height_m ?? "N/A"} m`,
      color: "#6366f1",
    },
  ];

  return (
    <div className="mb-4 rounded-xl border border-sky-100 bg-sky-50 p-3">
      <div className="mb-2 flex items-center gap-1.5">
        <span className="text-[10px] font-bold uppercase tracking-wider text-sky-600">
          Active Reading
        </span>
        <span className="rounded bg-sky-100 px-1.5 py-0.5 text-[9px] font-bold text-sky-700">
          {environment.source || "unknown"}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {summaryItems.map(({ icon: Icon, label, value, color }) => (
          <div key={label} className="flex items-center gap-2">
            <Icon size={12} style={{ color }} />
            <div>
              <p className="text-[10px] text-slate-500">{label}</p>
              <p className="text-xs font-bold text-slate-700">{value}</p>
            </div>
          </div>
        ))}

        <div className="flex items-center gap-2">
          <TrendIcon trend={environment?.tide?.trend} />
          <div>
            <p className="text-[10px] text-slate-500">Trend</p>
            <p className="text-xs font-bold text-slate-700">
              {environment?.tide?.trend ?? "unknown"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function EnvironmentManualForm({ onSaved }) {
  const [formValues, setFormValues] = useState(DEFAULT_FORM_STATE);
  const [currentEnvironment, setCurrentEnvironment] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const loadCurrentEnvironment = useCallback(async () => {
    try {
      const environment = await fetchCurrentEnvironment();
      setCurrentEnvironment(environment);
      return environment;
    } catch (error) {
      console.warn(
        "Failed to load current environment:",
        error.message || error,
      );
      return null;
    }
  }, []);

  useEffect(() => {
    loadCurrentEnvironment();
  }, [loadCurrentEnvironment]);

  function updateField(fieldName, value) {
    setFormValues((previousValues) => ({
      ...previousValues,
      [fieldName]: value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    setIsSaving(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      await saveManualEnvironment({
        station: formValues.station,
        quality: "good",
        observedAt: new Date().toISOString(),
        rain: {
          last3h_mm:
            formValues.rainLast3h === "" ? null : Number(formValues.rainLast3h),
          next6h_mm:
            formValues.rainNext6h === "" ? null : Number(formValues.rainNext6h),
        },
        tide: {
          height_m:
            formValues.tideHeight === "" ? null : Number(formValues.tideHeight),
          trend: formValues.tideTrend,
        },
      });

      const latestEnvironment = await loadCurrentEnvironment();
      onSaved?.(latestEnvironment);

      setSuccessMessage("Manual reading saved successfully.");
    } catch (error) {
      setErrorMessage(error.message || "Save failed");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="rounded-2xl border border-[#dbe7f3] bg-white p-5 shadow-sm">
      <SectionHeader
        icon={CloudRain}
        title="Manual Environment Entry"
        accent={SHORELINE_COLORS.info}
      />

      {errorMessage && (
        <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
          {errorMessage}
        </div>
      )}

      <EnvironmentSummary environment={currentEnvironment} />

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <Field label="Station / Beach">
            <input
              value={formValues.station}
              onChange={(event) => updateField("station", event.target.value)}
              className={INPUT_CLASS_NAME}
              placeholder="e.g., Kosgoda Beach"
            />
          </Field>

          <Field label="Tide Trend">
            <select
              value={formValues.tideTrend}
              onChange={(event) => updateField("tideTrend", event.target.value)}
              className={INPUT_CLASS_NAME}
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
              value={formValues.rainLast3h}
              onChange={(event) =>
                updateField("rainLast3h", event.target.value)
              }
              className={INPUT_CLASS_NAME}
              placeholder="e.g., 12"
            />
          </Field>

          <Field label="Rain Forecast Next 6h (mm)">
            <input
              type="number"
              step="0.1"
              value={formValues.rainNext6h}
              onChange={(event) =>
                updateField("rainNext6h", event.target.value)
              }
              className={INPUT_CLASS_NAME}
              placeholder="e.g., 8"
            />
          </Field>

          <Field label="Tide Height (m)">
            <input
              type="number"
              step="0.01"
              value={formValues.tideHeight}
              onChange={(event) =>
                updateField("tideHeight", event.target.value)
              }
              className={INPUT_CLASS_NAME}
              placeholder="e.g., 1.25"
            />
          </Field>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          {successMessage ? (
            <span className="text-xs font-semibold text-green-600">
              {successMessage}
            </span>
          ) : (
            <p className="text-[11px] text-slate-500">
              Used as a fallback when live environment API is unavailable.
            </p>
          )}

          <button
            type="submit"
            disabled={isSaving}
            className={`rounded-xl px-4 py-2 text-xs font-bold transition-all ${
              isSaving
                ? "cursor-not-allowed bg-slate-100 text-slate-400"
                : "bg-gradient-to-r from-sky-500 to-cyan-500 text-white shadow-md hover:shadow-lg"
            }`}
          >
            {isSaving ? "Saving..." : "Save Reading"}
          </button>
        </div>
      </form>
    </div>
  );
}
