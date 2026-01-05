import React, { useEffect, useState } from "react";
import { MapPin, AlertTriangle, Upload } from "lucide-react";

import DashboardCard from "../../shared/components/ui/DashboardCard.jsx";
import ShorelineBeachMap from "../../shared/components/maps/ShorelineBeachMap.jsx";

import {
  getBoundary,
  getNests,
  getAlerts,
  evaluateOffline,
} from "./api/shorelineApi.js";

function nestStatusFromDistance(d) {
  if (d == null) return "safe";
  if (d <= 3) return "danger";
  if (d <= 6) return "warning";
  return "safe";
}

export default function ShorelineRiskPage() {
  const [boundary, setBoundary] = useState([]);
  const [shoreline, setShoreline] = useState([]);
  const [nests, setNests] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [crossedBoundary, setCrossedBoundary] = useState(false);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState("");

  // load boundary + nests + alerts
  const loadStatic = async () => {
    try {
      const [b, n, a] = await Promise.all([
        getBoundary(),
        getNests(),
        getAlerts(),
      ]);

      setBoundary(b?.points || []);
      setNests(
        (n || []).map((item) => ({
          id: item.id,
          x: item.x,
          y: item.y,
          zone: item.label, // label from backend
          status: "safe",
        }))
      );
      setAlerts(a || []);
    } catch (e) {
      console.error("Static load failed:", e.message || e);
    }
  };

  useEffect(() => {
    loadStatic();
  }, []);

  // offline evaluation
  const runOfflineEvaluation = async (file) => {
    setLoading(true);
    try {
      const data = await evaluateOffline(file, 3);

      setShoreline(data?.shoreline || []);
      setCrossedBoundary(Boolean(data?.evaluation?.boundaryCrossed));

      // map nest risk
      const riskMap = new Map();
      for (const n of data?.evaluation?.nestsAtRisk || []) {
        riskMap.set(n.id, n.distancePct);
      }

      setNests((prev) =>
        prev.map((n) => {
          const d = riskMap.get(n.id);
          return {
            ...n,
            distanceToShoreline: d,
            status: nestStatusFromDistance(d),
          };
        })
      );

      setLastUpdated(new Date().toLocaleTimeString());

      // reload alerts
      const freshAlerts = await getAlerts();
      setAlerts(freshAlerts || []);
    } catch (e) {
      console.error(e.message || e);
    } finally {
      setLoading(false);
    }
  };

  const highCount =
    nests.filter((n) => n.status === "danger").length +
    (crossedBoundary ? 1 : 0);

  const mediumCount = nests.filter((n) => n.status === "warning").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Shoreline Risk Assessment
          </h1>
          <p className="text-gray-600 mt-1">
            Offline shoreline analysis using AI model
          </p>
          {lastUpdated && (
            <p className="text-xs text-gray-500 mt-2">
              Last evaluated at {lastUpdated}
            </p>
          )}
        </div>

        {/* Upload */}
        <label className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-md cursor-pointer">
          <Upload className="w-4 h-4" />
          {loading ? "Processing..." : "Upload Image"}
          <input
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => {
              const file = e.target.files?.[0];

              console.log("Selected file:", file?.name, file?.type, file?.size);

              if (file) {
                runOfflineEvaluation(file);
              }

              // allows selecting the same file again
              e.target.value = "";
            }}
          />
        </label>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Stat
          color="from-red-500 to-rose-500"
          label="Critical / High"
          value={highCount}
        />
        <Stat
          color="from-amber-500 to-orange-500"
          label="Warnings"
          value={mediumCount}
        />
        <Stat
          color="from-cyan-500 to-blue-500"
          label="Nests Monitored"
          value={nests.length}
          icon={<MapPin />}
        />
        <Stat
          color={
            crossedBoundary
              ? "from-red-600 to-red-800"
              : "from-green-500 to-emerald-500"
          }
          label="Boundary Crossed"
          value={crossedBoundary ? "YES" : "NO"}
        />
      </div>

      {/* Map */}
      <DashboardCard title="Risk Assessment Map" icon={MapPin}>
        <ShorelineBeachMap
          boundary={boundary}
          shoreline={shoreline}
          nests={nests}
        />

        {alerts.length === 0 && (
          <p className="mt-4 text-sm text-gray-500">
            No active shoreline alerts.
          </p>
        )}
      </DashboardCard>
    </div>
  );
}

function Stat({ label, value, color, icon }) {
  return (
    <div
      className={`bg-gradient-to-br ${color} rounded-2xl shadow-2xl p-6 text-white`}
    >
      {icon || <AlertTriangle className="h-8 w-8 mb-3" />}
      <p className="text-3xl font-bold">{value}</p>
      <p className="text-sm font-medium opacity-90">{label}</p>
    </div>
  );
}
