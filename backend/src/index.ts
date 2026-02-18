import { ClerkExpressWithAuth } from "@clerk/clerk-sdk-node";
import compression from "compression";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import { createServer } from "http";

import { errorHandler } from "./middleware/error-handler";
import { logger, requestLogger } from "./middleware/logger";
import { apiLimiter } from "./middleware/rate-limit";
import { agentRoutes } from "./routes/chat";
import { historyRoutes } from "./routes/history";
import { memoryRoutes } from "./routes/memory";
import { checkpointer } from "./services/checkpointer";
import { initSocket } from "./socket";

const PORT = process.env.PORT ? parseInt(process.env.PORT) : 5000;
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";

const app = express();
const server = createServer(app);

// Security middleware
app.use(helmet());

// Compression
app.use(compression());

// Clerk middleware
app.use(ClerkExpressWithAuth());

// CORS configuration
const allowedOrigins = [
  FRONTEND_URL,
  "http://localhost:3000",
  "http://127.0.0.1:3000",
];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        logger.warn(`CORS blocked origin: ${origin}`);
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Logging
app.use(requestLogger);

// Rate Limiting
app.use("/agent", apiLimiter); // Apply to sensitive routes

// Body parsing middleware
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Routes
app.get("/", (req: express.Request, res: express.Response) => {
  res.send("Agent Backend is running");
});

app.use("/agent", agentRoutes);
app.use("/history", historyRoutes);
app.use("/memories", memoryRoutes);

// Error Handling (must be after routes)
app.use(errorHandler);

// Persistence initialization
(async () => {
  try {
    await checkpointer.setup();
    logger.info("✅ PostgresSaver initialized.");
  } catch (err) {
    logger.error({ err }, "❌ Error initializing persistence:");
  }
})();

// Initialize Socket.IO
const io = initSocket(server);
(globalThis as any).io = io;

// Start server
server.listen(PORT, "0.0.0.0", () => {
  logger.info(`🚀 Express server is running at http://0.0.0.0:${PORT}`);
  logger.info(`🔌 Socket.IO server initialized on port ${PORT}`);
  logger.info(`🔗 CORS enabled for: ${FRONTEND_URL}`);
});

// Graceful shutdown
const shutdown = async () => {
  logger.info("Shutting down server...");
  server.close(async () => {
    logger.info("HTTP server closed.");
    process.exit(0);
  });
};

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);