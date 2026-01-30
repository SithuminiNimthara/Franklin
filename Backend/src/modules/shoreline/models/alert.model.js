import mongoose from "mongoose";

const AlertSchema = new mongoose.Schema(
  {
    type: { type: String, default: "shoreline", index: true }, // "shoreline"
    riskLevel: {
      type: String,
      enum: ["low", "medium", "high"],
      required: true,
      index: true,
    },
    message: { type: String, required: true },

    // operational workflow
    status: {
      type: String,
      enum: ["new", "acknowledged", "resolved"],
      default: "new",
      index: true,
    },

    // who handled it (optional)
    acknowledgedBy: { type: String, default: null },
    acknowledgedAt: { type: Date, default: null },

    resolvedBy: { type: String, default: null },
    resolvedAt: { type: Date, default: null },

    // optional metadata for dedupe + trace
    source: { type: String, default: "unknown", index: true }, // camera1/demo/offline
    cooldownKey: { type: String, default: null, index: true },

    // store full evaluation snapshot (boundaryCrossed, nestsAtRisk, shoreline, etc.)
    details: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }, // createdAt, updatedAt
);

// helpful indexes
AlertSchema.index({ createdAt: -1 });
AlertSchema.index({ status: 1, riskLevel: 1, createdAt: -1 });

export default mongoose.model("Alert", AlertSchema);
