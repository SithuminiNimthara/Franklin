import { Router } from "express";
import { requireAuth } from "@clerk/express";

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

// --------------------
// Boundary
// --------------------
router.get("/boundary", getBoundary);
router.put("/boundary", updateBoundary);

// --------------------
// Nests
// --------------------
router.get("/nests", getNests);
router.post("/nests", addNest);
router.delete("/nests/:id", deleteNest);

// --------------------
// Alerts (MongoDB)
// --------------------
router.use("/alerts", alertRoutes);

// --------------------
// Inference (IMAGE / VIDEO)
// --------------------
router.post("/predict", uploadSingleFile, predictProxy);
router.post("/predict-video", uploadSingleFile, predictVideoProxy);
router.get("/predict-video-demo", predictVideoDemo);

// --------------------
// Risk Evaluation (AUTH + EMAIL)
// --------------------
router.post(
  "/evaluate-offline",
  requireAuth(), // ✅ Clerk auth
  uploadSingleFile, // ✅ multer wrapper
  evaluateOffline, // ✅ sends email to logged-in user
);

export default router;
