import "dotenv/config";

import http from "http";
import { Server } from "socket.io";

import app from "./app.js";
import { config } from "./config/env.js";

// Create HTTP server using Express app
const httpServer = http.createServer(app);

// ✅ Export io so controllers can import it
export const io = new Server(httpServer, {
  cors: { origin: "*" },
});

// Start server
httpServer.listen(config.port, () => {
  console.log(`Server running on http://localhost:${config.port}`);
});
