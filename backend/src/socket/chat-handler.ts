import type { Server, Socket } from "socket.io";
import { agent } from "../services/agent";
import { storeMessage } from "../services/store";

type ChatMessage = {
    conversationId: string;
    userMessage: string;
    socketId: string;
    userId: string;
};
export default function registerChatHandlers(socket: Socket) {
    socket.on("user_message", async (payload: ChatMessage | { data: ChatMessage }) => {
        try {
            const data = "data" in payload ? payload.data : payload;
            const { conversationId, userMessage, socketId, userId } = data;
            console.log('user_message received', conversationId, userMessage, socketId, userId);

            const io = (globalThis as any).io as Server;
            if (!io) {
                socket.emit("error", "Socket.IO server not initialized.");
                return;
            }

            // Stream events from the LangGraph agent
            const eventStream = agent.streamEvents(
                { messages: [{ role: "user", content: userMessage }] },
                {
                    version: "v2",
                    configurable: {
                        thread_id: conversationId,
                    },
                    context: {
                        userId: userId,
                    }
                }
            );

            let fullAssistantResponse = '';
            for await (const event of eventStream) {
                // 1. Stream tokens to the UI
                if (event.event === "on_chat_model_stream") {
                    const content = event.data.chunk.content;
                    if (content) {
                        // Clear any tool/thinking status once we start receiving text
                        io.to(socketId).emit('stream:status', { status: null });

                        fullAssistantResponse += content;
                        io.to(socketId).emit('stream:chunk', {
                            chunk: content,
                            done: false,
                        });
                    }
                }

                // 2. Stream tool calls
                if (event.event === "on_tool_start") {
                    io.to(socketId).emit('stream:status', {
                        status: `Using ${event.name}`,
                    });
                }

                // 3. Thinking status
                if (event.event === "on_chat_model_start") {
                    io.to(socketId).emit('stream:status', {
                        status: "Thinking",
                    });
                }

                if (event.event === "on_chat_model_end") {
                    io.to(socketId).emit('stream:chunk', {
                        chunk: fullAssistantResponse,
                        done: true,
                    });

                    // Save messages
                    await storeMessage({
                        conversationId,
                        content: userMessage,
                        role: 'user',
                    });

                    await storeMessage({
                        conversationId: conversationId!,
                        content: fullAssistantResponse,
                        role: 'assistant',
                    });
                }
            }

        } catch (err) {
            console.error('Error in chat handler:', err);
            socket.emit("error", "Failed to process message");
        }
    });
}
