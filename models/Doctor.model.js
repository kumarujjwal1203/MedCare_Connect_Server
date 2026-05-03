import mongoose from "mongoose";

const doctorSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },

    specialization: {
      type: String,
      required: true,
      index: true
    },

    hospital: {
      type: String,
      trim: true
    },

    location: {
      address: String,
      city: String,
      state: String,
      pincode: String
    },

    contact: {
      phone: String,
      email: String
    },

    qualifications: {
      type: [String],
      default: []
    },

    experience: {
      years: Number,
      description: String
    },

    availability: {
      type: Boolean,
      default: true
    },

    consultationHours: {
      start: String,
      end: String,
      days: [String]
    },

    fees: {
      initial: Number,
      followUp: Number,
      currency: {
        type: String,
        default: "INR"
      }
    },

    rating: {
      average: {
        type: Number,
        default: 0,
        min: 0,
        max: 5
      },
      count: {
        type: Number,
        default: 0
      }
    },

    isActive: {
      type: Boolean,
      default: true
    }
  },
  { timestamps: true }
);

doctorSchema.index({ specialization: 1, availability: 1 });
doctorSchema.index({ "location.city": 1, specialization: 1 });
doctorSchema.index({ name: "text", specialization: "text" });

export default mongoose.model("Doctor", doctorSchema);
