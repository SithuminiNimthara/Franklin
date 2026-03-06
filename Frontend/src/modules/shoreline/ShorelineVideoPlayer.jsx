// ShorelineVideoPlayer.jsx
import React, { useEffect, useRef } from "react";

/**
 * Props:
 * - src: video url (object URL)
 * - frameSeriesPct: [{ t, shorelinePct: [{x,y}], risk }]
 * - onTimeShoreline: (pts) => void
 * - videoRef: ref from parent (optional)
 */
export default function ShorelineVideoPlayer({
  src,
  frameSeriesPct = [],
  onTimeShoreline,
  videoRef,
}) {
  const localVideoRef = useRef(null);
  const canvasRef = useRef(null);

  const vref = videoRef || localVideoRef;

  const drawPolyline = (pts) => {
    const v = vref.current;
    const c = canvasRef.current;
    if (!v || !c) return;

    const ctx = c.getContext("2d");

    // match canvas to displayed video size
    const w = v.clientWidth;
    const h = v.clientHeight;
    if (!w || !h) return;

    c.width = w;
    c.height = h;

    ctx.clearRect(0, 0, w, h);

    if (!pts || pts.length < 2) return;

    ctx.beginPath();
    for (let i = 0; i < pts.length; i++) {
      const x = (pts[i].x / 100) * w;
      const y = (pts[i].y / 100) * h;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }

    ctx.lineWidth = 3;
    ctx.strokeStyle = "rgba(0, 120, 255, 0.95)";
    ctx.stroke();
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

      // update parent map
      onTimeShoreline?.(pts);

      // draw overlay
      drawPolyline(pts);
    };

    const onResize = () => {
      const frame = pickNearestFrame(v.currentTime);
      drawPolyline(frame?.shorelinePct || []);
    };

    v.addEventListener("timeupdate", onTimeUpdate);
    v.addEventListener("play", onTimeUpdate);
    window.addEventListener("resize", onResize);

    // draw once after metadata loads (so sizes exist)
    const onLoaded = () => onTimeUpdate();
    v.addEventListener("loadedmetadata", onLoaded);

    return () => {
      v.removeEventListener("timeupdate", onTimeUpdate);
      v.removeEventListener("play", onTimeUpdate);
      v.removeEventListener("loadedmetadata", onLoaded);
      window.removeEventListener("resize", onResize);
    };
  }, [frameSeriesPct, onTimeShoreline]);

  return (
    <div className="relative w-full rounded-2xl overflow-hidden border bg-black">
      <video ref={vref} src={src} controls className="w-full h-auto block" />
      <canvas
        ref={canvasRef}
        className="absolute inset-0 pointer-events-none"
      />
    </div>
  );
}
