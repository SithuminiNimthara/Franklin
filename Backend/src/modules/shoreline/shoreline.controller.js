// shoreline.controller.js
import sharp from "sharp";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

import { readJson, writeJson, nowIso, ensureDir } from "./utils/file.util.js";
import { clamp } from "./utils/geo.util.js";
import { uid } from "./utils/id.util.js";

import { predictViaPython } from "./services/python.service.js";
import { evaluateRisk } from "./services/risk.service.js";

import {
  sortByX,
  trimEdges,
  downsample,
  smoothY,
} from "./utils/polyline.util.js";

import { DATA_DIR, BOUNDARY_FILE, NESTS_FILE } from "./config/paths.js";

// ✅ MongoDB Alert model
import Alert from "./models/alert.model.js";

// ✅ Socket.IO (realtime)
import { io } from "../../server.js";

// ✅ Environment (API + manual fallback)
import { getCurrentEnvironment } from "../environment/services/environment.service.js";
import { environmentScore } from "./services/environmentRisk.service.js";

// ✅ python base url
const PY_INFER_URL = process.env.PY_INFER_URL || "http://localhost:9000";

// ✅ resolve this module directory (ESM-safe)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ✅ demo video folder inside shoreline module
// Put demo videos here:
// backend/src/modules/shoreline/data/demo_videos/shoreline_demo.mp4
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
      { id: "nest-1", label: "Nest #234", x: 25, y: 40 },
      { id: "nest-2", label: "Nest #189", x: 45, y: 55 },
      { id: "nest-3", label: "Nest #201", x: 80, y: 60 },
    ]);
  }
}
ensureDefaults();

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

/** ✅ Predict VIDEO DEMO (NO UPLOAD) */
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

/** Evaluate Offline (IMAGE) — now includes environment + final risk + realtime push */
export async function evaluateOffline(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({
        detail: "image file is required (field name must be 'file')",
        gotContentType: req.headers["content-type"] || null,
      });
    }

    // 1) image meta
    const meta = await sharp(req.file.buffer).metadata();
    const imgW = meta.width || 1920;
    const imgH = meta.height || 1080;

    // 2) python model
    const { status, body } = await predictViaPython(
      req.file.buffer,
      req.file.originalname || "offline.jpg",
      req.file.mimetype || "image/jpeg",
    );
    if (status !== 200) return res.status(status).json(body);

    // 3) px -> percent
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

    // 4) load boundary + nests
    const boundary = readJson(BOUNDARY_FILE, null);
    const nests = readJson(NESTS_FILE, []);
    if (!boundary?.points?.length) {
      return res
        .status(500)
        .json({ detail: "Boundary file missing or invalid." });
    }

    // 5) shoreline risk
    const bufferPct = Number(req.query.bufferPct || 3);
    const evaluation = evaluateRisk({
      shorelinePct,
      boundary,
      nests,
      bufferPct,
    });

    console.log("RISK EVALUATION RESULT:", {
      riskLevel: evaluation.riskLevel,
      boundaryCrossed: evaluation.boundaryCrossed,
      nestsAtRisk: evaluation.nestsAtRisk?.length,
    });

    // 6) ✅ get environment (API preferred, fallback manual)
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
      environment = {
        source: "manual",
        quality: "unknown",
        observedAt: new Date(),
        tide: { height_m: null, trend: "unknown", nextHighTideAt: null },
        rain: { last3h_mm: null, next6h_mm: null },
      };
      envScore = 0;
    }

    // 7) ✅ final risk fusion (simple + explainable)
    // Vision dominates, environment amplifies urgency.
    const visionScore = evaluation.boundaryCrossed
      ? 80
      : (evaluation.nestsAtRisk?.length || 0) > 0
        ? 60
        : 10;

    const finalScore = visionScore + envScore;

    const finalRisk =
      finalScore >= 80 ? "high" : finalScore >= 40 ? "medium" : "low";

    const riskNotes = [];
    if (envScore >= 15)
      riskNotes.push("Environmental conditions amplify risk.");
    if (environment?.rain?.last3h_mm >= 20)
      riskNotes.push("Heavy recent rainfall detected.");
    if (environment?.tide?.trend === "rising")
      riskNotes.push("Tide is rising.");

    // 8) ✅ Save + realtime push if HIGH (final risk)
    let createdAlert = null;

    if (finalRisk === "high") {
      createdAlert = await Alert.create({
        type: "shoreline",
        riskLevel: "high",
        message: evaluation.boundaryCrossed
          ? "Shoreline crossed boundary line"
          : "Shoreline close to turtle nests",
        status: "new",
        source: "offline_image",
        details: {
          evaluation,
          bufferPct,
          boundary,
          nests,
          shoreline: shorelinePct,
          image: { w: imgW, h: imgH },
          model: {
            shoreline_conf: body.shoreline_conf ?? null,
            notes: body.notes ?? null,
          },

          // ✅ NEW: environment fusion
          environment,
          envScore,
          visionScore,
          finalScore,
          finalRisk,
          riskNotes,
        },
      });

      // ✅ realtime notify dashboards
      try {
        io.emit("shoreline:new_alert", createdAlert);
      } catch (e) {
        console.warn("Socket emit failed:", e?.message || e);
      }
    }

    // 9) response includes environment + fused risk
    return res.json({
      mode: "offline",
      image: { w: imgW, h: imgH },
      shoreline: shorelinePct,
      boundary,
      nests,

      evaluation, // original
      environment, // NEW
      fusion: {
        envScore,
        visionScore,
        finalScore,
        finalRisk,
        notes: riskNotes,
      },

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
