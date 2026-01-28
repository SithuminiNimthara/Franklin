import React, { useEffect, useRef, useState } from "react";
import { MapPin, AlertTriangle, Upload, Video, ShieldAlert } from "lucide-react";
import DashboardCard from "../../shared/components/ui/DashboardCard.jsx";
import ShorelineBeachMap from "../../shared/components/maps/ShorelineBeachMap.jsx";
import ShorelineVideoPlayer from "../shoreline/ShorelineVideoPlayer.jsx";
import { getBoundary, getNests, getAlerts, evaluateOffline, predictDemoVideo } from "./api/shorelineApi.js";

const DEMO_VIDEO_SRC = "/videos/shoreline_demo.mp4";
const DEMO_VIDEO_NAME = "shoreline_demo.mp4";

function nestStatusFromDistance(d) {
  if (d == null) return "safe";
  if (d <= 3) return "danger";
  if (d <= 6) return "warning";
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
  const [frameSeriesPct, setFrameSeriesPct] = useState([]);
  const videoRef = useRef(null);

  const loadStatic = async () => {
    try {
      const [b, n, a] = await Promise.all([getBoundary(), getNests(), getAlerts()]);
      setBoundary(b?.points || []);
      setNests((n || []).map((item) => ({ id: item.id, x: item.x, y: item.y, zone: item.label, status: "safe" })));
      setAlerts(a || []);
    } catch (e) {
      console.error("Static load failed:", e);
    }
  };

  useEffect(() => { loadStatic(); }, []);

  useEffect(() => {
    setVideoUrl(DEMO_VIDEO_SRC);
    (async () => {
      try {
        setLoading(true);
        const data = await predictDemoVideo(DEMO_VIDEO_NAME);
        const fps = Number(data?.fps || 30);
        const isFrameIndex = Array.isArray(data?.frames) && data.frames.length > 2 && Number(data.frames[1]?.t) > 5;
        const series = (data?.frames || []).map((f) => {
          const imgW = f.image?.w || 1920;
          const imgH = f.image?.h || 1080;
          const tSec = isFrameIndex ? Number(f.t || 0) / fps : Number(f.t || 0);
          return { t: tSec, shorelinePct: pxToPct(f.shoreline_points, imgW, imgH), risk: f.risk_level || "medium" };
        }).filter((f) => (f.shorelinePct || []).length > 1);
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

  const runOfflineEvaluation = async (file) => {
    setLoading(true);
    try {
      setVideoUrl("");
      setFrameSeriesPct([]);
      const data = await evaluateOffline(file, 3);
      setShoreline(data?.shoreline || []);
      setCrossedBoundary(Boolean(data?.evaluation?.boundaryCrossed));
      const riskMap = new Map();
      for (const n of data?.evaluation?.nestsAtRisk || []) riskMap.set(n.id, n.distancePct);
      setNests((prev) => prev.map((n) => {
        const d = riskMap.get(n.id);
        return { ...n, distanceToShoreline: d, status: nestStatusFromDistance(d) };
      }));
      setLastUpdated(new Date().toLocaleTimeString());
      const freshAlerts = await getAlerts();
      setAlerts(freshAlerts || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const onUpdate = () => {
      if (!frameSeriesPct.length) return;
      const t = v.currentTime;
      let best = frameSeriesPct[0];
      for (const f of frameSeriesPct) if (Math.abs(f.t - t) < Math.abs(best.t - t)) best = f;
      setShoreline(best.shorelinePct || []);
    };
    v.addEventListener("timeupdate", onUpdate);
    return () => v.removeEventListener("timeupdate", onUpdate);
  }, [frameSeriesPct]);

  const highCount = nests.filter((n) => n.status === "danger").length + (crossedBoundary ? 1 : 0);
  const mediumCount = nests.filter((n) => n.status === "warning").length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold dark:text-white">Shoreline Risk</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1 text-sm">Dynamic tracking of erosion and tide risks</p>
          {lastUpdated && <p className="text-[10px] text-gray-400 mt-2 font-bold uppercase tracking-widest">Last Update: {lastUpdated}</p>}
        </div>

        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-lg cursor-pointer transition-all active:scale-95 text-sm font-bold">
            <Upload className="w-4 h-4" />
            {loading ? "Processing..." : "Analyze Image"}
            <input type="file" accept="image/*" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) runOfflineEvaluation(f); e.target.value = ""; }} />
          </label>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat color="from-red-500 to-rose-500" label="High Risk" value={highCount} />
        <Stat color="from-amber-500 to-orange-500" label="Warnings" value={mediumCount} />
        <Stat color="from-cyan-500 to-blue-500" label="Monitored" value={nests.length} icon={<MapPin className="h-6 w-6" />} />
        <Stat color={crossedBoundary ? "from-red-700 to-red-900" : "from-emerald-500 to-green-600"} label="Breach Status" value={crossedBoundary ? "ALERT" : "SECURE"} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2">
          <DashboardCard title="Risk Topography" icon={MapPin} iconBg="bg-cyan-100 dark:bg-cyan-900/30" iconColor="text-cyan-600">
            <ShorelineBeachMap boundary={boundary} shoreline={shoreline} nests={nests} crossedBoundary={crossedBoundary} />
          </DashboardCard>
        </div>

        <div className="space-y-6">
          <DashboardCard title="Live Tracking" icon={Video} iconBg="bg-purple-100 dark:bg-purple-900/30" iconColor="text-purple-600">
            {videoUrl ? (
              <div className="space-y-4">
                <div className="rounded-2xl overflow-hidden shadow-xl border-4 border-white dark:border-slate-800 bg-black aspect-video">
                  <ShorelineVideoPlayer videoRef={videoRef} src={videoUrl} frameSeriesPct={frameSeriesPct} onTimeShoreline={setShoreline} />
                </div>
                <div className="bg-gray-50 dark:bg-slate-800/50 p-4 rounded-xl border border-gray-100 dark:border-slate-800">
                  <p className="text-xs font-bold text-gray-700 dark:text-gray-300">AI Tracking Process</p>
                  <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-1 italic">Shoreline contours are detected in real-time and projected onto the topography map above.</p>
                </div>
              </div>
            ) : (
              <div className="py-20 text-center bg-gray-50 dark:bg-slate-900/50 rounded-2xl border-2 border-dashed border-gray-100 dark:border-slate-800">
                <Video className="h-10 w-10 mx-auto text-gray-300 dark:text-gray-700 mb-2" />
                <p className="text-[10px] font-bold text-gray-400 uppercase">Input Image Mode</p>
              </div>
            )}
          </DashboardCard>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, color, icon }) {
  return (
    <div className={`bg-gradient-to-br ${color} rounded-2xl shadow-xl p-5 text-white !text-white [&_*]:!text-white flex items-center justify-between group`}>
      <div className="space-y-1">
        <p className="text-xs font-bold opacity-80 uppercase tracking-widest">{label}</p>
        <p className="text-3xl font-black">{value}</p>
      </div>
      <div className="bg-white/20 p-3 rounded-xl backdrop-blur-md group-hover:scale-110 transition-transform">
        {icon || <AlertTriangle className="h-6 w-6" />}
      </div>
    </div>
  );
}
