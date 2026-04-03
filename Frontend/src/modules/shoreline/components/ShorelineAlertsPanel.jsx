import React, { useEffect, useState } from "react";
import {
  BadgeCheck,
  RefreshCcw,
  Clock,
  CloudRain,
  Waves,
  MapPin,
  ShieldAlert,
  AlertTriangle,
  ClipboardList,
} from "lucide-react";

import {
  fetchAlerts,
  acknowledgeShorelineAlert,
  resolveShorelineAlert,
} from "../api/shoreline.api.js";
import {
  SHORELINE_COLORS,
  SectionHeader,
} from "../constants/shorelineTheme.jsx";

const ALERT_REFRESH_INTERVAL_MS = 10000;

function RiskBadge({ risk }) {
  const riskStyleMap = {
    high: {
      color: SHORELINE_COLORS.danger,
      background: SHORELINE_COLORS.dangerSoft,
      label: "HIGH",
    },
    medium: {
      color: SHORELINE_COLORS.warning,
      background: SHORELINE_COLORS.warningSoft,
      label: "MEDIUM",
    },
    low: {
      color: SHORELINE_COLORS.success,
      background: SHORELINE_COLORS.successSoft,
      label: "LOW",
    },
  };

  const config = riskStyleMap[risk] || riskStyleMap.low;

  return (
    <span
      className="rounded-full px-2.5 py-1 text-[10px] font-bold tracking-wider"
      style={{ backgroundColor: config.background, color: config.color }}
    >
      {config.label}
    </span>
  );
}

function StatusBadge({ status }) {
  const statusStyleMap = {
    new: {
      color: SHORELINE_COLORS.danger,
      background: SHORELINE_COLORS.dangerSoft,
      label: "NEW",
    },
    acknowledged: {
      color: SHORELINE_COLORS.warning,
      background: SHORELINE_COLORS.warningSoft,
      label: "ACK",
    },
    resolved: {
      color: SHORELINE_COLORS.success,
      background: SHORELINE_COLORS.successSoft,
      label: "DONE",
    },
  };

  const config = statusStyleMap[status] || statusStyleMap.new;

  return (
    <span
      className="rounded-full px-2.5 py-1 text-[10px] font-bold tracking-wider"
      style={{ backgroundColor: config.background, color: config.color }}
    >
      {config.label}
    </span>
  );
}

function InfoChip({ icon: Icon, label, color, background }) {
  return (
    <div
      className="flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[10px] font-medium"
      style={{ backgroundColor: background, color }}
    >
      <Icon size={10} />
      {label}
    </div>
  );
}

function ActionButton({ disabled, onClick, className, label }) {
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${className} ${
        disabled ? "cursor-not-allowed opacity-50" : "hover:shadow-sm"
      }`}
    >
      {label}
    </button>
  );
}

function formatNestList(nestsAtRisk = []) {
  if (!Array.isArray(nestsAtRisk) || nestsAtRisk.length === 0) {
    return "No specific nests listed";
  }

  return nestsAtRisk
    .map((nest) => {
      const label = nest.label || nest.id || "Unknown nest";
      const distance =
        nest.distancePct != null
          ? ` (${Number(nest.distancePct).toFixed(2)}%)`
          : "";

      return `${label}${distance}`;
    })
    .join(", ");
}

function AlertCard({ alertItem, onAcknowledge, onResolve, isBusy }) {
  const details = alertItem.details || {};

  const boundaryCrossed =
    details.boundaryCrossed ?? details.evaluation?.boundaryCrossed ?? false;

  const nestsAtRisk =
    details.nestsAtRisk ||
    details.threatenedNests ||
    details.evaluation?.nestsAtRisk ||
    [];

  const nestsAtRiskCount = details.nestsAtRiskCount ?? nestsAtRisk.length ?? 0;

  const summary =
    details.summary || "Shoreline risk detected in the monitored coastal zone.";

  const riskReason =
    details.riskReason ||
    "Shoreline movement has increased the risk exposure of the nesting area.";

  const recommendedAction =
    details.recommendedAction ||
    "Please review the shoreline condition and verify affected nests on site.";

  return (
    <div className="space-y-4 rounded-xl border border-[#e2e8f0] bg-[#fcfdff] p-4 transition-all hover:shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <RiskBadge risk={alertItem.riskLevel} />
          <StatusBadge status={alertItem.status} />
        </div>

        <div className="flex items-center gap-1.5 text-slate-500">
          <Clock size={11} />
          <span className="text-[10px]">
            {new Date(alertItem.createdAt).toLocaleString()}
          </span>
        </div>
      </div>

      <div>
        <p className="text-sm font-semibold leading-snug text-slate-800">
          {alertItem.message}
        </p>
        <p className="mt-1 text-xs leading-relaxed text-slate-600">{summary}</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <InfoChip
          icon={ShieldAlert}
          label={`Boundary: ${boundaryCrossed ? "Crossed" : "Clear"}`}
          color={
            boundaryCrossed ? SHORELINE_COLORS.danger : SHORELINE_COLORS.success
          }
          background={
            boundaryCrossed
              ? SHORELINE_COLORS.dangerSoft
              : SHORELINE_COLORS.successSoft
          }
        />

        <InfoChip
          icon={MapPin}
          label={`${nestsAtRiskCount} nests at risk`}
          color={SHORELINE_COLORS.warning}
          background={SHORELINE_COLORS.warningSoft}
        />

        <InfoChip
          icon={CloudRain}
          label={`${details.environment?.rain?.last3h_mm ?? "—"} mm / 3h`}
          color={SHORELINE_COLORS.info}
          background={SHORELINE_COLORS.infoSoft}
        />

        <InfoChip
          icon={Waves}
          label={`Tide ${details.environment?.tide?.height_m ?? "—"} m · ${details.environment?.tide?.trend ?? "unknown"}`}
          color="#6366f1"
          background="#eef2ff"
        />
      </div>

      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
        <div className="flex items-start gap-2">
          <AlertTriangle size={15} className="mt-0.5 text-red-500" />
          <div>
            <p className="text-xs font-semibold text-slate-700">Risk reason</p>
            <p className="mt-1 text-xs leading-relaxed text-slate-600">
              {riskReason}
            </p>
          </div>
        </div>

        <div className="mt-3 flex items-start gap-2">
          <ClipboardList size={15} className="mt-0.5 text-amber-500" />
          <div>
            <p className="text-xs font-semibold text-slate-700">
              Recommended action
            </p>
            <p className="mt-1 text-xs leading-relaxed text-slate-600">
              {recommendedAction}
            </p>
          </div>
        </div>

        <div className="mt-3">
          <p className="text-xs font-semibold text-slate-700">Affected nests</p>
          <p className="mt-1 text-xs leading-relaxed text-slate-600">
            {formatNestList(nestsAtRisk)}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-x-2 text-[10px] text-slate-500">
          {alertItem.acknowledgedBy && (
            <span>
              Ack: <b>{alertItem.acknowledgedBy}</b>
            </span>
          )}
          {alertItem.resolvedBy && (
            <span>
              Resolved: <b>{alertItem.resolvedBy}</b>
            </span>
          )}
        </div>

        <div className="flex gap-2">
          <ActionButton
            disabled={alertItem.status !== "new" || isBusy}
            onClick={() => onAcknowledge(alertItem._id)}
            className="border border-amber-200 bg-amber-50 text-amber-700"
            label="Acknowledge"
          />

          <ActionButton
            disabled={alertItem.status === "resolved" || isBusy}
            onClick={() => onResolve(alertItem._id)}
            className="border border-green-200 bg-green-50 text-green-700"
            label="Resolve"
          />
        </div>
      </div>
    </div>
  );
}

export default function ShorelineAlertsPanel({
  staffName = "Ranger-01",
  initialItems = [],
}) {
  const [items, setItems] = useState(initialItems);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState("");

  async function refreshAlerts() {
    setLoading(true);
    setError("");

    try {
      const data = await fetchAlerts(30, 1);
      setItems(data?.items || []);
    } catch (err) {
      setError(err.message || "Failed to load alerts");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refreshAlerts();

    const intervalId = setInterval(refreshAlerts, ALERT_REFRESH_INTERVAL_MS);
    return () => clearInterval(intervalId);
  }, []);

  async function handleAcknowledge(id) {
    setBusyId(id);
    setError("");

    try {
      await acknowledgeShorelineAlert(id, staffName);
      await refreshAlerts();
    } catch (err) {
      setError(err.message || "Acknowledge failed");
    } finally {
      setBusyId(null);
    }
  }

  async function handleResolve(id) {
    setBusyId(id);
    setError("");

    try {
      await resolveShorelineAlert(id, staffName);
      await refreshAlerts();
    } catch (err) {
      setError(err.message || "Resolve failed");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="rounded-2xl border border-[#dbe7f3] bg-white p-5 shadow-sm">
      <SectionHeader
        icon={BadgeCheck}
        title="Active Alerts"
        accent={SHORELINE_COLORS.warning}
        rightContent={
          <button
            onClick={refreshAlerts}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#dbe7f3] bg-white px-3 py-2 text-[11px] font-semibold text-slate-600 transition hover:bg-slate-50"
          >
            <RefreshCcw size={11} />
            Refresh
          </button>
        }
      />

      {error && (
        <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
          {error}
        </div>
      )}

      {loading && items.length === 0 ? (
        <p className="text-sm text-slate-500">Loading alerts...</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-slate-500">No alerts found.</p>
      ) : (
        <div className="max-h-[520px] space-y-3 overflow-auto pr-1">
          {items.map((alertItem) => (
            <AlertCard
              key={alertItem._id}
              alertItem={alertItem}
              isBusy={busyId === alertItem._id}
              onAcknowledge={handleAcknowledge}
              onResolve={handleResolve}
            />
          ))}
        </div>
      )}
    </div>
  );
}
