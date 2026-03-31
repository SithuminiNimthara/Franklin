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

// ✅ MongoDB Alert model
import Alert from "./models/alert.model.js";

// ✅ Socket.IO (realtime)
import { io } from "../../server.js";

// ✅ Environment (API + manual fallback)
import { getCurrentEnvironment } from "../environment/services/environment.service.js";
import { environmentScore } from "./services/environmentRisk.service.js";
import { notifyIfAllowed } from "./services/shorelineNotify.service.js";

// ✅ python base url
const PY_INFER_URL =
  process.env.PY_INFER_URL || "http://127.0.0.1:8000/ai/shoreline";

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
      { id: "nest-1", label: "Nest #234", x: 10, y: 46 }, // red
      { id: "nest-2", label: "Nest #189", x: 18, y: 48 }, // orange
      { id: "nest-3", label: "Nest #201", x: 70, y: 60 }, // green
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

    console.log("IMG META:", { imgW, imgH });
    console.log("BUFFER:", bufferPct);
    console.log("FIRST SHORELINE PCT:", shorelinePct?.slice(0, 5));

    const withD = evaluation.nestsEvaluated || evaluation.nestsAtRisk || [];
    console.log(
      "NEST DISTANCES:",
      withD.map((n) => ({
        id: n.id,
        label: n.label,
        x: n.x,
        y: n.y,
        d: n.distancePct,
      })),
    );

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
      const baseKey = evaluation.boundaryCrossed
        ? "shoreline_boundary_crossed"
        : "shoreline_nests_at_risk";

      const userId = req.auth?.userId || "anon"; // 👈 logged-in user
      const cooldownKey = `${userId}_${baseKey}`; // 👈 per-user cooldown

      createdAlert = await Alert.create({
        type: "shoreline",
        riskLevel: "high",
        message: evaluation.boundaryCrossed
          ? "Shoreline crossed boundary line"
          : "Shoreline close to turtle nests",
        status: "new",
        source: "offline_image",
        cooldownKey, // ✅ UPDATED HERE
        details: {
          evaluation,
          bufferPct,
          boundary,
          nests: evaluation.nestsEvaluated || nests,
          nestsAtRiskCount:
            evaluation.nestsAtRiskCount ?? evaluation.nestsAtRisk?.length ?? 0,
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
          riskNotes,
        },
      });

      // ✅ realtime notify dashboards
      try {
        io.emit("shoreline:new_alert", createdAlert);
      } catch (e) {
        console.warn("Socket emit failed:", e?.message || e);
      }
      // ✅ EMAIL notify (send to logged-in user's email)
      try {
        const userId = req.auth?.userId || req.userId || null;
        const userEmail = await getUserPrimaryEmail(userId);

        const emailResult = await notifyIfAllowed({
          alertDoc: createdAlert,
          recipients: userEmail ? [userEmail] : [], // override
        });

        console.log("Email notify result:", emailResult, { userEmail, userId });
      } catch (e) {
        console.warn("Email notify failed:", e?.message || e);
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

export async function evaluateVideoUpload(req, res) {
  try {
    if (!req.file) {
      return res
        .status(400)
        .json({ detail: "video file is required (field 'file')" });
    }

    // 1) send to python predict-video
    const form = new FormData();

    //  disk upload -> read from path
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

    // expected from python:
    // { fps, frames: [{ t, shoreline_points:[{x,y,conf}], image:{w,h}, risk_level? }] }
    const frames = Array.isArray(pyJson?.frames) ? pyJson.frames : [];
    const fps = Number(pyJson?.fps || 30);

    // 2) load boundary + nests
    const boundary = readJson(BOUNDARY_FILE, null);
    const nests = readJson(NESTS_FILE, []);
    if (!boundary?.points?.length) {
      return res
        .status(500)
        .json({ detail: "Boundary file missing or invalid." });
    }

    // 3) optional environment fusion (reuse your existing block)
    let environment = null;
    let envScore = 0;
    try {
      environment = await getCurrentEnvironment();
      envScore = environmentScore(environment);
    } catch {
      environment = {
        source: "manual",
        quality: "unknown",
        observedAt: new Date(),
        tide: { height_m: null, trend: "unknown", nextHighTideAt: null },
        rain: { last3h_mm: null, next6h_mm: null },
      };
      envScore = 0;
    }

    const bufferPct = Number(req.query.bufferPct || 3);

    // 4) evaluate per frame
    const evaluatedFrames = [];
    let highTriggered = false;
    let createdAlert = null;

    for (let i = 0; i < frames.length; i++) {
      const f = frames[i];
      const imgW = f?.image?.w || 1920;
      const imgH = f?.image?.h || 1080;

      // px -> pct
      let shorelinePct = (f?.shoreline_points || []).map((p) => ({
        x: clamp((Number(p.x) / imgW) * 100, 0, 100),
        y: clamp((Number(p.y) / imgH) * 100, 0, 100),
        conf: p.conf ?? null,
      }));

      // cleanup polyline
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

      // vision score (same style as your image mode)
      const visionScore = evaluation.boundaryCrossed
        ? 80
        : (evaluation.nestsAtRisk?.length || 0) > 0
          ? 60
          : 10;

      const finalScore = visionScore + envScore;
      const finalRisk =
        finalScore >= 80 ? "high" : finalScore >= 40 ? "medium" : "low";

      // create alert once when first high happens
      if (!highTriggered && finalRisk === "high") {
        highTriggered = true;

        const baseKey = evaluation.boundaryCrossed
          ? "shoreline_boundary_crossed_video"
          : "shoreline_nests_at_risk_video";

        const userId = req.auth?.userId || "anon";
        const cooldownKey = `${userId}_${baseKey}`;

        createdAlert = await Alert.create({
          type: "shoreline",
          riskLevel: "high",
          message: evaluation.boundaryCrossed
            ? "Video: Shoreline crossed boundary line"
            : "Video: Shoreline close to turtle nests",
          status: "new",
          source: "video_upload",
          cooldownKey,
          details: {
            bufferPct,
            boundary,
            nests,
            evaluation,
            environment,
            envScore,
            visionScore,
            finalScore,
            finalRisk,
            atTime: Number(f?.t ?? i / fps),
          },
        });

        // realtime + email (same as image)
        try {
          io.emit("shoreline:new_alert", createdAlert);
        } catch {}
        try {
          const userEmail = await getUserPrimaryEmail(req.auth?.userId || null);
          await notifyIfAllowed({
            alertDoc: createdAlert,
            recipients: userEmail ? [userEmail] : [],
          });
        } catch {}
      }

      evaluatedFrames.push({
        t: Number(f?.t ?? i / fps), // seconds
        shorelinePct,
        evaluation,
        fusion: { envScore, visionScore, finalScore, finalRisk },
        image: { w: imgW, h: imgH },
      });
    }

    // 5) summary
    const summary = {
      totalFrames: evaluatedFrames.length,
      highFrames: evaluatedFrames.filter((x) => x.fusion.finalRisk === "high")
        .length,
      mediumFrames: evaluatedFrames.filter(
        (x) => x.fusion.finalRisk === "medium",
      ).length,
      lowFrames: evaluatedFrames.filter((x) => x.fusion.finalRisk === "low")
        .length,
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
    //  delete uploaded temp video
    try {
      if (req.file?.path) fs.unlinkSync(req.file.path);
    } catch {}
  }
}
