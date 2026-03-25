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
  evaluateVideoUpload,
} from "./shoreline.controller.js";

import {
  uploadSingleImage,
  uploadSingleVideo,
} from "./middlewares/upload.middleware.js";

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
router.post("/predict", uploadSingleImage, predictProxy);
router.post("/predict-video", uploadSingleVideo, predictVideoProxy);
router.get("/predict-video-demo", predictVideoDemo);

// --------------------
// Risk Evaluation (AUTH + EMAIL)
// --------------------
router.post(
  "/evaluate-offline",
  requireAuth(), // ✅ Clerk auth
  uploadSingleImage, // ✅ multer wrapper
  evaluateOffline, // ✅ sends email to logged-in user
);

router.post(
  "/evaluate-video",
  requireAuth(),
  uploadSingleVideo, // same multer
  evaluateVideoUpload,
);
export default router;
