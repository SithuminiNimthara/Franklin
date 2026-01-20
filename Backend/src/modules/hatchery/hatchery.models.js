import mongoose from "mongoose";

const VideoSchema = new mongoose.Schema({
  filename: { type: String, required: true },
  path: { type: String, required: true }, // The URL path for frontend
  originalName: { type: String },
  uploadDate: { type: Date, default: Date.now },
  status: {
    type: String,
    enum: ["uploaded", "processing", "completed", "error"],
    default: "uploaded",
  },
  analysis: {
    species: { type: String, default: "Pending" },
    behavior: { type: String, default: "Pending" },
    health: { type: String, default: "Pending" },
    confidence: { type: Number, default: 0 },
  },

  meta: {
    fileSize: Number,
    mimeType: String,
  },
});

export const HatcheryVideo = mongoose.model("HatcheryVideo", VideoSchema);
