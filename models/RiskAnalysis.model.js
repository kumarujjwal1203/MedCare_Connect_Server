import mongoose from "mongoose";

const riskAnalysisSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    score: {
      type: Number,
      required: true
    },
    level: {
      type: String,
      enum: ["Low", "Moderate", "High"],
      required: true
    },
    factors: {
      type: [String],
      default: []
    },
    trend: {
      type: String,
      default: "Stable"
    }
  },
  { timestamps: true }
);

riskAnalysisSchema.index({ userId: 1, createdAt: -1 });

export default mongoose.model("RiskAnalysis", riskAnalysisSchema);
