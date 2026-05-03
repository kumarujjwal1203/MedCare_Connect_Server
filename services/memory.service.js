import AIMemory from "../models/AIMemory.model.js";

export const getAIMemory = async (userId) =>
  await AIMemory.findOne({ userId });

export const updateAIMemory = async (userId, data) =>
  await AIMemory.findOneAndUpdate(
    { userId },
    { $addToSet: data, lastUpdated: new Date() },
    { upsert: true, returnDocument: "after" }
  );
