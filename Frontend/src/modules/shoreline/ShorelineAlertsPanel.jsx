import React, { useEffect, useState } from "react";
import {
  BadgeCheck,
  RefreshCcw,
  Clock,
  CloudRain,
  Waves,
  MapPin,
  ShieldAlert,
} from "lucide-react";

import {
  getAlerts,
  acknowledgeAlert,
  resolveAlert,
} from "./api/shorelineApi.js";
import { COLORS, SectionHeader } from "./shorelineTheme.jsx";

function RiskBadge({ risk }) {
  const map = {
    high: { color: COLORS.danger, bg: COLORS.dangerSoft, label: "HIGH" },
    medium: { color: COLORS.warning, bg: COLORS.warningSoft, label: "MED" },
    low: { color: COLORS.success, bg: COLORS.successSoft, label: "LOW" },
  };

  const { color, bg, label } = map[risk] || map.low;

  return (
    <span
      className="px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider"
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
      className="px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider"
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
      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${colorClass} ${
        disabled ? "opacity-50 cursor-not-allowed" : "hover:shadow-sm"
      }`}
    >
      {label}
    </button>
  );
}

function AlertCard({ alert: a, onAck, onResolve, busy }) {
  return (
    <div className="rounded-xl border border-[#e2e8f0] bg-[#fcfdff] p-4 space-y-3 hover:shadow-sm transition-all">
      <div className="flex items-center justify-between flex-wrap gap-2">
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

      <p className="text-sm font-semibold leading-snug text-slate-700">
        {a.message}
      </p>

      <div className="flex flex-wrap gap-2">
        <Chip
          icon={ShieldAlert}
          label={`Boundary: ${a.details?.evaluation?.boundaryCrossed ? "Crossed" : "Clear"}`}
          color={
            a.details?.evaluation?.boundaryCrossed
              ? COLORS.danger
              : COLORS.success
          }
          bg={
            a.details?.evaluation?.boundaryCrossed
              ? COLORS.dangerSoft
              : COLORS.successSoft
          }
        />

        <Chip
          icon={MapPin}
          label={`${a.details?.evaluation?.nestsAtRisk?.length || 0} nests at risk`}
          color={COLORS.warning}
          bg={COLORS.warningSoft}
        />

        <Chip
          icon={CloudRain}
          label={`${a.details?.environment?.rain?.last3h_mm ?? "—"} mm / 3h`}
          color={COLORS.info}
          bg={COLORS.infoSoft}
        />

        <Chip
          icon={Waves}
          label={`Tide ${a.details?.environment?.tide?.height_m ?? "—"} m · ${a.details?.environment?.tide?.trend ?? "unknown"}`}
          color="#6366f1"
          bg="#eef2ff"
        />
      </div>

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="text-[10px] space-x-2 text-slate-500">
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
            colorClass="bg-amber-50 text-amber-700 border border-amber-200"
            label="Acknowledge"
          />

          <ActionBtn
            disabled={a.status === "resolved" || busy}
            onClick={() => onResolve(a._id)}
            colorClass="bg-green-50 text-green-700 border border-green-200"
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
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#dbe7f3] bg-white px-3 py-2 text-[11px] font-semibold text-slate-600 hover:bg-slate-50 transition"
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
        <div className="space-y-3 max-h-[520px] overflow-auto pr-1">
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
