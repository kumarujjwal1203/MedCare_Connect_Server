import mongoose from "mongoose";

const pharmacyRequestSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    medicineName: {
      type: String,
      required: true,
      trim: true,
    },
    userLocation: {
      lat: { type: Number, required: true },
      lng: { type: Number, required: true },
      address: { type: String, default: "" },
    },
    pharmacy: {
      placeId: String,
      name: { type: String, required: true },
      address: String,
      phone: String,
      rating: Number,
      isOpen: Boolean,
      location: {
        lat: Number,
        lng: Number,
      },
    },
    status: {
      type: String,
      enum: ["pending", "sent", "confirmed", "cancelled"],
      default: "sent",
    },
    notificationMessage: String,
  },
  { timestamps: true }
);

export default mongoose.model("PharmacyRequest", pharmacyRequestSchema);
