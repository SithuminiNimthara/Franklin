import { MOCK_NESTS } from "../../../shared/data/mockNests";

export const DEMO_VIDEO_SRC = "/videos/shoreline_demo.mp4";
export const DEMO_VIDEO_NAME = "shoreline_demo.mp4";
export const DEFAULT_VIDEO_FPS = 30;

export function getNestStatusFromDistance(distancePct) {
  if (distancePct == null) return "safe";
  if (distancePct <= 5) return "danger";
  if (distancePct <= 8) return "warning";
  return "safe";
}

export function convertPixelsToPercent(pointsPx = [], imageWidth, imageHeight) {
  return pointsPx.map((point) => ({
    x: Math.max(0, Math.min(100, (Number(point.x) / imageWidth) * 100)),
    y: Math.max(0, Math.min(100, (Number(point.y) / imageHeight) * 100)),
    conf: point.conf ?? null,
  }));
}

export function buildSharedNestState() {
  return MOCK_NESTS.map((nest) => ({
    id: nest.nestNo,
    x: nest.x,
    y: nest.y,
    zone: nest.locationName,
    label: nest.locationName,
    status: nest.status || "safe",
    distanceToShoreline: null,
  }));
}

export function normalizeAlertItems(alertData) {
  if (Array.isArray(alertData?.items)) return alertData.items;
  if (Array.isArray(alertData)) return alertData;
  return [];
}

export function findNearestFrame(currentTime, frameSeries = []) {
  if (!frameSeries.length) return null;

  let nearestFrame = frameSeries[0];

  for (const frame of frameSeries) {
    if (
      Math.abs(frame.t - currentTime) < Math.abs(nearestFrame.t - currentTime)
    ) {
      nearestFrame = frame;
    }
  }

  return nearestFrame;
}

export function buildDemoFrameSeries(demoData) {
  const fps = Number(demoData?.fps || DEFAULT_VIDEO_FPS);

  const isFrameIndex =
    Array.isArray(demoData?.frames) &&
    demoData.frames.length > 2 &&
    Number(demoData.frames[1]?.t) > 5;

  return (demoData?.frames || [])
    .map((frame) => {
      const imageWidth = frame.image?.w || 1920;
      const imageHeight = frame.image?.h || 1080;
      const timeInSeconds = isFrameIndex
        ? Number(frame.t || 0) / fps
        : Number(frame.t || 0);

      return {
        t: timeInSeconds,
        shorelinePct: convertPixelsToPercent(
          frame.shoreline_points,
          imageWidth,
          imageHeight,
        ),
        evaluation: null,
        risk: frame.risk_level || "medium",
      };
    })
    .filter((frame) => frame.shorelinePct.length > 1);
}

export function buildEvaluatedFrameSeries(videoData) {
  return (videoData?.frames || [])
    .map((frame) => ({
      t: Number(frame.t || 0),
      shorelinePct: frame.shorelinePct || [],
      evaluation: frame.evaluation || null,
      risk: frame?.fusion?.finalRisk || "low",
    }))
    .filter((frame) => frame.shorelinePct.length > 1);
}

export function countHighRiskNests(nests = [], crossedBoundary = false) {
  return (
    nests.filter((nest) => nest.status === "danger").length +
    (crossedBoundary ? 1 : 0)
  );
}

export function countMediumRiskNests(nests = []) {
  return nests.filter((nest) => nest.status === "warning").length;
}
