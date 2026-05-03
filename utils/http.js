import { getDatabaseStatus, isDatabaseReady } from "../config/db.js";

export const requireDatabase = (res) => {
  if (isDatabaseReady()) {
    return true;
  }

  res.status(503).json({
    message: "Database is currently unavailable",
    database: getDatabaseStatus()
  });

  return false;
};
