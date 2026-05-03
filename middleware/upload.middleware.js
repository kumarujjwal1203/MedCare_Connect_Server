import multer from "multer";
import fs from "fs";
import { env } from "../config/env.js";

const uploadsDir = env.uploadDir;
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, uploadsDir),
  filename: (_, file, cb) => {
    const safeName = file.originalname
      .replace(/[^\w.\-]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");
    cb(null, `${Date.now()}-${safeName || "upload"}`);
  }
});

const fileFilter = (_, file, cb) => {
  const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp", "application/pdf"];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Invalid file type. Only JPEG, PNG, GIF, WebP, and PDF are allowed."), false);
  }
};

const upload = multer({ 
  storage,
  fileFilter,
  limits: {
    fileSize: env.maxFileSize
  }
});

export default upload;
