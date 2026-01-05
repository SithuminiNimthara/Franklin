import sharp from "sharp";

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

import {
  DATA_DIR,
  BOUNDARY_FILE,
  NESTS_FILE,
  ALERTS_FILE,
} from "./config/paths.js";

/** Bootstrap defaults */
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

  const alerts = readJson(ALERTS_FILE, null);
  if (!Array.isArray(alerts)) writeJson(ALERTS_FILE, []);
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

/** Alerts */
export function getAlerts(req, res) {
  const alerts = readJson(ALERTS_FILE, []);
  res.json(alerts);
}

/** Predict proxy */
export async function predictProxy(req, res) {
  try {
    if (!req.file) return res.status(400).json({ detail: "file is required" });

    const { status, body } = await predictViaPython(
      req.file.buffer,
      req.file.originalname || "frame.jpg",
      req.file.mimetype || "image/jpeg"
    );

    return res.status(status).json(body);
  } catch (e) {
    console.error("predict proxy failed:", e);
    return res.status(500).json({ detail: "Proxy inference failed" });
  }
}

/** Evaluate Offline */
export async function evaluateOffline(req, res) {
  try {
    if (!req.file)
      return res.status(400).json({ detail: "image file is required" });

    const meta = await sharp(req.file.buffer).metadata();
    const imgW = meta.width || 1920;
    const imgH = meta.height || 1080;

    const { status, body } = await predictViaPython(
      req.file.buffer,
      req.file.originalname || "offline.jpg",
      req.file.mimetype || "image/jpeg"
    );

    if (status !== 200) return res.status(status).json(body);

    // px -> percent
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

    if (evaluation.riskLevel === "high") {
      const alerts = readJson(ALERTS_FILE, []);
      alerts.unshift({
        id: uid(),
        type: "shoreline",
        time: nowIso(),
        message: evaluation.boundaryCrossed
          ? "Shoreline crossed boundary line"
          : "Shoreline close to turtle nests",
        riskLevel: "high",
        details: evaluation,
      });
      writeJson(ALERTS_FILE, alerts.slice(0, 50));
    }

    return res.json({
      mode: "offline",
      image: { w: imgW, h: imgH },
      shoreline: shorelinePct,
      boundary,
      nests,
      evaluation,
      model: {
        shoreline_conf: body.shoreline_conf ?? null,
        notes: body.notes ?? null,
      },
    });
  } catch (e) {
    console.error("evaluateOffline failed:", e);
    return res
      .status(500)
      .json({ detail: e.message || "evaluateOffline failed" });
  }
}
