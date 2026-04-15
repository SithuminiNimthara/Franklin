import mongoose from "mongoose";

const reportSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: [
        "monthly-conservation-summary",
        "turtle-health-analytics",
        "nest-protection-report",
        "shoreline-risk-assessment",
        "hatchery-management"
      ],
      required: true
    },
    title: String,
    filters: {
      from: Date,
      to: Date
    },
    generatedAt: {
      type: Date,
      default: Date.now
    },
    snapshot: {
      type: mongoose.Schema.Types.Mixed,
      required: true
    }
  },
  { timestamps: true }
);

export const Report = mongoose.model("Report", reportSchema);
