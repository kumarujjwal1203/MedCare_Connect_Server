import app from "./app.js";
import { env } from "./config/env.js";
import connectDB from "./config/db.js";
import reminderJob from "./jobs/reminder.job.js";

const startServer = async () => {
  await connectDB();

  const server = app.listen(env.port);

  server.once("listening", () => {
    console.log(`Server running on port ${env.port}`);
    reminderJob.start();
  });

  server.once("error", (error) => {
    if (error.code === "EADDRINUSE") {
      console.error(
        `Port ${env.port} is already in use. Change PORT in Server/.env or stop the other process.`
      );
      process.exit(1);
    }

    console.error("Server startup failed:", error.message);
    process.exit(1);
  });
};

startServer().catch((error) => {
  console.error("Server startup failed:", error.message);
  process.exit(1);
});
