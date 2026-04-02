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
  getAlerts,
  acknowledgeAlert,
  resolveAlert,
} from "./api/shorelineApi.js";
import { COLORS, SectionHeader } from "./Shorelinetheme.jsx";

function RiskBadge({ risk }) {
  const map = {
    high: { color: COLORS.danger, bg: COLORS.dangerSoft, label: "HIGH" },
    medium: { color: COLORS.warning, bg: COLORS.warningSoft, label: "MEDIUM" },
    low: { color: COLORS.success, bg: COLORS.successSoft, label: "LOW" },
  };

  const { color, bg, label } = map[risk] || map.low;

  return (
    <span
      className="rounded-full px-2.5 py-1 text-[10px] font-bold tracking-wider"
      style={{ backgroundColor: bg, color }}
    >
      {label}
    </span>
  );
}

function StatusBadge({ status }) {
  const map = {
    new: { color: COLORS.danger, bg: COLORS.dangerSoft, label: "NEW" },
    acknowledged: {
      color: COLORS.warning,
      bg: COLORS.warningSoft,
      label: "ACK",
    },
    resolved: { color: COLORS.success, bg: COLORS.successSoft, label: "DONE" },
  };

  const { color, bg, label } = map[status] || map.new;

  return (
    <span
      className="rounded-full px-2.5 py-1 text-[10px] font-bold tracking-wider"
      style={{ backgroundColor: bg, color }}
    >
      {label}
    </span>
  );
}

function Chip({ icon: Icon, label, color, bg }) {
  return (
    <div
      className="flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[10px] font-medium"
      style={{ backgroundColor: bg, color }}
    >
      <Icon size={10} />
      {label}
    </div>
  );
}

function ActionBtn({ disabled, onClick, colorClass, label }) {
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${colorClass} ${
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
    .map((n) => {
      const label = n.label || n.id || "Unknown nest";
      const distance =
        n.distancePct != null ? ` (${Number(n.distancePct).toFixed(2)}%)` : "";
      return `${label}${distance}`;
    })
    .join(", ");
}

function AlertCard({ alert: a, onAck, onResolve, busy }) {
  const details = a.details || {};
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
          <RiskBadge risk={a.riskLevel} />
          <StatusBadge status={a.status} />
        </div>

        <div className="flex items-center gap-1.5 text-slate-500">
          <Clock size={11} />
          <span className="text-[10px]">
            {new Date(a.createdAt).toLocaleString()}
          </span>
        </div>
      </div>

      <div>
        <p className="text-sm font-semibold leading-snug text-slate-800">
          {a.message}
        </p>
        <p className="mt-1 text-xs leading-relaxed text-slate-600">{summary}</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Chip
          icon={ShieldAlert}
          label={`Boundary: ${boundaryCrossed ? "Crossed" : "Clear"}`}
          color={boundaryCrossed ? COLORS.danger : COLORS.success}
          bg={boundaryCrossed ? COLORS.dangerSoft : COLORS.successSoft}
        />

        <Chip
          icon={MapPin}
          label={`${nestsAtRiskCount} nests at risk`}
          color={COLORS.warning}
          bg={COLORS.warningSoft}
        />

        <Chip
          icon={CloudRain}
          label={`${details.environment?.rain?.last3h_mm ?? "—"} mm / 3h`}
          color={COLORS.info}
          bg={COLORS.infoSoft}
        />

        <Chip
          icon={Waves}
          label={`Tide ${details.environment?.tide?.height_m ?? "—"} m · ${details.environment?.tide?.trend ?? "unknown"}`}
          color="#6366f1"
          bg="#eef2ff"
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
          {a.acknowledgedBy && (
            <span>
              Ack: <b>{a.acknowledgedBy}</b>
            </span>
          )}
          {a.resolvedBy && (
            <span>
              Resolved: <b>{a.resolvedBy}</b>
            </span>
          )}
        </div>

        <div className="flex gap-2">
          <ActionBtn
            disabled={a.status !== "new" || busy}
            onClick={() => onAck(a._id)}
            colorClass="border border-amber-200 bg-amber-50 text-amber-700"
            label="Acknowledge"
          />

          <ActionBtn
            disabled={a.status === "resolved" || busy}
            onClick={() => onResolve(a._id)}
            colorClass="border border-green-200 bg-green-50 text-green-700"
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

  async function refresh() {
    setLoading(true);
    setError("");

    try {
      const data = await getAlerts(30, 1);
      setItems(data?.items || []);
    } catch (e) {
      setError(e.message || "Failed to load alerts");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 10000);
    return () => clearInterval(t);
  }, []);

  async function onAck(id) {
    setBusyId(id);
    setError("");

    try {
      await acknowledgeAlert(id, staffName);
      await refresh();
    } catch (e) {
      setError(e.message || "Acknowledge failed");
    } finally {
      setBusyId(null);
    }
  }

  async function onResolve(id) {
    setBusyId(id);
    setError("");

    try {
      await resolveAlert(id, staffName);
      await refresh();
    } catch (e) {
      setError(e.message || "Resolve failed");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="rounded-2xl border border-[#dbe7f3] bg-white p-5 shadow-sm">
      <SectionHeader
        icon={BadgeCheck}
        title="Active Alerts"
        accent={COLORS.warning}
        right={
          <button
            onClick={refresh}
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
          {items.map((a) => (
            <AlertCard
              key={a._id}
              alert={a}
              busy={busyId === a._id}
              onAck={onAck}
              onResolve={onResolve}
            />
          ))}
        </div>
      )}
    </div>
  );
}
