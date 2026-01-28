import mongoose from "mongoose";

const TideSchema = new mongoose.Schema(
  {
    height_m: { type: Number, default: null },
    trend: {
      type: String,
      enum: ["rising", "falling", "steady", "unknown"],
      default: "unknown",
    },
    nextHighTideAt: { type: Date, default: null },
  },
  { _id: false },
);

const RainSchema = new mongoose.Schema(
  {
    last3h_mm: { type: Number, default: null },
    next6h_mm: { type: Number, default: null },
  },
  { _id: false },
);

const EnvironmentReadingSchema = new mongoose.Schema(
  {
    source: { type: String, enum: ["api", "manual"], required: true },
    station: { type: String, default: null }, // api station/city or beach name
    tide: { type: TideSchema, default: () => ({}) },
    rain: { type: RainSchema, default: () => ({}) },
    quality: {
      type: String,
      enum: ["good", "estimated", "unknown"],
      default: "unknown",
    },
    observedAt: { type: Date, default: Date.now }, // when reading is valid
  },
  { timestamps: true },
);

export default mongoose.model("EnvironmentReading", EnvironmentReadingSchema);
