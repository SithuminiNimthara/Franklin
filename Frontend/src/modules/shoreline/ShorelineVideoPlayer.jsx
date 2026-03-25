import React, { useEffect, useRef } from "react";
import { COLORS } from "./shorelineTheme.jsx";

export default function ShorelineVideoPlayer({
  src,
  frameSeriesPct = [],
  onTimeShoreline,
  videoRef,
}) {
  const localVideoRef = useRef(null);
  const canvasRef = useRef(null);
  const vref = videoRef || localVideoRef;

  function riskColor(risk) {
    if (risk === "high") return COLORS.danger;
    if (risk === "medium") return COLORS.warning;
    return COLORS.info;
  }

  const drawPolyline = (pts, risk = "low") => {
    const v = vref.current;
    const c = canvasRef.current;
    if (!v || !c) return;

    const ctx = c.getContext("2d");
    const w = v.clientWidth;
    const h = v.clientHeight;
    if (!w || !h) return;

    c.width = w;
    c.height = h;
    ctx.clearRect(0, 0, w, h);

    if (!pts || pts.length < 2) return;

    const color = riskColor(risk);

    ctx.beginPath();
    pts.forEach((p, i) => {
      const x = (p.x / 100) * w;
      const y = (p.y / 100) * h;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.lineWidth = 8;
    ctx.strokeStyle = `${color}40`;
    ctx.stroke();

    ctx.beginPath();
    pts.forEach((p, i) => {
      const x = (p.x / 100) * w;
      const y = (p.y / 100) * h;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = color;
    ctx.stroke();

    pts.forEach((p) => {
      if (p.conf != null && p.conf < 0.7) {
        ctx.beginPath();
        ctx.arc((p.x / 100) * w, (p.y / 100) * h, 3, 0, Math.PI * 2);
        ctx.fillStyle = "#f59e0bcc";
        ctx.fill();
      }
    });
  };

  const pickNearestFrame = (t) => {
    if (!frameSeriesPct.length) return null;
    let best = frameSeriesPct[0];
    for (const f of frameSeriesPct) {
      if (Math.abs(f.t - t) < Math.abs(best.t - t)) best = f;
    }
    return best;
  };

  useEffect(() => {
    const v = vref.current;
    if (!v) return;

    const onTimeUpdate = () => {
      const frame = pickNearestFrame(v.currentTime);
      const pts = frame?.shorelinePct || [];
      onTimeShoreline?.(pts);
      drawPolyline(pts, frame?.risk);
    };

    const onResize = () => {
      const frame = pickNearestFrame(v.currentTime);
      drawPolyline(frame?.shorelinePct || [], frame?.risk);
    };

    v.addEventListener("timeupdate", onTimeUpdate);
    v.addEventListener("play", onTimeUpdate);
    v.addEventListener("loadedmetadata", onTimeUpdate);
    window.addEventListener("resize", onResize);

    return () => {
      v.removeEventListener("timeupdate", onTimeUpdate);
      v.removeEventListener("play", onTimeUpdate);
      v.removeEventListener("loadedmetadata", onTimeUpdate);
      window.removeEventListener("resize", onResize);
    };
  }, [frameSeriesPct, onTimeShoreline]);

  return (
    <div className="relative w-full overflow-hidden rounded-2xl border border-[#dbe7f3] bg-black shadow-sm">
      <video
        ref={vref}
        src={src}
        controls
        autoPlay
        loop
        muted
        playsInline
        className="block h-auto w-full"
      />
      <canvas
        ref={canvasRef}
        className="pointer-events-none absolute inset-0"
        style={{ width: "100%", height: "100%" }}
      />
    </div>
  );
}
