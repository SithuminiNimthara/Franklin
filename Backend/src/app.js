import express from "express";
import cors from "cors";
import path from "path";
import fs from "fs";
import { config } from "./config/env.js";
import { connectDB } from "./config/db.js";

// Routes
import streamingRoutes from "./modules/streaming/streaming.routes.js";
import turtlesRoutes from "./modules/turtles/turtles.routes.js";
import nestsRoutes from "./modules/nests/nests.routes.js";
import usersRoutes from "./modules/users/users.routes.js";
import shorelineRoutes from "./modules/shoreline/shoreline.routes.js";
import detectionsRoutes from "./modules/detections/detections.routes.js";
import healthRoutes from "./modules/turtleHealth/health.routes.js";
import environmentRoutes from "./modules/environment/environment.routes.js";
import hatcheryRoutes from "./modules/hatchery/hatchery.routes.js";
import alertsRoutes from "./modules/alerts/alerts.routes.js";
import profileRoutes from "./modules/users/profile.routes.js";
import cameraRoutes from './modules/cameras/camera.routes.js';

// Services
import { streamingService } from "./modules/streaming/streaming.service.js";
import { streamingController } from "./modules/streaming/streaming.controller.js";

const app = express();

// Request logging (Production safe)
app.use((req, res, next) => {
  if (process.env.NODE_ENV !== "test") {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  }
  next();
});

// Middleware
app.use(cors({
  origin: config.frontendUrl || "*",
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "Range"],
  exposedHeaders: ["Content-Length", "Content-Range"]
}));
app.use(express.json());

// Initialize Database & Services
const init = async () => {
  try {
    await connectDB();
    // Enable streaming by default in production
    if (config.streamingEnabled || process.env.NODE_ENV === "production") {
      console.log("🚀 Streaming is enabled. Starting cameras...");
      streamingService.startAllCameras();
    } else {
      console.log("⚠️ Streaming is disabled via config.");
    }
  } catch (err) {
    console.error("❌ App Initialization Failed:", err);
  }
};

init();

// ------------------------------
// STATIC / STREAMING
// ------------------------------
app.use('/streams', express.static(config.streamDir, {
  setHeaders(res, filePath) {
    res.setHeader("Access-Control-Allow-Origin", "*");
    if (filePath.endsWith(".m3u8")) {
      res.setHeader("Content-Type", "application/vnd.apple.mpegurl");
    } else if (filePath.endsWith(".ts")) {
      res.setHeader("Content-Type", "video/mp2t");
    }
  },
})
);

// ------------------------------
// API ROUTES (with /api prefix)
// ------------------------------
app.use("/api/streaming", streamingRoutes);
app.use("/api/turtles", turtlesRoutes);
app.use("/api/nests", nestsRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/detections", detectionsRoutes);
app.use("/api/health", healthRoutes);
app.use("/api/shoreline", shorelineRoutes);
app.use("/api/environment", environmentRoutes);
app.use("/api/hatchery", hatcheryRoutes);
app.use("/api/alerts", alertsRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/cameras", cameraRoutes);

// ------------------------------
// ALIAS ROUTES (for compatibility with Direct Frontend Calls)
// ------------------------------
app.get("/health/stats", (req, res, next) => {
  // Redirect to /api/health/stats
  req.url = "/api/health/stats";
  app._router.handle(req, res, next);
});

app.use("/profile", profileRoutes);
app.use("/hatchery", hatcheryRoutes);

// MJPEG Proxy Route
app.get("/streaming/proxy/:tankId", streamingController.proxyTank);

// HLS Stream Discovery
app.get("/streams/:cameraId/stream.m3u8", (req, res, next) => {
  const filePath = path.join(config.streamDir, req.params.cameraId, 'stream.m3u8');
  if (fs.existsSync(filePath)) {
    return next(); // fall through to static middleware
  }
  res.status(404).json({
    error: "Offline",
    message: "Live stream is currently starting or camera is offline."
  });
});

// ------------------------------
// SYSTEM ROUTES
// ------------------------------
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "OK",
    streaming: streamingService.getStreamingStatus().length,
    timestamp: new Date()
  });
});

app.get("/", (req, res) => {
  res.send(`Franklin Conservation Backend Running (Production)`);
});

// Error Handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: "Internal Server Error", message: err.message });
});

export default app;
