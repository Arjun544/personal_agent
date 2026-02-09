import cors from "cors";
import express from "express";
import { createServer } from "http";

import { agentRoutes } from "./routes/agent";
import { historyRoutes } from "./routes/history";
import { initSocket } from "./socket";

const PORT = process.env.PORT ? parseInt(process.env.PORT) : 5000;
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";

const app = express();
const server = createServer(app);

// CORS configuration
const allowedOrigins = [
  FRONTEND_URL,
  "http://localhost:3000",
  "http://127.0.0.1:3000",
];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        console.warn(`CORS blocked origin: ${origin}`);
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.get("/", (req: express.Request, res: express.Response) => {
  res.send("Hello Express");
});

app.use("/agent", agentRoutes);
app.use("/history", historyRoutes);

import { checkpointer, store } from "./services/checkpointer";

(async () => {
  try {
    await checkpointer.setup();
    await store.setup();
    console.log("✅ PostgresSaver and PostgresStore initialized.");
  } catch (err) {
    console.error("❌ Error initializing persistence:", err);
  }
})();


// Initialize Socket.IO
const io = initSocket(server);
(globalThis as any).io = io;


// Start server
server.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Express server is running at http://0.0.0.0:${PORT}`);
  console.log(`🔌 Socket.IO server initialized on port ${PORT}`);
  console.log(`🔗 CORS enabled for: ${FRONTEND_URL}`);
});