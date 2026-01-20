import { Router } from "express";
import alertRoutes from "./alerts.routes.js";

import {
  evaluateOffline,
  getBoundary,
  updateBoundary,
  getNests,
  addNest,
  deleteNest,
  predictProxy,
  predictVideoProxy,
  predictVideoDemo,
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

// ✅ Alerts (MongoDB)
router.use("/alerts", alertRoutes);

// Inference
router.post("/predict", uploadSingleFile, predictProxy);
router.post("/evaluate-offline", uploadSingleFile, evaluateOffline);
router.post("/predict-video", uploadSingleFile, predictVideoProxy);
router.get("/predict-video-demo", predictVideoDemo);

export default router;
