import mongoose from "mongoose";

const aiMemorySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      unique: true,
      required: true
    },

    frequentSymptoms: {
      type: [String],
      default: []
    },

    pastDiagnoses: {
      type: [String],
      default: []
    },

    medicationsHistory: {
      type: [String],
      default: []
    },

    riskPatterns: {
      type: [String],
      default: []
    },

    lastUpdated: {
      type: Date,
      default: Date.now
    }
  },
  { timestamps: true }
);

export default mongoose.model("AIMemory", aiMemorySchema);