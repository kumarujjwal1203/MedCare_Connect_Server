import { env } from "../config/env.js";

export const notFoundHandler = (req, res) => {
  res.status(404).json({ message: "Route not found" });
};

const errorHandler = (err, req, res, next) => {
  console.error("Error:", err.message || err);

  if (err.message?.includes("CORS")) {
    return res
      .status(403)
      .json({ message: "CORS not allowed for this origin" });
  }

  if (err.type === "entity.parse.failed") {
    return res.status(400).json({ message: "Invalid JSON payload" });
  }

  if (err.name === "MulterError") {
    const status = err.code === "LIMIT_FILE_SIZE" ? 413 : 400;
    return res.status(status).json({
      message:
        err.code === "LIMIT_FILE_SIZE"
          ? "Uploaded file is too large."
          : err.message || "File upload failed."
    });
  }

  if (err.message?.includes("Invalid file type")) {
    return res.status(400).json({ message: err.message });
  }

  return res.status(500).json({
    message:
      env.nodeEnv === "production"
        ? "Internal server error"
        : err.message || "Internal Server Error"
  });
};

export default errorHandler;
