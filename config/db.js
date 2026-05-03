import mongoose from "mongoose";
import { env } from "./env.js";

mongoose.set("bufferCommands", false);

let hasLoggedMissingMongoUri = false;

export const isDatabaseReady = () => mongoose.connection.readyState === 1;

export const getDatabaseStatus = () => {
  if (isDatabaseReady()) {
    return "connected";
  }

  return env.mongoUri ? "disconnected" : "not_configured";
};

const connectDB = async () => {
  if (isDatabaseReady()) {
    return mongoose.connection;
  }

  if (!env.mongoUri) {
    if (!hasLoggedMissingMongoUri) {
      console.warn("MONGO_URI is not configured. Database-backed APIs will return 503.");
      hasLoggedMissingMongoUri = true;
    }

    return null;
  }

  try {
    await mongoose.connect(env.mongoUri);
    console.log("MongoDB connected");
    return mongoose.connection;
  } catch (error) {
    console.error("MongoDB connection failed:", error.message);
    return null;
  }
};

export default connectDB;
