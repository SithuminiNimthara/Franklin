import { Router } from "express";
import multer from "multer";

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

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

// Config
router.get("/boundary", getBoundary);
router.put("/boundary", updateBoundary);

// Nests
router.get("/nests", getNests);
router.post("/nests", addNest);
router.delete("/nests/:id", deleteNest);

// Alerts
router.get("/alerts", getAlerts);

// Inference
router.post("/predict", upload.single("file"), predictProxy);
router.post("/evaluate-offline", upload.single("file"), evaluateOffline);

export default router;
