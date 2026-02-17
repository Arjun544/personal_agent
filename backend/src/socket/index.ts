import { verifyToken } from "@clerk/clerk-sdk-node";
import { Server, Socket } from "socket.io";
import registerChatHandlers from "./chat-handler";

export function initSocket(httpServer: any) {
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
    },
  });

  io.use(async (socket: Socket | any, next: (err?: Error) => void) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) {
        console.warn("Socket connection attempt without token");
        return next(new Error("Authentication error: No token provided"));
      }

      const decoded = await verifyToken(token, {
        secretKey: process.env.CLERK_SECRET_KEY,
        // Add 60 seconds of clock skew tolerance
        clockSkewInMs: 60 * 1000,
      });


      console.log("Socket auth successful for user:", decoded.sub);
      socket.data.userId = decoded.sub;
      next();
    } catch (err) {
      console.error("Socket authentication error:", err);
      next(new Error("Authentication error: Invalid token"));
    }
  });

  io.on("connection", (socket: Socket | any) => {
    console.log("Connected:", socket.data.userId);

    registerChatHandlers(socket);
  });

  return io;
}
