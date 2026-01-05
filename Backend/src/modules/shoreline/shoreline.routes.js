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

// ✅ Inference (multer middleware here)
router.post("/predict", uploadSingleFile, predictProxy);
router.post("/evaluate-offline", uploadSingleFile, evaluateOffline);

export default router;
