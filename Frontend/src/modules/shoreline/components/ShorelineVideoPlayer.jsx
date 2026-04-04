import React, { useCallback, useEffect, useRef } from "react";
import { SHORELINE_COLORS } from "../constants/shorelineTheme.jsx";
import { findNearestFrame } from "../utils/shoreline.utils.js";

const LOW_CONFIDENCE_THRESHOLD = 0.7;
const DEFAULT_RISK_LEVEL = "low";

function getRiskColor(riskLevel) {
  switch (riskLevel) {
    case "high":
      return SHORELINE_COLORS.danger;
    case "medium":
      return SHORELINE_COLORS.warning;
    default:
      return SHORELINE_COLORS.info;
  }
}

function drawPolylinePath(context, points, width, height, color) {
  context.beginPath();

  points.forEach((point, index) => {
    const x = (point.x / 100) * width;
    const y = (point.y / 100) * height;

    if (index === 0) {
      context.moveTo(x, y);
    } else {
      context.lineTo(x, y);
    }
  });

  context.lineWidth = 8;
  context.strokeStyle = `${color}40`;
  context.stroke();

  context.beginPath();

  points.forEach((point, index) => {
    const x = (point.x / 100) * width;
    const y = (point.y / 100) * height;

    if (index === 0) {
      context.moveTo(x, y);
    } else {
      context.lineTo(x, y);
    }
  });

  context.lineWidth = 2.5;
  context.strokeStyle = color;
  context.stroke();
}

function drawLowConfidencePoints(context, points, width, height) {
  points.forEach((point) => {
    if (point.conf != null && point.conf < LOW_CONFIDENCE_THRESHOLD) {
      context.beginPath();
      context.arc(
        (point.x / 100) * width,
        (point.y / 100) * height,
        3,
        0,
        Math.PI * 2,
      );
      context.fillStyle = "#f59e0bcc";
      context.fill();
    }
  });
}

export default function ShorelineVideoPlayer({
  src,
  frameSeriesPct = [],
  onTimeShoreline,
  videoRef,
}) {
  const internalVideoRef = useRef(null);
  const canvasRef = useRef(null);
  const resolvedVideoRef = videoRef || internalVideoRef;

  const renderOverlay = useCallback(
    (points, riskLevel = DEFAULT_RISK_LEVEL) => {
      const videoElement = resolvedVideoRef.current;
      const canvasElement = canvasRef.current;

      if (!videoElement || !canvasElement) return;

      const context = canvasElement.getContext("2d");
      const width = videoElement.clientWidth;
      const height = videoElement.clientHeight;

      if (!context || !width || !height) return;

      canvasElement.width = width;
      canvasElement.height = height;
      context.clearRect(0, 0, width, height);

      if (!Array.isArray(points) || points.length < 2) return;

      const riskColor = getRiskColor(riskLevel);

      drawPolylinePath(context, points, width, height, riskColor);
      drawLowConfidencePoints(context, points, width, height);
    },
    [resolvedVideoRef],
  );

  useEffect(() => {
    const videoElement = resolvedVideoRef.current;
    if (!videoElement) return;

    const updateOverlay = () => {
      const currentFrame = findNearestFrame(
        videoElement.currentTime,
        frameSeriesPct,
      );
      const shorelinePoints = currentFrame?.shorelinePct || [];

      onTimeShoreline?.(shorelinePoints);
      renderOverlay(shorelinePoints, currentFrame?.risk);
    };

    const handleResize = () => {
      const currentFrame = findNearestFrame(
        videoElement.currentTime,
        frameSeriesPct,
      );
      renderOverlay(currentFrame?.shorelinePct || [], currentFrame?.risk);
    };

    videoElement.addEventListener("timeupdate", updateOverlay);
    videoElement.addEventListener("play", updateOverlay);
    videoElement.addEventListener("loadedmetadata", updateOverlay);
    window.addEventListener("resize", handleResize);

    return () => {
      videoElement.removeEventListener("timeupdate", updateOverlay);
      videoElement.removeEventListener("play", updateOverlay);
      videoElement.removeEventListener("loadedmetadata", updateOverlay);
      window.removeEventListener("resize", handleResize);
    };
  }, [frameSeriesPct, onTimeShoreline, renderOverlay, resolvedVideoRef]);

  return (
    <div className="relative w-full overflow-hidden rounded-2xl border border-[#dbe7f3] bg-black shadow-sm">
      <video
        ref={resolvedVideoRef}
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
