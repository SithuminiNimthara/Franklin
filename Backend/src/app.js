import express from "express";
import cors from "cors";
import { config } from "./config/env.js";
import streamingRoutes from "./modules/streaming/streaming.routes.js";
import turtlesRoutes from "./modules/turtles/turtles.routes.js";
import nestsRoutes from "./modules/nests/nests.routes.js";
import usersRoutes from "./modules/users/users.routes.js";
import { streamingService } from "./modules/streaming/streaming.service.js";
import shorelineRoutes from "./modules/shoreline/shoreline.routes.js";
import { connectDB } from "./config/db.js";
import detectionsRoutes from "./modules/detections/detections.routes.js";
import healthRoutes from "./modules/turtleHealth/health.routes.js";
import environmentRoutes from "./modules/environment/environment.routes.js";
import hatcheryRoutes from "./modules/hatchery/hatchery.routes.js";
import alertsRoutes from "./modules/alerts/alerts.routes.js";
import profileRoutes from "./modules/users/profile.routes.js";
import cameraRoutes from "./modules/cameras/camera.routes.js";
import analyticsRoutes from "./modules/analytics/analytics.routes.js";
import reportsRoutes from "./modules/reports/reports.routes.js";
import dashboardRoutes from "./modules/dashboard/dashboard.routes.js";

const app = express();

// Request logging
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  if (req.method !== "GET") {
    console.log("Body:", JSON.stringify(req.body, null, 2));
  }
  next();
});

// Middleware
app.use(
  cors({
    origin: config.frontendUrl,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "Range"],
    exposedHeaders: ["Content-Length", "Content-Range"],
    credentials: true,
  }),
);

app.use(express.json());

// Initialize Database & Services
const init = async () => {
  await connectDB();
  if (config.streamingEnabled) {
    console.log("Streaming is enabled. Starting cameras...");
    streamingService.startAllCameras();
  } else {
    console.log("Streaming is disabled via config.");
  }
};

init();

import path from "path";

// Static Routes (Streaming)
app.use("/uploads", express.static(path.join(process.cwd(), "public", "uploads")));
app.use(
  "/streams",
  express.static(config.streamDir, {
    setHeaders(res, filePath) {
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader(
        "Access-Control-Allow-Headers",
        "Range, Authorization, Content-Type",
      );
      res.setHeader(
        "Access-Control-Expose-Headers",
        "Content-Length, Content-Range",
      );

      res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
      res.setHeader("Pragma", "no-cache");
      res.setHeader("Expires", "0");

      // Ensure correct MIME types for HLS
      if (filePath.endsWith(".m3u8")) {
        res.setHeader("Content-Type", "application/vnd.apple.mpegurl");
      } else if (filePath.endsWith(".ts")) {
        res.setHeader("Content-Type", "video/mp2t");
      }
    },
  }),
);

// API Routes
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
app.use("/api/analytics", analyticsRoutes);
app.use("/api/reports", reportsRoutes);
app.use("/api/dashboard", dashboardRoutes);

// Health route
app.get("/health", (req, res) => {
  res.status(200).json({ status: "OK", timestamp: new Date() });
});

// Root route
app.get("/", (req, res) => {
  res.send(`Franklin Conservation Backend Running (Port ${config.port})`);
});

export default app;
