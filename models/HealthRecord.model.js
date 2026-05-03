import mongoose from "mongoose";

const healthRecordSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },

    source: {
      type: String,
      enum: ["chat", "prescription", "report"],
      required: true
    },

    symptoms: {
      type: [String],
      default: []
    },

    diagnosis: {
      type: String
    },

    medicines: [
      {
        name: String,
        dosage: String,
        duration: String
      }
    ],

    reportDate: {
      type: Date,
      default: Date.now
    }
  },
  { timestamps: true }
);

// 🔥 Performance index
healthRecordSchema.index({ userId: 1, createdAt: -1 });

export default mongoose.model("HealthRecord", healthRecordSchema);