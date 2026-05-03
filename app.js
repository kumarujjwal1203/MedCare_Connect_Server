import "./config/env.js";
import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import authRoutes from "./routes/auth.routes.js";
import analyzeRoutes from "./routes/analyze.routes.js";
import chatRoutes from "./routes/chat.routes.js";
import doctorRoutes from "./routes/doctor.routes.js";
import healthRoutes from "./routes/health.routes.js";
import pharmacyRoutes from "./routes/pharmacy.routes.js";
import reminderRoutes from "./routes/reminder.routes.js";
import reportRoutes from "./routes/report.routes.js";
import userRoutes from "./routes/user.routes.js";
import { getDatabaseStatus } from "./config/db.js";
import { env } from "./config/env.js";
import errorHandler, { notFoundHandler } from "./middleware/error.middleware.js";
import { generalLimiter } from "./middleware/rateLimit.middleware.js";
import { sanitizeInput } from "./middleware/security.middleware.js";

const app = express();

const allowedOrigins = new Set(env.clientUrls);

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net", "https://unpkg.com"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://unpkg.com"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'", "https://*", "ws:"],
        frameAncestors: ["'self'"]
      }
    },
    crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" },
    crossOriginEmbedderPolicy: false
  })
);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) {
        return callback(null, true);
      }

      if (allowedOrigins.has(origin)) {
        return callback(null, true);
      }

      return callback(new Error(`CORS blocked for origin: ${origin}`));
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
    optionsSuccessStatus: 204
  })
);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cookieParser());
app.use(morgan(env.nodeEnv === "production" ? "combined" : "dev"));
app.use(generalLimiter);
app.use(sanitizeInput);

app.get("/api/healthcheck", (_req, res) => {
  res.status(200).json({
    status: "ok",
    message: "Server is reachable",
    database: getDatabaseStatus()
  });
});

app.use("/", analyzeRoutes);
app.use("/api", analyzeRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/user", userRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/health", healthRoutes);
app.use("/api/doctor", doctorRoutes);
app.use("/api/reminders", reminderRoutes);
app.use("/api/pharmacy", pharmacyRoutes);
app.use("/uploads", express.static(env.uploadDir));

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
