import express from "express";
import cors from "cors";
import { config } from "./config/env.js";
import streamingRoutes from "./modules/streaming/streaming.routes.js";
import turtlesRoutes from "./modules/turtles/turtles.routes.js";
import nestsRoutes from "./modules/nests/nests.routes.js";
import usersRoutes from "./modules/users/users.routes.js";
import { streamingService } from "./modules/streaming/streaming.service.js";
import shorelineRoutes from "./modules/shoreline/shoreline.routes.js";
import { connectDB } from './config/db.js';
import detectionsRoutes from './modules/detections/detections.routes.js';
import healthRoutes from './modules/turtleHealth/health.routes.js';
import hatcheryRoutes from './modules/hatchery/hatchery.routes.js'; 

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Initialize Database
connectDB();

// Initialize Services
// streamingService.startAllCameras(); // Disabled for now as it was causing RTSP issues

// Static Routes (Streaming)
app.use('/streams', express.static(config.streamDir, {
    setHeaders(res) {
      res.setHeader("Access-Control-Allow-Origin", "*");
    },
  })
);

// API Routes
app.use('/api/streaming', streamingRoutes);
app.use('/api/turtles', turtlesRoutes);
app.use('/api/nests', nestsRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/detections', detectionsRoutes);
app.use('/api/health', healthRoutes);
app.use("/api/shoreline", shorelineRoutes);
app.use("/api/hatchery", hatcheryRoutes);

// Root route
app.get('/', (req, res) => {
    res.send('Franklin Conservation Backend Running (Port 5000)');
});

export default app;
