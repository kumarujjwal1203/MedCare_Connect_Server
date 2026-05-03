import mongoose from "mongoose";

const medicineSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true },
    dosage: { type: String, trim: true },
    duration: { type: String, trim: true }
  },
  { _id: false }
);

const prescriptionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    sourceRecordId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "HealthRecord"
    },
    extractedText: {
      type: String,
      default: ""
    },
    diagnosis: {
      type: String,
      default: ""
    },
    medicines: {
      type: [medicineSchema],
      default: []
    },
    issuingDoctor: {
      type: String,
      default: ""
    }
  },
  { timestamps: true }
);

prescriptionSchema.index({ userId: 1, createdAt: -1 });

export default mongoose.model("Prescription", prescriptionSchema);
