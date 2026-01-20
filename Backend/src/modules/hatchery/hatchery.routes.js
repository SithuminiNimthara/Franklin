import express from "express";
import fs from "fs";
import * as hatcheryController from "./hatchery.controller.js";
import multer from "multer";

const router = express.Router();

//  1. Multer Configuration
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

// File Filter (Only allow videos)
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("video/")) {
    cb(null, true);
  } else {
    cb(new Error("Only video files are allowed!"), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 500 * 1024 * 1024 },
  // Limit: 500MB
});

// POST: Upload Video
router.post(
  "/upload",
  upload.single("video"),
  hatcheryController.uploadFootage,
);

// Serve Video File
router.get("/video/:filename", hatcheryController.streamVideo);
router.post("/video/:videoId/analysis", hatcheryController.updateVideoAnalysis);

router.get("/stats/:tankId", hatcheryController.getTankStats);
router.get("/alerts", hatcheryController.getAlerts);

export default router;
