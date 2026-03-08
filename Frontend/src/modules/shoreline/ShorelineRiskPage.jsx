import React, { useEffect, useRef, useState } from "react";
import {
  MapPin,
  AlertTriangle,
  Upload,
  Video,
  Activity,
  Shield,
  ShieldAlert,
  Zap,
  CloudRain,
  Waves,
} from "lucide-react";

import ShorelineBeachMap from "../../shared/components/maps/ShorelineBeachMap.jsx";
import ShorelineVideoPlayer from "../shoreline/ShorelineVideoPlayer.jsx";
import ShorelineAlertsPanel from "../shoreline/ShorelineAlertsPanel.jsx";
import EnvironmentManualForm from "../shoreline/EnvironmentManualForm.jsx";
import { COLORS, SectionHeader, LiveDot, Panel } from "./shorelineTheme.jsx";
import {
  getBoundary,
  getNests,
  getAlerts,
  predictDemoVideo,
  evaluateVideo,
} from "./api/shorelineApi.js";

import { useAuth } from "@clerk/clerk-react";

const DEMO_VIDEO_SRC = "/videos/shoreline_demo.mp4";
const DEMO_VIDEO_NAME = "shoreline_demo.mp4";

function nestStatusFromDistance(d) {
  if (d == null) return "safe";
  if (d <= 5) return "danger";
  if (d <= 8) return "warning";
  return "safe";
}

function pxToPct(pointsPx, imgW, imgH) {
  return (pointsPx || []).map((p) => ({
    x: Math.max(0, Math.min(100, (Number(p.x) / imgW) * 100)),
    y: Math.max(0, Math.min(100, (Number(p.y) / imgH) * 100)),
    conf: p.conf ?? null,
  }));
}

function StatCard({
  label,
  value,
  sub,
  accent,
  softBg,
  borderColor,
  icon: Icon,
  pulse,
}) {
  return (
    <div
      className="relative overflow-hidden rounded-2xl p-5 shadow-sm transition-all hover:shadow-md"
      style={{
        backgroundColor: softBg,
        border: `1px solid ${borderColor}`,
      }}
    >
      <div
        className="absolute left-0 top-0 h-1 w-full"
        style={{ backgroundColor: accent }}
      />

      <div className="flex items-start justify-between">
        <div
          className="flex h-11 w-11 items-center justify-center rounded-xl"
          style={{
            backgroundColor: "#ffffffcc",
            color: accent,
          }}
        >
          <Icon size={18} />
        </div>

        {pulse && <LiveDot color={accent} />}
      </div>

      <div className="mt-4">
        <p
          className="text-3xl font-bold tracking-tight"
          style={{ color: accent }}
        >
          {value}
        </p>

        <p className="mt-1 text-xs font-semibold uppercase tracking-[0.12em] text-slate-600">
          {label}
        </p>

        {sub && <p className="mt-1 text-xs text-slate-500">{sub}</p>}
      </div>
    </div>
  );
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
  const [frameSeriesPct, setFrameSeriesPct] = useState([]);
  const [currentEnvironment, setCurrentEnvironment] = useState(null);

  const videoRef = useRef(null);
  const { getToken } = useAuth();

  const playVideoFromStart = () => {
    setTimeout(() => {
      const v = videoRef.current;
      if (!v) return;
      v.currentTime = 0;
      v.play().catch(() => {});
    }, 150);
  };

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
              evaluation: null,
              risk: f.risk_level || "medium",
            };
          })
          .filter((f) => (f.shorelinePct || []).length > 1);

        setFrameSeriesPct(series);
        if (series[0]?.shorelinePct) setShoreline(series[0].shorelinePct);
        setLastUpdated(new Date().toLocaleTimeString());
        playVideoFromStart();
      } catch (e) {
        console.error("Demo load failed:", e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const runVideoEvaluation = async (file) => {
    setLoading(true);
    try {
      const token = await getToken();
      const objectUrl = URL.createObjectURL(file);

      setVideoUrl(objectUrl);
      setFrameSeriesPct([]);
      setCrossedBoundary(false);

      const data = await evaluateVideo(file, 3, token);

      const series = (data?.frames || [])
        .map((f) => ({
          t: Number(f.t || 0),
          shorelinePct: f.shorelinePct || [],
          evaluation: f.evaluation || null,
          risk: f?.fusion?.finalRisk || "low",
        }))
        .filter((f) => (f.shorelinePct || []).length > 1);

      setFrameSeriesPct(series);

      if (series[0]?.shorelinePct) setShoreline(series[0].shorelinePct);

      const firstEval = series[0]?.evaluation;
      setCrossedBoundary(Boolean(firstEval?.boundaryCrossed));

      const riskMap = new Map(
        (firstEval?.nestsEvaluated || []).map((n) => [n.id, n.distancePct]),
      );

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

      const fresh = await getAlerts();
      const items = Array.isArray(fresh?.items)
        ? fresh.items
        : Array.isArray(fresh)
          ? fresh
          : [];

      setAlerts(items);
      playVideoFromStart();
    } catch (e) {
      console.error("Video evaluation failed:", e);
    } finally {
      setLoading(false);
    }
  };

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

      setShoreline(frame.shorelinePct || []);
      const ev = frame.evaluation;

      if (ev) {
        setCrossedBoundary(Boolean(ev.boundaryCrossed));
        const riskMap = new Map(
          (ev.nestsEvaluated || []).map((n) => [n.id, n.distancePct]),
        );

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

  const highCount =
    nests.filter((n) => n.status === "danger").length +
    (crossedBoundary ? 1 : 0);

  const mediumCount = nests.filter((n) => n.status === "warning").length;

  return (
    <div
      className="min-h-screen space-y-6 bg-[#f4f7fb] p-4 md:p-6 lg:p-8"
      style={{ fontFamily: "'Inter', system-ui, sans-serif" }}
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <LiveDot color={COLORS.success} />
            <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
              Live Monitoring · {lastUpdated || "—"}
            </span>
          </div>

          <h1 className="text-3xl font-bold text-slate-900 md:text-4xl">
            Shoreline Risk Monitoring
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Dynamic shoreline tracking, boundary breach detection, and nest risk
            evaluation
          </p>
        </div>

        <label className="inline-flex cursor-pointer items-center gap-2 self-start rounded-xl bg-gradient-to-r from-[#2563eb] to-[#06b6d4] px-5 py-3 font-semibold text-white shadow-md transition hover:shadow-lg lg:self-auto">
          {loading ? (
            <Activity size={16} className="animate-pulse" />
          ) : (
            <Upload size={16} />
          )}
          {loading ? "Analyzing..." : "Analyze Video"}
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

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="High Risk"
          value={highCount}
          sub="nests + boundary breach"
          accent="#ef4444"
          softBg="#fef2f2"
          borderColor="#fecaca"
          icon={AlertTriangle}
          pulse={highCount > 0}
        />

        <StatCard
          label="Warnings"
          value={mediumCount}
          sub="within threshold"
          accent="#f59e0b"
          softBg="#fffbeb"
          borderColor="#fde68a"
          icon={MapPin}
          pulse={mediumCount > 0}
        />

        <StatCard
          label="Monitored"
          value={nests.length}
          sub="active nest sites"
          accent="#0ea5e9"
          softBg="#f0f9ff"
          borderColor="#bae6fd"
          icon={MapPin}
        />

        <StatCard
          label="Boundary"
          value={crossedBoundary ? "BREACH" : "SECURE"}
          sub={
            crossedBoundary ? "immediate response needed" : "within safe range"
          }
          accent={crossedBoundary ? "#ef4444" : "#16a34a"}
          softBg={crossedBoundary ? "#fef2f2" : "#f0fdf4"}
          borderColor={crossedBoundary ? "#fecaca" : "#bbf7d0"}
          icon={crossedBoundary ? ShieldAlert : Shield}
          pulse={crossedBoundary}
        />
      </div>

      {currentEnvironment && (
        <div className="rounded-2xl border border-sky-200 bg-sky-50 p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-sky-700">
            Active Environment Reading
          </p>

          <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-slate-700">
            <span>{currentEnvironment.station || "Unknown station"}</span>

            <span className="inline-flex items-center gap-1.5">
              <CloudRain size={14} className="text-sky-600" />
              Rain 3h: {currentEnvironment?.rain?.last3h_mm ?? "N/A"} mm
            </span>

            <span className="inline-flex items-center gap-1.5">
              <CloudRain size={14} className="text-sky-600" />
              Rain 6h: {currentEnvironment?.rain?.next6h_mm ?? "N/A"} mm
            </span>

            <span className="inline-flex items-center gap-1.5">
              <Waves size={14} className="text-indigo-600" />
              Tide: {currentEnvironment?.tide?.height_m ?? "N/A"} m
            </span>

            <span>Trend: {currentEnvironment?.tide?.trend ?? "unknown"}</span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        <div className="space-y-4 xl:col-span-8">
          <Panel>
            <SectionHeader
              icon={MapPin}
              title="Risk Topography"
              accent={COLORS.primary}
            />
            <ShorelineBeachMap
              boundary={boundary}
              shoreline={shoreline}
              nests={nests}
              crossedBoundary={crossedBoundary}
            />
          </Panel>

          <Panel>
            <SectionHeader
              icon={Video}
              title="Live Tracking"
              accent="#8b5cf6"
            />

            {videoUrl ? (
              <div className="space-y-4">
                <ShorelineVideoPlayer
                  videoRef={videoRef}
                  src={videoUrl}
                  frameSeriesPct={frameSeriesPct}
                  onTimeShoreline={setShoreline}
                />

                <div className="flex items-start gap-3 rounded-xl border border-violet-100 bg-violet-50 p-3">
                  <div className="mt-0.5 text-violet-600">
                    <Zap size={15} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-violet-700">
                      AI Tracking Process
                    </p>
                    <p className="mt-1 text-[12px] leading-relaxed text-slate-600">
                      Shoreline contours are detected frame by frame and
                      evaluated against protected boundary lines and nest
                      proximity thresholds.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex h-[220px] flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed border-[#dbe7f3] bg-[#f8fbff]">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                  <Video size={28} />
                </div>
                <p className="text-sm font-semibold text-slate-600">
                  Upload footage to begin shoreline analysis
                </p>
              </div>
            )}
          </Panel>
        </div>

        <div className="space-y-4 xl:col-span-4">
          <ShorelineAlertsPanel staffName="Ranger-01" initialItems={alerts} />
          <EnvironmentManualForm onSaved={setCurrentEnvironment} />
        </div>
      </div>
    </div>
  );
}
