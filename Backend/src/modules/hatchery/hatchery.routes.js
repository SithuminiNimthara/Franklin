import express from "express";
import fs from "fs";
import * as hatcheryController from "./hatchery.controller.js";
import * as alertsController from "./hatchery.alerts.controller.js";
import multer from "multer";
import { clerkMiddleware, requireAuth } from "@clerk/express";
import { HatcheryVideo, HatcheryAlert } from "./hatchery.models.js";

const router = express.Router();

// Multer configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = "uploads/hatchery";
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const cleanName = file.originalname.replace(/\s+/g, "_");
    cb(null, uniqueSuffix + "-" + cleanName);
  },
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("video/")) {
    cb(null, true);
  } else {
    cb(new Error("Only video files are allowed!"), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 500 * 1024 * 1024 },
});

// Main hatchery routes
router.post(
  "/upload",
  //requireAuth(),
  upload.single("video"),
  hatcheryController.uploadFootage,
);
router.get("/video/:filename", hatcheryController.streamVideo);
router.post("/video/:videoId/analysis", hatcheryController.updateVideoAnalysis);
router.get("/stats/:tankId", hatcheryController.getTankStats);
router.get(
  "/report/hatchery",
  clerkMiddleware(),
  requireAuth(),
  hatcheryController.generateHatcheryReport,
);

router.get("/stream/:tankId", hatcheryController.streamHatchery);
router.get("/data/:tankId", hatcheryController.getTankStats);

router.post("/alerts/new", hatcheryController.saveAlert);

router.get("/alerts/all", hatcheryController.getAllAlerts);  // all types (for notifications page)

router.get("/alerts", hatcheryController.getAlerts);  // hatchery-only types

router.patch(
  "/alerts/:alertId",
  clerkMiddleware(),
  requireAuth(),
  hatcheryController.updateAlertStatus,
);

// Manual email trigger from dashboard (button)
router.post(
  "/alerts/:alertId/send-email",
  clerkMiddleware(),
  requireAuth(),
  alertsController.sendHatcheryEmailAlert,
);

router.get("/video-analysis/:videoId", async (req, res) => {
  try {
    const { videoId } = req.params;
    const video = await HatcheryVideo.findById(videoId);

    if (!video) {
      return res.status(404).json({ message: "Video not found" });
    }

    res.json(video);
  } catch (error) {
    console.error("Error fetching video analysis:", error);
    res.status(500).json({ error: "Failed to fetch video analysis" });
  }
});

export default router;
