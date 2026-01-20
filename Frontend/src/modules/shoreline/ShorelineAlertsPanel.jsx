import React, { useEffect, useState } from "react";
import { CheckCircle2, BadgeCheck, RefreshCcw } from "lucide-react";
import DashboardCard from "../../shared/components/ui/DashboardCard.jsx";

import {
  getAlerts,
  acknowledgeAlert,
  resolveAlert,
} from "./api/shorelineApi.js";

function StatusBadge({ status }) {
  const base = "px-2 py-1 text-xs rounded-full font-semibold";
  if (status === "new")
    return <span className={`${base} bg-red-100 text-red-700`}>NEW</span>;
  if (status === "acknowledged")
    return (
      <span className={`${base} bg-amber-100 text-amber-700`}>
        ACKNOWLEDGED
      </span>
    );
  return (
    <span className={`${base} bg-green-100 text-green-700`}>RESOLVED</span>
  );
}

function RiskBadge({ risk }) {
  const base = "px-2 py-1 text-xs rounded-full font-semibold";
  if (risk === "high")
    return <span className={`${base} bg-rose-100 text-rose-700`}>HIGH</span>;
  if (risk === "medium")
    return (
      <span className={`${base} bg-yellow-100 text-yellow-700`}>MEDIUM</span>
    );
  return <span className={`${base} bg-slate-100 text-slate-700`}>LOW</span>;
}

export default function ShorelineAlertsPanel({ staffName = "Ranger-01" }) {
  const [items, setItems] = useState([]);
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
    // optional auto refresh every 10s
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
    <DashboardCard
      title="Shoreline Alerts (Staff Workflow)"
      icon={BadgeCheck}
      right={
        <button
          onClick={refresh}
          className="flex items-center gap-2 px-3 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm"
        >
          <RefreshCcw className="w-4 h-4" />
          Refresh
        </button>
      }
    >
      {error && (
        <div className="mb-3 px-3 py-2 rounded-lg bg-red-50 text-red-700 text-sm">
          {error}
        </div>
      )}

      {loading && items.length === 0 ? (
        <p className="text-sm text-gray-500">Loading alerts...</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-gray-500">No alerts found.</p>
      ) : (
        <div className="space-y-3">
          {items.map((a) => (
            <div
              key={a._id}
              className="border rounded-2xl p-4 bg-white shadow-sm"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <RiskBadge risk={a.riskLevel} />
                  <StatusBadge status={a.status} />
                  <span className="text-sm text-gray-500">
                    {new Date(a.createdAt).toLocaleString()}
                  </span>
                </div>

                <div className="flex gap-2">
                  <button
                    disabled={a.status !== "new" || busyId === a._id}
                    onClick={() => onAck(a._id)}
                    className={`px-3 py-2 rounded-xl text-sm font-medium
                      ${
                        a.status !== "new" || busyId === a._id
                          ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                          : "bg-amber-600 hover:bg-amber-700 text-white"
                      }`}
                  >
                    Acknowledge
                  </button>

                  <button
                    disabled={a.status === "resolved" || busyId === a._id}
                    onClick={() => onResolve(a._id)}
                    className={`px-3 py-2 rounded-xl text-sm font-medium
                      ${
                        a.status === "resolved" || busyId === a._id
                          ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                          : "bg-green-600 hover:bg-green-700 text-white"
                      }`}
                  >
                    Resolve
                  </button>
                </div>
              </div>

              <p className="mt-3 text-gray-800 font-semibold">{a.message}</p>

              {/* Evidence summary */}
              <div className="mt-2 text-sm text-gray-600">
                Boundary crossed:{" "}
                <b>{String(a.details?.evaluation?.boundaryCrossed)}</b>
                {" • "}
                Nests at risk:{" "}
                <b>{a.details?.evaluation?.nestsAtRisk?.length || 0}</b>
              </div>

              {/* Show who acknowledged/resolved */}
              <div className="mt-2 text-xs text-gray-500">
                {a.acknowledgedBy && (
                  <span className="mr-3">
                    ✅ Ack by <b>{a.acknowledgedBy}</b>
                  </span>
                )}
                {a.resolvedBy && (
                  <span>
                    🟢 Resolved by <b>{a.resolvedBy}</b>
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </DashboardCard>
  );
}
