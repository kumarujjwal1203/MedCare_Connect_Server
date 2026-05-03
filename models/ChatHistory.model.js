import mongoose from "mongoose";

const chatHistorySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },

    userMessage: {
      type: String,
      required: true
    },

    aiResponse: {
      type: String,
      required: true
    }
  },
  { timestamps: true }
);

export default mongoose.model("ChatHistory", chatHistorySchema);