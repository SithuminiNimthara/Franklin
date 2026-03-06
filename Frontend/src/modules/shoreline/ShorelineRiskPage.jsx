import React, { useEffect, useRef, useState } from "react";
import { MapPin, AlertTriangle, Upload, Video } from "lucide-react";

import DashboardCard from "../../shared/components/ui/DashboardCard.jsx";
import ShorelineBeachMap from "../../shared/components/maps/ShorelineBeachMap.jsx";
import ShorelineVideoPlayer from "../shoreline/ShorelineVideoPlayer.jsx";
import ShorelineAlertsPanel from "../shoreline/ShorelineAlertsPanel.jsx";
import EnvironmentManualForm from "../shoreline/EnvironmentManualForm.jsx";
import {
  getBoundary,
  getNests,
  getAlerts,
  predictDemoVideo,
  // ✅ ADD THIS in shorelineApi.js (new endpoint /evaluate-video)
  evaluateVideo,
} from "./api/shorelineApi.js";

import { useAuth } from "@clerk/clerk-react";

const DEMO_VIDEO_SRC = "/videos/shoreline_demo.mp4";
const DEMO_VIDEO_NAME = "shoreline_demo.mp4";

function nestStatusFromDistance(d) {
  if (d == null) return "safe";
  if (d <= 5) return "danger"; // red
  if (d <= 8) return "warning"; // orange
  return "safe";
}

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

  const [videoUrl, setVideoUrl] = useState("");
  const [frameSeriesPct, setFrameSeriesPct] = useState([]); // [{t, shorelinePct, evaluation, risk}]
  const videoRef = useRef(null);

  const { getToken } = useAuth();

  // -------------------------
  // Load static (boundary/nests/alerts)
  // -------------------------
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
          distanceToShoreline: null,
        })),
      );

      // NOTE: your getAlerts returns {items, total...} now
      // so normalize:
      const items = Array.isArray(a?.items)
        ? a.items
        : Array.isArray(a)
          ? a
          : [];
      setAlerts(items);
    } catch (e) {
      console.error("Static load failed:", e);
    }
  };

  useEffect(() => {
    loadStatic();
  }, []);

  // -------------------------
  // Demo video load (existing)
  // -------------------------
  useEffect(() => {
    setVideoUrl(DEMO_VIDEO_SRC);

    (async () => {
      try {
        setLoading(true);

        const data = await predictDemoVideo(DEMO_VIDEO_NAME);
        const fps = Number(data?.fps || 30);

        const isFrameIndex =
          Array.isArray(data?.frames) &&
          data.frames.length > 2 &&
          Number(data.frames[1]?.t) > 5;
        const series = (data?.frames || [])
          .map((f) => {
            const imgW = f.image?.w || 1920;
            const imgH = f.image?.h || 1080;
            const tSec = isFrameIndex
              ? Number(f.t || 0) / fps
              : Number(f.t || 0);

            return {
              t: tSec,
              shorelinePct: pxToPct(f.shoreline_points, imgW, imgH),
              // demo doesn't have evaluation — keep placeholders
              evaluation: null,
              risk: f.risk_level || "medium",
            };
          })
          .filter((f) => (f.shorelinePct || []).length > 1);

        setFrameSeriesPct(series);
        if (series[0]?.shorelinePct) setShoreline(series[0].shorelinePct);

        setLastUpdated(new Date().toLocaleTimeString());
      } catch (e) {
        console.error("Demo load failed:", e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // -------------------------
  // ✅ NEW: Video upload evaluation
  // -------------------------
  const runVideoEvaluation = async (file) => {
    setLoading(true);

    try {
      const token = await getToken();

      // show uploaded video
      const url = URL.createObjectURL(file);
      setVideoUrl(url);

      // clear old frames
      setFrameSeriesPct([]);
      setCrossedBoundary(false);

      // call backend /evaluate-video
      const data = await evaluateVideo(file, 3, token);

      // backend returns frames already with shorelinePct + evaluation + fusion
      const series = (data?.frames || [])
        .map((f) => ({
          t: Number(f.t || 0),
          shorelinePct: f.shorelinePct || [],
          evaluation: f.evaluation || null,
          risk: f?.fusion?.finalRisk || "low",
        }))
        .filter((f) => (f.shorelinePct || []).length > 1);

      setFrameSeriesPct(series);

      // set initial state from first frame
      if (series[0]?.shorelinePct) setShoreline(series[0].shorelinePct);

      const firstEval = series[0]?.evaluation;
      setCrossedBoundary(Boolean(firstEval?.boundaryCrossed));

      // update nests from first frame distances
      const evaluated = firstEval?.nestsEvaluated || [];
      const riskMap = new Map(evaluated.map((n) => [n.id, n.distancePct]));

      setNests((prev) =>
        prev.map((n) => {
          const d = riskMap.get(n.id);
          return {
            ...n,
            distanceToShoreline: d,
            status: nestStatusFromDistance(d),
          };
        }),
      );

      setLastUpdated(new Date().toLocaleTimeString());

      // refresh alerts
      const fresh = await getAlerts();
      const items = Array.isArray(fresh?.items)
        ? fresh.items
        : Array.isArray(fresh)
          ? fresh
          : [];
      setAlerts(items);
    } catch (e) {
      console.error("Video evaluation failed:", e);
    } finally {
      setLoading(false);
    }
  };

  // -------------------------
  // ✅ Sync map + risk while video plays
  // -------------------------
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;

    const pickNearest = (t) => {
      if (!frameSeriesPct.length) return null;
      let best = frameSeriesPct[0];
      for (const f of frameSeriesPct) {
        if (Math.abs(f.t - t) < Math.abs(best.t - t)) best = f;
      }
      return best;
    };

    const onUpdate = () => {
      const frame = pickNearest(v.currentTime);
      if (!frame) return;

      // shoreline line
      setShoreline(frame.shorelinePct || []);

      // if we have evaluation (video upload mode), update risks
      const ev = frame.evaluation;
      if (ev) {
        setCrossedBoundary(Boolean(ev.boundaryCrossed));

        const evaluated = ev.nestsEvaluated || [];
        const riskMap = new Map(evaluated.map((n) => [n.id, n.distancePct]));

        setNests((prev) =>
          prev.map((n) => {
            const d = riskMap.get(n.id);
            return {
              ...n,
              distanceToShoreline: d,
              status: nestStatusFromDistance(d),
            };
          }),
        );
      }
    };

    v.addEventListener("timeupdate", onUpdate);
    v.addEventListener("play", onUpdate);

    return () => {
      v.removeEventListener("timeupdate", onUpdate);
      v.removeEventListener("play", onUpdate);
    };
  }, [frameSeriesPct]);

  // -------------------------
  // Stat counts
  // -------------------------
  const highCount =
    nests.filter((n) => n.status === "danger").length +
    (crossedBoundary ? 1 : 0);

  const mediumCount = nests.filter((n) => n.status === "warning").length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold dark:text-white">Shoreline Risk</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1 text-sm">
            Dynamic tracking of erosion and tide risks
          </p>
          {lastUpdated && (
            <p className="text-[10px] text-gray-400 mt-2 font-bold uppercase tracking-widest">
              Last Update: {lastUpdated}
            </p>
          )}
        </div>

        {/* ✅ VIDEO UPLOAD */}
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-lg cursor-pointer transition-all active:scale-95 text-sm font-bold">
            <Upload className="w-4 h-4" />
            {loading ? "Processing..." : "Analyze Video"}
            <input
              type="file"
              accept="video/*"
              hidden
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) runVideoEvaluation(f);
                e.target.value = "";
              }}
            />
          </label>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat
          color="from-red-500 to-rose-500"
          label="High Risk"
          value={highCount}
        />
        <Stat
          color="from-amber-500 to-orange-500"
          label="Warnings"
          value={mediumCount}
        />
        <Stat
          color="from-cyan-500 to-blue-500"
          label="Monitored"
          value={nests.length}
          icon={<MapPin className="h-6 w-6" />}
        />
        <Stat
          color={
            crossedBoundary
              ? "from-red-700 to-red-900"
              : "from-emerald-500 to-green-600"
          }
          label="Breach Status"
          value={crossedBoundary ? "ALERT" : "SECURE"}
        />
      </div>

      {/* MAIN LAYOUT */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* LEFT SIDE */}
        <div className="xl:col-span-8 space-y-6">
          <DashboardCard
            title="Risk Topography"
            icon={MapPin}
            iconBg="bg-cyan-100 dark:bg-cyan-900/30"
            iconColor="text-cyan-600"
          >
            <ShorelineBeachMap
              boundary={boundary}
              shoreline={shoreline}
              nests={nests}
              crossedBoundary={crossedBoundary}
            />
          </DashboardCard>

          <DashboardCard
            title="Live Tracking"
            icon={Video}
            iconBg="bg-purple-100 dark:bg-purple-900/30"
            iconColor="text-purple-600"
          >
            {videoUrl ? (
              <div className="space-y-4">
                <ShorelineVideoPlayer
                  videoRef={videoRef}
                  src={videoUrl}
                  frameSeriesPct={frameSeriesPct}
                  onTimeShoreline={setShoreline}
                />

                <div className="bg-gray-50 dark:bg-slate-800/50 p-4 rounded-xl border border-gray-100 dark:border-slate-800">
                  <p className="text-xs font-bold text-gray-700 dark:text-gray-300">
                    AI Tracking Process
                  </p>
                  <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-1 italic">
                    Shoreline contours are detected per frame and evaluated
                    against boundary + nest proximity.
                  </p>
                </div>
              </div>
            ) : (
              <div className="py-16 text-center bg-gray-50 dark:bg-slate-900/50 rounded-2xl border-2 border-dashed border-gray-100 dark:border-slate-800">
                <Video className="h-10 w-10 mx-auto text-gray-300 dark:text-gray-700 mb-2" />
                <p className="text-[10px] font-bold text-gray-400 uppercase">
                  Upload a video to analyze
                </p>
              </div>
            )}
          </DashboardCard>
        </div>

        {/* RIGHT SIDE */}
        <div className="xl:col-span-4 space-y-6">
          <ShorelineAlertsPanel staffName="Ranger-01" />
          <EnvironmentManualForm />
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, color, icon }) {
  return (
    <div
      className={`bg-gradient-to-br ${color} rounded-2xl shadow-xl p-5 text-white !text-white [&_*]:!text-white flex items-center justify-between group`}
    >
      <div className="space-y-1">
        <p className="text-xs font-bold opacity-80 uppercase tracking-widest">
          {label}
        </p>
        <p className="text-3xl font-black">{value}</p>
      </div>
      <div className="bg-white/20 p-3 rounded-xl backdrop-blur-md group-hover:scale-110 transition-transform">
        {icon || <AlertTriangle className="h-6 w-6" />}
      </div>
    </div>
  );
}
