import axios from "axios";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { HatcheryVideo, HatcheryAlert } from "./hatchery.models.js";
import { sendAlertToActiveUsers } from "./hatchery.alerts.controller.js";

import { config } from "../../config/env.js";

// Helper to get root directory
const __filename = fileURLToPath(import.meta.url);
const rootDir = path.join(path.dirname(__filename), "../../../");

// Update video analysis
export const updateVideoAnalysis = async (req, res) => {
  try {
    const { videoId } = req.params;
    const { species, behavior, health } = req.body;

    const dbId = videoId.replace("upload_", "");

    const updatedVideo = await HatcheryVideo.findByIdAndUpdate(
      dbId,
      {
        status: "completed",
        analysis: {
          species: species,
          behavior: behavior,
          health: health,
          lastUpdated: new Date(),
        },
      },
      { new: true },
    );

    if (!updatedVideo) {
      return res.status(404).json({ message: "Video not found" });
    }

    // console.log(` AI Analysis saved for ${dbId}: ${species} - ${behavior}`);
    res.json({ success: true, data: updatedVideo });
  } catch (error) {
    console.error("Error updating analysis:", error);
    res.status(500).json({ error: "Failed to update analysis" });
  }
};

// Get tank live stats
export const getTankStats = async (req, res) => {
  const { tankId } = req.params;
  try {
    const response = await axios.get(
      `${config.models.hatchery}/ai/hatchery/data/${tankId}`,
    );
    res.json(response.data);
  } catch (error) {
    console.error("Error fetching tank stats:", error.message);
    res.status(500).json({ error: "Failed to fetch stats" });
  }
};

// Proxy stream from AI service
export const streamHatchery = async (req, res) => {
  const { tankId } = req.params;
  try {
    const streamUrl = `${config.models.hatchery}/ai/hatchery/stream/${tankId}`;
    const response = await axios({
      method: "get",
      url: streamUrl,
      responseType: "stream",
    });

    res.setHeader("Content-Type", response.headers["content-type"]);
    response.data.pipe(res);
  } catch (error) {
    console.error(
      `Error proxying hatchery stream for ${tankId}:`,
      error.message,
    );
    res.status(500).send("Stream error");
  }
};

//upload a video footage
export const uploadFootage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No video file uploaded" });
    }

    const PORT = process.env.PORT || 5002;
    const BACKEND_URL =
      process.env.NODE_BACKEND_URL || `http://localhost:${PORT}/api`;
    const videoUrl = `${BACKEND_URL}/hatchery/video/${req.file.filename}`;

    const localFilePath = path.resolve(req.file.path);

    const newVideo = new HatcheryVideo({
      filename: req.file.filename,
      originalName: req.file.originalname,
      path: videoUrl,
      status: "processing",
      meta: {
        fileSize: req.file.size,
        mimeType: req.file.mimetype,
      },
    });

    await newVideo.save();

    // Send localFilePath
    await axios.post(`${config.models.hatchery}/ai/hatchery/register_upload`, {
      videoId: `upload_${newVideo._id}`,
      videoPath: localFilePath,
    });

    res.status(201).json({
      message: "Upload successful",
      videoId: newVideo._id,
      streamUrl: `${BACKEND_URL}/hatchery/stream/upload_${newVideo._id}`,
      rawVideoUrl: videoUrl,
    });
  } catch (error) {
    console.error("Upload Controller Error:", error.message);
    res.status(500).json({ message: "Server error during upload" });
  }
};

// Serve raw video file
export const streamVideo = (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(rootDir, "uploads", "hatchery", filename);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ message: "Video not found" });
  }

  res.sendFile(filePath);
};

// Save a new alert sent from Python
export const saveAlert = async (req, res) => {
  try {
    //console.log("Incoming alert:", req.body);

    // 1. Save alert to database
    const alert = new HatcheryAlert(req.body);
    await alert.save();
    //console.log(`Alert saved to MongoDB: ${alert._id} - ${alert.message}`);

    // 2. Send email (non-blocking, will not break API response)
    sendAlertToActiveUsers(alert)
      .then((count) => console.log(`Alert emails sent to ${count} user(s)`))
      .catch((err) =>
        console.error("Email failed (non-critical):", err.message),
      );

    // 3. Respond IMMEDIATELY (frontend expects this)
    res.status(201).json({ success: true, data: alert });
  } catch (error) {
    //console.error("Failed to save alert:", error);
    res.status(500).json({ error: "Failed to save alert" });
  }
};

// Get all alerts (Past & Present)
export const getAlerts = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const filter = {
      type: { $in: ["behavior", "species_mixing"] }  // ← only hatchery alert types
    };

    if (startDate && endDate) {
      filter.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    } else {
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      const end = new Date();
      end.setHours(23, 59, 59, 999);
      filter.createdAt = { $gte: start, $lte: end };
    }

    const alerts = await HatcheryAlert.find(filter).sort({ createdAt: -1 });
    res.json(alerts);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch alerts" });
  }
};

// Get ALL alerts across modules (for Notifications page)
export const getAllAlerts = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const filter = {}; // no type filter — return all alert types

    if (startDate && endDate) {
      filter.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    } else {
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      const end = new Date();
      end.setHours(23, 59, 59, 999);
      filter.createdAt = { $gte: start, $lte: end };
    }

    const alerts = await HatcheryAlert.find(filter).sort({ createdAt: -1 });
    res.json(alerts);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch alerts" });
  }
};
// Resolve or acknowledge an alert
export const updateAlertStatus = async (req, res) => {
  try {
    const { alertId } = req.params;
    const { status, notes, resolvedBy } = req.body;

    const updatedAlert = await HatcheryAlert.findByIdAndUpdate(
      alertId,
      {
        status: status,
        notes: notes || "",
        resolvedBy: resolvedBy || "Unknown User",

        resolvedAt:
          status === "fixed" || status === "resolved" ? new Date() : null,
      },
      { new: true },
    );

    if (!updatedAlert) {
      return res.status(404).json({ message: "Alert not found" });
    }

    res.json({ success: true, data: updatedAlert });
  } catch (error) {
    console.error("Error updating alert:", error);
    res.status(500).json({ error: "Failed to update alert" });
  }
};

//delete an alert
// export const deleteAlert = async (req, res) => {
//   try {
//     const { alertId } = req.params;
//     await HatcheryAlert.findByIdAndDelete(alertId);
//     console.log(`Alert ${alertId} deleted`);
//     res.json({ success: true });
//   } catch (error) {
//     console.error("Error deleting alert:", error);
//     res.status(500).json({ error: "Failed to delete alert" });
//   }
// };

//  generate hatchery report
export const generateHatcheryReport = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    // Fetch data from all 4 tanks
    const tankIds = ["tankA", "tankB", "tankC", "tankD"];
    const tankDataPromises = tankIds.map((tankId) =>
      axios
        .get(`${config.models.hatchery}/ai/hatchery/data/${tankId}`)
        .then((response) => {
          // console.log(`Fetched data for ${tankId}:`, response.data);
          return { tankId, ...response.data };
        })
        .catch((error) => {
          // console.error(`Error fetching ${tankId}:`, error.message);
          return {
            tankId,
            status: "Offline",
            health: "Unknown",
            species: "Unknown",
          };
        }),
    );

    const tankData = await Promise.all(tankDataPromises);
    // console.log("All tank data:", tankData);

    // Fetch alerts
    let alertQuery = {};
    if (startDate && endDate) {
      alertQuery.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    const alerts = await HatcheryAlert.find(alertQuery).sort({ createdAt: -1 });
    // console.log(`Found ${alerts.length} alerts`);

    // Calculate statistics
    const totalHatchlings = 40;
    const healthyTanks = tankData.filter((t) => t.health === "Healthy").length;
    const criticalAlerts = alerts.filter((a) => a.status === "pending").length;
    const resolvedAlerts = alerts.filter((a) => a.status === "resolved").length;

    // Get unique species
    const allSpecies = tankData
      .map((t) => t.species)
      .filter((s) => s && s !== "Detecting..." && s !== "Unknown")
      .join(", ");

    const uniqueSpecies = [...new Set(allSpecies.split(", "))].filter(Boolean);

    const reportData = {
      generatedAt: new Date().toISOString(),
      period: {
        start: startDate || "N/A",
        end: endDate || "N/A",
      },
      summary: {
        totalTanks: 4,
        activeTanks: tankData.filter((t) => t.status !== "Offline").length,
        healthyTanks: healthyTanks,
        totalHatchlings: totalHatchlings,
        speciesTypes: uniqueSpecies.length || 2,
        speciesList: uniqueSpecies.join(", ") || "Green, Olive Ridley",
        healthAverage: `${Math.round((healthyTanks / 4) * 100)}%`,
        totalAlerts: alerts.length,
        criticalAlerts: criticalAlerts,
        resolvedAlerts: resolvedAlerts,
      },
      tanks: tankData.map((tank) => ({
        id: tank.tankId,
        name: tank.tankId.replace("tank", "Tank "),
        status: tank.status,
        health: tank.health,
        species: tank.species,
        behavior: tank.status,
      })),
      alerts: alerts.slice(0, 20).map((alert) => ({
        id: alert._id,
        type: alert.type,
        message: alert.message,
        tank: alert.tank,
        status: alert.status,
        createdAt: alert.createdAt,
        resolvedAt: alert.resolvedAt,
      })),
    };

    console.log("Report generated successfully");
    res.json({ success: true, data: reportData });
  } catch (error) {
    console.error("Error generating hatchery report:", error);
    res.status(500).json({
      success: false,
      error: "Failed to generate hatchery report",
      details: error.message,
    });
  }
};
