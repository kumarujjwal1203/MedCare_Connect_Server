import mongoose from "mongoose";

const reminderSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    type: {
      type: String,
      enum: ["checkup", "medication", "vaccination", "test", "general"],
      default: "general"
    },

    title: {
      type: String,
      required: true
    },

    description: {
      type: String
    },

    scheduledDate: {
      type: Date,
      required: true
    },

    isCompleted: {
      type: Boolean,
      default: false
    },

    recurring: {
      enabled: {
        type: Boolean,
        default: false
      },
      interval: {
        type: String,
        enum: ["daily", "weekly", "monthly", "yearly"],
        default: "monthly"
      }
    },

    notificationSent: {
      type: Boolean,
      default: false
    }
  },
  { timestamps: true }
);

reminderSchema.index({ userId: 1, scheduledDate: 1 });
reminderSchema.index({ isCompleted: 1, scheduledDate: 1 });

export default mongoose.model("Reminder", reminderSchema);
