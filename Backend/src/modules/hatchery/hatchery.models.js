import mongoose from "mongoose";

const VideoSchema = new mongoose.Schema({
  filename: { type: String, required: true },
  path: { type: String, required: true },
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

const AlertSchema = new mongoose.Schema({
  type: { type: String, required: true },
  message: { type: String, required: true },
  tank: { type: String, required: true },
  location: { type: String },
  status: { 
    type: String, 
    enum: ["pending", "acknowledged", "resolved"],
    default: "pending" 
  },
  notes: { type: String, default: "" },           
  resolvedBy: { type: String },                   
  resolvedAt: { type: Date },                     
  createdAt: { type: Date, default: Date.now },
});


export const HatcheryVideo = mongoose.model("HatcheryVideo", VideoSchema);
export const HatcheryAlert = mongoose.model("HatcheryAlert", AlertSchema);
