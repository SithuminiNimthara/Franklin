// shoreline.controller.js
import sharp from "sharp";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

import { readJson, writeJson, nowIso, ensureDir } from "./utils/file.util.js";
import { clamp } from "./utils/geo.util.js";
import { uid } from "./utils/id.util.js";
import { getUserPrimaryEmail } from "./utils/clerk.util.js";

import { predictViaPython } from "./services/python.service.js";
import { evaluateRisk } from "./services/risk.service.js";

import {
  sortByX,
  trimEdges,
  downsample,
  smoothY,
} from "./utils/polyline.util.js";

import { DATA_DIR, BOUNDARY_FILE, NESTS_FILE } from "./config/paths.js";

// MongoDB Alert model
import Alert from "./models/alert.model.js";

// Socket.IO
import { io } from "../../server.js";

// Environment
import { getCurrentEnvironment } from "../environment/services/environment.service.js";
import { environmentScore } from "./services/environmentRisk.service.js";
import { notifyIfAllowed } from "./services/shorelineNotify.service.js";

// python base url
const PY_INFER_URL =
  process.env.PY_INFER_URL || "http://127.0.0.1:8000/ai/shoreline";

// resolve this module directory (ESM-safe)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// demo video folder inside shoreline module
const DEMO_VIDEO_DIR = path.join(__dirname, "data", "demo_videos");

/** Bootstrap defaults (boundary + nests only) */
function ensureDefaults() {
  ensureDir(DATA_DIR);

  const boundary = readJson(BOUNDARY_FILE, null);
  if (!boundary) {
    writeJson(BOUNDARY_FILE, {
      updatedAt: nowIso(),
      marginPct: 1.0,
      points: [
        { x: 5, y: 60 },
        { x: 30, y: 58 },
        { x: 60, y: 62 },
        { x: 95, y: 65 },
      ],
    });
  }

  const nests = readJson(NESTS_FILE, null);
  if (!Array.isArray(nests)) {
    writeJson(NESTS_FILE, [
      { id: "nest-1", label: "Nest #234", x: 10, y: 46 },
      { id: "nest-2", label: "Nest #189", x: 18, y: 48 },
      { id: "nest-3", label: "Nest #201", x: 70, y: 60 },
    ]);
  }
}
ensureDefaults();

/** ---------- Helpers ---------- */
function classifyNestThreat(distancePct) {
  if (distancePct == null || !Number.isFinite(Number(distancePct))) {
    return "safe";
  }

  const d = Number(distancePct);

  if (d <= 5) return "high";
  if (d <= 8) return "medium";
  return "safe";
}

function summarizeNestThreat(evaluation) {
  const nests = evaluation?.nestsEvaluated || [];

  const threatened = nests
    .map((n) => ({
      ...n,
      threatLevel: classifyNestThreat(n.distancePct),
    }))
    .filter((n) => n.threatLevel !== "safe");

  const highThreats = threatened.filter((n) => n.threatLevel === "high");
  const mediumThreats = threatened.filter((n) => n.threatLevel === "medium");

  let alertRisk = "low";

  if (evaluation?.boundaryCrossed || highThreats.length > 0) {
    alertRisk = "high";
  } else if (mediumThreats.length > 0) {
    alertRisk = "medium";
  }

  return {
    alertRisk,
    threatened,
    highThreats,
    mediumThreats,
  };
}

function buildEnvironmentFallback() {
  return {
    source: "manual",
    quality: "unknown",
    observedAt: new Date(),
    tide: { height_m: null, trend: "unknown", nextHighTideAt: null },
    rain: { last3h_mm: null, next6h_mm: null },
  };
}

function buildProfessionalAlertContent({
  isVideo = false,
  boundaryCrossed = false,
  backendRiskLevel = "low",
}) {
  const prefix = isVideo ? "Video: " : "";

  if (boundaryCrossed) {
    return {
      message: `${prefix}Critical shoreline breach detected`,
      summary:
        "The detected shoreline has crossed the defined hazard boundary, indicating immediate flooding exposure to the protected nesting zone.",
      riskReason:
        "Sea movement has advanced beyond the safety boundary, increasing the likelihood of nest inundation and habitat disturbance.",
      recommendedAction:
        "Immediate site inspection is recommended. Assess vulnerable nests and prepare relocation or protective intervention if shoreline advance continues.",
    };
  }

  if (backendRiskLevel === "high") {
    return {
      message: `${prefix}Critical nest threat detected near shoreline`,
      summary:
        "One or more nests are within the critical shoreline proximity threshold and may be exposed to wave reach or sudden shoreline advance.",
      riskReason:
        "The shoreline has approached the nesting area closely enough to create an immediate threat to hatchling survival and nest stability.",
      recommendedAction:
        "Urgent field verification is recommended. Prioritize inspection of the identified nests and consider emergency protection measures.",
    };
  }

  if (backendRiskLevel === "medium") {
    return {
      message: `${prefix}Shoreline approaching protected nests`,
      summary:
        "The shoreline is moving closer to one or more monitored nests and has entered the warning range.",
      riskReason:
        "Although the hazard boundary has not yet been crossed, continued shoreline movement may escalate the threat to nearby nests.",
      recommendedAction:
        "Continue close monitoring and prepare precautionary intervention if the shoreline advances further.",
    };
  }

  return {
    message: `${prefix}Shoreline conditions normal`,
    summary: "No immediate shoreline threat has been detected.",
    riskReason:
      "Current shoreline position remains within acceptable safety limits.",
    recommendedAction: "Continue routine monitoring.",
  };
}

/** Boundary APIs */
export function getBoundary(req, res) {
  const boundary = readJson(BOUNDARY_FILE, null);
  res.json(boundary);
}

export function updateBoundary(req, res) {
  const { points, marginPct } = req.body || {};
  if (!Array.isArray(points) || points.length < 2) {
    return res
      .status(400)
      .json({ detail: "boundary points[] (min 2) required" });
  }

  const clean = points
    .map((p) => ({
      x: clamp(Number(p.x), 0, 100),
      y: clamp(Number(p.y), 0, 100),
    }))
    .sort((a, b) => a.x - b.x);

  const boundary = {
    updatedAt: nowIso(),
    marginPct: Number.isFinite(Number(marginPct)) ? Number(marginPct) : 1.0,
    points: clean,
  };

  writeJson(BOUNDARY_FILE, boundary);
  res.json(boundary);
}

/** Nest APIs */
export function getNests(req, res) {
  const nests = readJson(NESTS_FILE, []);
  res.json(nests);
}

export function addNest(req, res) {
  const { label, x, y } = req.body || {};
  if (!label || x == null || y == null) {
    return res.status(400).json({ detail: "label, x, y required" });
  }

  const nests = readJson(NESTS_FILE, []);
  const nest = {
    id: uid(),
    label: String(label),
    x: clamp(Number(x), 0, 100),
    y: clamp(Number(y), 0, 100),
  };

  nests.push(nest);
  writeJson(NESTS_FILE, nests);
  res.json(nest);
}

export function deleteNest(req, res) {
  const id = req.params.id;
  const nests = readJson(NESTS_FILE, []);
  const next = nests.filter((n) => n.id !== id);
  writeJson(NESTS_FILE, next);
  res.json({ status: "ok", deleted: id });
}

/** Predict proxy (IMAGE) */
export async function predictProxy(req, res) {
  try {
    if (!req.file) return res.status(400).json({ detail: "file is required" });

    const { status, body } = await predictViaPython(
      req.file.buffer,
      req.file.originalname || "frame.jpg",
      req.file.mimetype || "image/jpeg",
    );

    return res.status(status).json(body);
  } catch (e) {
    console.error("predict proxy failed:", e);
    return res.status(500).json({ detail: "Proxy inference failed" });
  }
}

/** Predict VIDEO proxy (UPLOAD) */
export async function predictVideoProxy(req, res) {
  try {
    if (!req.file) return res.status(400).json({ detail: "file is required" });

    const form = new FormData();
    const blob = new Blob([req.file.buffer], { type: req.file.mimetype });
    form.append("file", blob, req.file.originalname || "video.mp4");

    const pyRes = await fetch(`${PY_INFER_URL}/predict-video`, {
      method: "POST",
      body: form,
    });

    const text = await pyRes.text();
    let json = null;
    try {
      json = JSON.parse(text);
    } catch {}

    return res.status(pyRes.status).json(json ?? { detail: text });
  } catch (e) {
    console.error("predictVideoProxy failed:", e);
    return res.status(500).json({ detail: "Video proxy inference failed" });
  }
}

/** Predict VIDEO DEMO (NO UPLOAD) */
export async function predictVideoDemo(req, res) {
  try {
    const name = String(req.query.name || "shoreline_demo.mp4");
    const videoPath = path.join(DEMO_VIDEO_DIR, name);

    if (!fs.existsSync(videoPath)) {
      return res.status(404).json({
        detail: `Demo video not found: ${name}`,
        expectedPath: videoPath,
      });
    }

    const buffer = fs.readFileSync(videoPath);

    const form = new FormData();
    const blob = new Blob([buffer], { type: "video/mp4" });
    form.append("file", blob, name);

    const pyRes = await fetch(`${PY_INFER_URL}/predict-video`, {
      method: "POST",
      body: form,
    });

    const text = await pyRes.text();
    let json = null;
    try {
      json = JSON.parse(text);
    } catch {}

    return res.status(pyRes.status).json(json ?? { detail: text });
  } catch (e) {
    console.error("predictVideoDemo failed:", e);
    return res.status(500).json({ detail: "Demo video inference failed" });
  }
}

/** Evaluate Offline (IMAGE) */
export async function evaluateOffline(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({
        detail: "image file is required (field name must be 'file')",
        gotContentType: req.headers["content-type"] || null,
      });
    }

    const meta = await sharp(req.file.buffer).metadata();
    const imgW = meta.width || 1920;
    const imgH = meta.height || 1080;

    const { status, body } = await predictViaPython(
      req.file.buffer,
      req.file.originalname || "offline.jpg",
      req.file.mimetype || "image/jpeg",
    );
    if (status !== 200) return res.status(status).json(body);

    const shorelinePx = body.shoreline_points || [];
    let shorelinePct = shorelinePx.map((p) => ({
      x: clamp((Number(p.x) / imgW) * 100, 0, 100),
      y: clamp((Number(p.y) / imgH) * 100, 0, 100),
      conf: p.conf ?? null,
    }));

    shorelinePct = sortByX(shorelinePct);
    shorelinePct = trimEdges(shorelinePct, 6);
    shorelinePct = downsample(shorelinePct, 3);
    shorelinePct = smoothY(shorelinePct, 7);

    const boundary = readJson(BOUNDARY_FILE, null);
    const nests = readJson(NESTS_FILE, []);
    if (!boundary?.points?.length) {
      return res
        .status(500)
        .json({ detail: "Boundary file missing or invalid." });
    }

    const bufferPct = Number(req.query.bufferPct || 3);
    const evaluation = evaluateRisk({
      shorelinePct,
      boundary,
      nests,
      bufferPct,
    });

    let environment = null;
    let envScore = 0;

    try {
      environment = await getCurrentEnvironment();
      envScore = environmentScore(environment);
    } catch (err) {
      console.warn(
        "Environment fetch failed, continuing without env:",
        err?.message || err,
      );
      environment = buildEnvironmentFallback();
      envScore = 0;
    }

    const visionScore = evaluation.boundaryCrossed
      ? 80
      : (evaluation.nestsAtRisk?.length || 0) > 0
        ? 60
        : 10;

    const finalScore = visionScore + envScore;
    const finalRisk =
      finalScore >= 80 ? "high" : finalScore >= 40 ? "medium" : "low";

    const threatSummary = summarizeNestThreat(evaluation);

    const riskNotes = [];
    if (envScore >= 15) {
      riskNotes.push("Environmental conditions amplify risk.");
    }
    if (environment?.rain?.last3h_mm >= 20) {
      riskNotes.push("Heavy recent rainfall detected.");
    }
    if (environment?.tide?.trend === "rising") {
      riskNotes.push("Tide is rising.");
    }

    const shouldCreateAlert =
      evaluation.boundaryCrossed || threatSummary.alertRisk !== "low";

    let createdAlert = null;

    if (shouldCreateAlert) {
      const backendRiskLevel = evaluation.boundaryCrossed
        ? "high"
        : threatSummary.alertRisk;

      const baseKey = evaluation.boundaryCrossed
        ? "shoreline_boundary_crossed"
        : backendRiskLevel === "high"
          ? "shoreline_critical_nest_threat"
          : "shoreline_warning_nest_threat";

      const userId = req.auth?.userId || "anon";
      const cooldownKey = `${userId}_${baseKey}`;

      const threatNests =
        backendRiskLevel === "high"
          ? threatSummary.highThreats
          : threatSummary.mediumThreats;

      const content = buildProfessionalAlertContent({
        isVideo: false,
        boundaryCrossed: evaluation.boundaryCrossed,
        backendRiskLevel,
      });

      createdAlert = await Alert.create({
        type: "shoreline",
        riskLevel: backendRiskLevel,
        message: content.message,
        status: "new",
        source: "offline_image",
        cooldownKey,
        details: {
          summary: content.summary,
          riskReason: content.riskReason,
          recommendedAction: content.recommendedAction,
          boundaryCrossed: evaluation.boundaryCrossed,
          nestsAtRisk: threatNests,
          nestsAtRiskCount: threatNests.length,
          evaluation,
          bufferPct,
          boundary,
          nests: evaluation.nestsEvaluated || nests,
          shoreline: shorelinePct,
          image: { w: imgW, h: imgH },
          model: {
            shoreline_conf: body.shoreline_conf ?? null,
            notes: body.notes ?? null,
          },
          environment,
          envScore,
          visionScore,
          finalScore,
          finalRisk,
          backendRiskLevel,
          threatSummary,
          riskNotes,
        },
      });

      try {
        io.emit("shoreline:new_alert", createdAlert);
      } catch (e) {
        console.warn("Socket emit failed:", e?.message || e);
      }

      try {
        const userId = req.auth?.userId || req.userId || null;
        const userEmail = await getUserPrimaryEmail(userId);

        const emailResult = await notifyIfAllowed({
          alertDoc: createdAlert,
          recipients: userEmail ? [userEmail] : [],
        });

        console.log("Email notify result:", emailResult, { userEmail, userId });
      } catch (e) {
        console.warn("Email notify failed:", e?.message || e);
      }
    }

    return res.json({
      mode: "offline",
      image: { w: imgW, h: imgH },
      shoreline: shorelinePct,
      boundary,
      nests,
      evaluation,
      environment,
      fusion: {
        envScore,
        visionScore,
        finalScore,
        finalRisk,
        backendRiskLevel: evaluation.boundaryCrossed
          ? "high"
          : threatSummary.alertRisk,
        notes: riskNotes,
      },
      threatSummary,
      model: {
        shoreline_conf: body.shoreline_conf ?? null,
        notes: body.notes ?? null,
      },
      createdAlertId: createdAlert?._id ? String(createdAlert._id) : null,
    });
  } catch (e) {
    console.error("evaluateOffline failed:", e);
    return res
      .status(500)
      .json({ detail: e.message || "evaluateOffline failed" });
  }
}

export async function evaluateVideoUpload(req, res) {
  try {
    if (!req.file) {
      return res
        .status(400)
        .json({ detail: "video file is required (field 'file')" });
    }

    const form = new FormData();

    const buffer = fs.readFileSync(req.file.path);
    const blob = new Blob([buffer], { type: req.file.mimetype || "video/mp4" });
    form.append("file", blob, req.file.originalname || "video.mp4");

    const pyRes = await fetch(`${PY_INFER_URL}/predict-video`, {
      method: "POST",
      body: form,
    });

    const text = await pyRes.text();
    let pyJson = null;
    try {
      pyJson = JSON.parse(text);
    } catch {}

    if (!pyRes.ok) {
      return res.status(pyRes.status).json(pyJson ?? { detail: text });
    }

    const frames = Array.isArray(pyJson?.frames) ? pyJson.frames : [];
    const fps = Number(pyJson?.fps || 30);

    const boundary = readJson(BOUNDARY_FILE, null);
    const nests = readJson(NESTS_FILE, []);
    if (!boundary?.points?.length) {
      return res
        .status(500)
        .json({ detail: "Boundary file missing or invalid." });
    }

    let environment = null;
    let envScore = 0;
    try {
      environment = await getCurrentEnvironment();
      envScore = environmentScore(environment);
    } catch {
      environment = buildEnvironmentFallback();
      envScore = 0;
    }

    const bufferPct = Number(req.query.bufferPct || 3);

    const evaluatedFrames = [];
    let alertTriggered = false;
    let createdAlert = null;

    for (let i = 0; i < frames.length; i++) {
      const f = frames[i];
      const imgW = f?.image?.w || 1920;
      const imgH = f?.image?.h || 1080;

      let shorelinePct = (f?.shoreline_points || []).map((p) => ({
        x: clamp((Number(p.x) / imgW) * 100, 0, 100),
        y: clamp((Number(p.y) / imgH) * 100, 0, 100),
        conf: p.conf ?? null,
      }));

      shorelinePct = sortByX(shorelinePct);
      shorelinePct = trimEdges(shorelinePct, 6);
      shorelinePct = downsample(shorelinePct, 3);
      shorelinePct = smoothY(shorelinePct, 7);

      const evaluation = evaluateRisk({
        shorelinePct,
        boundary,
        nests,
        bufferPct,
      });

      const visionScore = evaluation.boundaryCrossed
        ? 80
        : (evaluation.nestsAtRisk?.length || 0) > 0
          ? 60
          : 10;

      const finalScore = visionScore + envScore;
      const finalRisk =
        finalScore >= 80 ? "high" : finalScore >= 40 ? "medium" : "low";

      const threatSummary = summarizeNestThreat(evaluation);
      const shouldCreateAlert =
        evaluation.boundaryCrossed || threatSummary.alertRisk !== "low";

      if (!alertTriggered && shouldCreateAlert) {
        alertTriggered = true;

        const backendRiskLevel = evaluation.boundaryCrossed
          ? "high"
          : threatSummary.alertRisk;

        const baseKey = evaluation.boundaryCrossed
          ? "shoreline_boundary_crossed_video"
          : backendRiskLevel === "high"
            ? "shoreline_critical_nest_threat_video"
            : "shoreline_warning_nest_threat_video";

        const userId = req.auth?.userId || "anon";
        const cooldownKey = `${userId}_${baseKey}`;

        const threatNests =
          backendRiskLevel === "high"
            ? threatSummary.highThreats
            : threatSummary.mediumThreats;

        const content = buildProfessionalAlertContent({
          isVideo: true,
          boundaryCrossed: evaluation.boundaryCrossed,
          backendRiskLevel,
        });

        createdAlert = await Alert.create({
          type: "shoreline",
          riskLevel: backendRiskLevel,
          message: content.message,
          status: "new",
          source: "video_upload",
          cooldownKey,
          details: {
            summary: content.summary,
            riskReason: content.riskReason,
            recommendedAction: content.recommendedAction,
            boundaryCrossed: evaluation.boundaryCrossed,
            nestsAtRisk: threatNests,
            nestsAtRiskCount: threatNests.length,
            bufferPct,
            boundary,
            nests,
            evaluation,
            environment,
            envScore,
            visionScore,
            finalScore,
            finalRisk,
            backendRiskLevel,
            threatSummary,
            atTime: Number(f?.t ?? i / fps),
          },
        });

        try {
          io.emit("shoreline:new_alert", createdAlert);
        } catch (e) {
          console.warn("Socket emit failed:", e?.message || e);
        }

        try {
          const userEmail = await getUserPrimaryEmail(req.auth?.userId || null);
          await notifyIfAllowed({
            alertDoc: createdAlert,
            recipients: userEmail ? [userEmail] : [],
          });
        } catch (e) {
          console.warn("Email notify failed:", e?.message || e);
        }
      }

      evaluatedFrames.push({
        t: Number(f?.t ?? i / fps),
        shorelinePct,
        evaluation,
        threatSummary,
        fusion: {
          envScore,
          visionScore,
          finalScore,
          finalRisk,
          backendRiskLevel: evaluation.boundaryCrossed
            ? "high"
            : threatSummary.alertRisk,
        },
        image: { w: imgW, h: imgH },
      });
    }

    const summary = {
      totalFrames: evaluatedFrames.length,
      highFrames: evaluatedFrames.filter(
        (x) => x.fusion.backendRiskLevel === "high",
      ).length,
      mediumFrames: evaluatedFrames.filter(
        (x) => x.fusion.backendRiskLevel === "medium",
      ).length,
      lowFrames: evaluatedFrames.filter(
        (x) => x.fusion.backendRiskLevel === "low",
      ).length,
      breachedAny: evaluatedFrames.some((x) => x.evaluation?.boundaryCrossed),
      createdAlertId: createdAlert?._id ? String(createdAlert._id) : null,
    };

    return res.json({
      mode: "video_upload",
      fps,
      bufferPct,
      boundary,
      nests,
      environment,
      summary,
      frames: evaluatedFrames,
    });
  } catch (e) {
    console.error("evaluateVideoUpload failed:", e);
    return res
      .status(500)
      .json({ detail: e.message || "evaluateVideoUpload failed" });
  } finally {
    try {
      if (req.file?.path) fs.unlinkSync(req.file.path);
    } catch {}
  }
}
