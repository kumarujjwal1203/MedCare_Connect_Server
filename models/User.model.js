import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
    },

    password: {
      type: String,
      required: true,
      select: false,
    },

    age: {
      type: Number,
      required: true,
    },

    gender: {
      type: String,
      enum: ["Male", "Female", "Other"],
      required: true,
    },

    allergies: {
      type: [String],
      default: [],
    },

    chronicConditions: {
      type: [String],
      default: [],
    },
    profilePic: {
      type: String,
      default: "",
    },
    refreshToken: {
      type: String,
      select: false,
      default: null,
    },
    googleId: {
      type: String,
      select: false,
      default: null,
    },
    resetPasswordToken: {
      type: String,
      select: false,
      default: null,
    },
    resetPasswordExpires: {
      type: Date,
      select: false,
      default: null,
    },
  },
  { timestamps: true },
);

export default mongoose.model("User", userSchema);
