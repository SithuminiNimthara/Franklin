// ShorelineRiskPage.jsx
import React, { useEffect, useRef, useState } from "react";
import { MapPin, AlertTriangle, Upload, Video } from "lucide-react";

import DashboardCard from "../../shared/components/ui/DashboardCard.jsx";
import ShorelineBeachMap from "../../shared/components/maps/ShorelineBeachMap.jsx";
import ShorelineVideoPlayer from "../shoreline/ShorelineVideoPlayer.jsx";

import {
  getBoundary,
  getNests,
  getAlerts,
  evaluateOffline,
  // predictVideo,          // ❌ optional (keep only if you still want upload video)
  predictDemoVideo, // ✅ NEW: auto-load demo predictions
} from "./api/shorelineApi.js";

// ✅ Demo video sources
// Frontend plays this (put file in: frontend/public/demo/shoreline_demo.mp4)
const DEMO_VIDEO_SRC = "/videos/shoreline_demo.mp4";

// Backend reads this (put file in: backend/src/modules/shoreline/data/demo_videos/shoreline_demo.mp4)
const DEMO_VIDEO_NAME = "shoreline_demo.mp4";

function nestStatusFromDistance(d) {
  if (d == null) return "safe";
  if (d <= 3) return "danger";
  if (d <= 6) return "warning";
  return "safe";
}

// ✅ pixels -> percent (0..100) for your map
function pxToPct(pointsPx, imgW, imgH) {
  return (pointsPx || []).map((p) => ({
    x: Math.max(0, Math.min(100, (Number(p.x) / imgW) * 100)),
    y: Math.max(0, Math.min(100, (Number(p.y) / imgH) * 100)),
    conf: p.conf ?? null,
  }));
}

export default function ShorelineRiskPage() {
  const [boundary, setBoundary] = useState([]);
  const [shoreline, setShoreline] = useState([]);
  const [nests, setNests] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [crossedBoundary, setCrossedBoundary] = useState(false);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState("");

  // ✅ video states
  const [videoUrl, setVideoUrl] = useState("");
  const [frameSeriesPct, setFrameSeriesPct] = useState([]); // [{t, shorelinePct, risk}]
  const videoRef = useRef(null);

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
          zone: item.label,
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

  // ✅ AUTO LOAD DEMO VIDEO + PREDICTIONS ON PAGE LOAD (NO UPLOAD)
  useEffect(() => {
    // show demo video under map
    setVideoUrl(DEMO_VIDEO_SRC);

    (async () => {
      try {
        setLoading(true);

        // fetch predictions once
        const data = await predictDemoVideo(DEMO_VIDEO_NAME);

        // IMPORTANT:
        // if your backend returns t as frame index, convert to seconds using fps
        // but your response includes fps, so we handle both safely:
        const fps = Number(data?.fps || 30);
        const isFrameIndex =
          Array.isArray(data?.frames) &&
          data.frames.length > 2 &&
          Number.isFinite(Number(data.frames[1]?.t)) &&
          Number(data.frames[1]?.t) > 5; // heuristic

        const series = (data?.frames || [])
          .map((f) => {
            const imgW = f.image?.w || 1920;
            const imgH = f.image?.h || 1080;

            // if t looks like frame index, convert: seconds = t / fps
            const tRaw = Number(f.t || 0);
            const tSec = isFrameIndex ? tRaw / fps : tRaw;

            return {
              t: tSec,
              shorelinePct: pxToPct(f.shoreline_points, imgW, imgH),
              risk: f.risk_level || "medium",
            };
          })
          .filter((f) => (f.shorelinePct || []).length > 1);

        setFrameSeriesPct(series);

        // init map with first frame
        if (series[0]?.shorelinePct) setShoreline(series[0].shorelinePct);

        setLastUpdated(new Date().toLocaleTimeString());
      } catch (e) {
        console.error("Demo video load failed:", e.message || e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // offline evaluation (IMAGE)
  const runOfflineEvaluation = async (file) => {
    setLoading(true);
    try {
      // clear video mode (demo) when user uploads an image
      setVideoUrl(""); // hides video player
      setFrameSeriesPct([]); // clears time series

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

      const freshAlerts = await getAlerts();
      setAlerts(freshAlerts || []);
    } catch (e) {
      console.error(e.message || e);
    } finally {
      setLoading(false);
    }
  };

  // ✅ update shoreline on map as video plays
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;

    const onTimeUpdate = () => {
      if (!frameSeriesPct.length) return;

      const t = v.currentTime;
      let best = frameSeriesPct[0];

      for (const f of frameSeriesPct) {
        if (Math.abs(f.t - t) < Math.abs(best.t - t)) best = f;
      }

      setShoreline(best.shorelinePct || []);
    };

    v.addEventListener("timeupdate", onTimeUpdate);
    v.addEventListener("play", onTimeUpdate);

    return () => {
      v.removeEventListener("timeupdate", onTimeUpdate);
      v.removeEventListener("play", onTimeUpdate);
    };
  }, [frameSeriesPct]);

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
            Demo video shoreline tracking + offline image analysis
          </p>
          {lastUpdated && (
            <p className="text-xs text-gray-500 mt-2">
              Last updated at {lastUpdated}
            </p>
          )}
        </div>

        {/* Upload Image only (video auto demo) */}
        <div className="flex gap-3">
          <label className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-md cursor-pointer">
            <Upload className="w-4 h-4" />
            {loading ? "Processing..." : "Upload Image"}
            <input
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) runOfflineEvaluation(file);
                e.target.value = "";
              }}
            />
          </label>
        </div>
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
          crossedBoundary={crossedBoundary}
        />

        {alerts.length === 0 && (
          <p className="mt-4 text-sm text-gray-500">
            No active shoreline alerts.
          </p>
        )}
      </DashboardCard>

      {/* ✅ Demo Video Playback under Map */}
      {videoUrl && (
        <DashboardCard title="Demo Video Playback (AI Tracking)" icon={Video}>
          <ShorelineVideoPlayer
            videoRef={videoRef}
            src={videoUrl}
            frameSeriesPct={frameSeriesPct}
            onTimeShoreline={(pts) => setShoreline(pts)}
          />

          <p className="mt-3 text-sm text-gray-600">
            As the demo video plays, the shoreline updates on the video overlay
            and on the map.
          </p>

          {frameSeriesPct.length > 0 && (
            <p className="mt-1 text-xs text-gray-500">
              Frames processed: {frameSeriesPct.length}
            </p>
          )}
        </DashboardCard>
      )}
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
