import dotenv from "dotenv";
dotenv.config();

if (
  !process.env.CLERK_SECRET_KEY ||
  process.env.CLERK_SECRET_KEY.includes("REPLACE")
) {
  console.error(
    "\x1b[31m%s\x1b[0m",
    "CRITICAL ERROR: CLERK_SECRET_KEY is missing or invalid in .env!",
  );
  console.error(
    "Please ensure you have set CLERK_SECRET_KEY=sk_test_... in Backend/.env",
  );
  process.exit(1);
}

import http from "http";
import { Server } from "socket.io";
import app from "./app.js";
import { config } from "./config/env.js";

import { notificationService } from "./modules/notifications/notification.service.js";

const server = http.createServer(app);

// ✅ IMPORTANT: Export io so other modules can import it
export const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

// ✅ Pass io to notification service
notificationService.setSocketIO(io);

// ✅ Socket connect log
io.on("connection", (socket) => {
  console.log("Client connected for real-time alerts:", socket.id);

  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id);
  });
});

// ✅ Start server
server.listen(config.port, "0.0.0.0", () => {
  console.log(`Server running on http://localhost:${config.port}`);
  console.log(`AI Proxy Target: ${config.models.unified}`);

  if (config.models.unified.includes("localhost")) {
    console.warn("WARNING: AI_SERVICE_URL is set to localhost. This will fail in production unless on the same machine.");
  }
});
