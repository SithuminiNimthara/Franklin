import axios from "axios";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { HatcheryVideo } from "./hatchery.models.js";

// Helper to get root directory
const __filename = fileURLToPath(import.meta.url);
const rootDir = path.join(path.dirname(__filename), "../../../");

// Python will call this endpoint to update the DB
export const updateVideoAnalysis = async (req, res) => {
  try {
    const { videoId } = req.params;
    const { species, behavior, health } = req.body;

    // Strip "upload_" prefix if present to get real Mongo ID
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

    console.log(`AI Analysis saved for ${dbId}: ${species} - ${behavior}`);
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
    const response = await axios.get(`http://localhost:5001/data/${tankId}`);
    res.json(response.data);
  } catch (error) {
    console.error("Error fetching tank stats:", error.message);
    res.status(500).json({ error: "Failed to fetch stats" });
  }
};

// Get alerts
export const getAlerts = async (req, res) => {
  try {
    const response = await axios.get("http://localhost:5001/alerts");
    res.json(response.data);
  } catch (error) {
    console.error("Error connecting to Python AI service:", error.message);
    res.json([]);
  }
};

// Upload video
export const uploadFootage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No video file uploaded" });
    }

    const PORT = process.env.PORT || 5002;
    const videoUrl = `http://localhost:${PORT}/api/hatchery/video/${req.file.filename}`;

    // 1.Save DB entry
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

    // 2.Register video with python AI
    const absoluteVideoPath = path.join(
      rootDir,
      "uploads",
      "hatchery",
      req.file.filename,
    );

    await axios.post("http://localhost:5001/register_upload", {
      videoId: `upload_${newVideo._id}`,
      videoPath: absoluteVideoPath,
    });

    // 3.Respond to frontend
    res.status(201).json({
      message: "Upload successful",
      videoId: newVideo._id,
      streamUrl: `http://localhost:5001/stream/upload_${newVideo._id}`,
      rawVideoUrl: videoUrl,
    });
  } catch (error) {
    console.error("Upload Controller Error:", error.message);
    res.status(500).json({ message: "Server error during upload" });
  }
};

// Save raw video file
export const streamVideo = (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(rootDir, "uploads", "hatchery", filename);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ message: "Video not found" });
  }

  res.sendFile(filePath);
};
