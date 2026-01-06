import { Router } from "express";

import {
  evaluateOffline,
  getBoundary,
  updateBoundary,
  getNests,
  addNest,
  deleteNest,
  getAlerts,
  predictProxy,
  predictVideoProxy,
  predictVideoDemo, // ✅ NEW
} from "./shoreline.controller.js";

import { uploadSingleFile } from "./middlewares/upload.middleware.js";

const router = Router();

// Config
router.get("/boundary", getBoundary);
router.put("/boundary", updateBoundary);

// Nests
router.get("/nests", getNests);
router.post("/nests", addNest);
router.delete("/nests/:id", deleteNest);

// Alerts
router.get("/alerts", getAlerts);

//  Inference
router.post("/predict", uploadSingleFile, predictProxy);
router.post("/evaluate-offline", uploadSingleFile, evaluateOffline);

// Upload video inference (still supported)
router.post("/predict-video", uploadSingleFile, predictVideoProxy);

//  NEW: demo video inference (no upload)
router.get("/predict-video-demo", predictVideoDemo);

export default router;
