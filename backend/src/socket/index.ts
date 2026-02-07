import { Server } from "socket.io";
import registerChatHandlers from "./chat-handler";

export function initSocket(httpServer: any) {
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
    },
  });

  io.on("connection", (socket) => {
    socket.data.userId = socket.id;
    console.log("Connected:", socket.data.userId);

    registerChatHandlers(socket);
  });

  return io;
}
