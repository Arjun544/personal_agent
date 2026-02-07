import { createAgent } from "langchain";
import type { Server, Socket } from "socket.io";
import { PERSONAL_PROMPT } from "../prompts/personal";
import { storeMessage } from "../services/store";
import { currentTimeTool } from "../tools/current-time-tool";

type ChatMessage = {
    conversationId: string;
    userMessage: string;
    socketId: string;
    userId: string;
};

export default function registerChatHandlers(
    socket: Socket
) {
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
            // save user message
            await storeMessage(
                {
                    conversationId,
                    content: userMessage,
                    role: 'user',
                }
            );

            const agent = createAgent({
                model: "gpt-4o",
                tools: [currentTimeTool],
                systemPrompt: PERSONAL_PROMPT,
            });

            const config = {
                configurable: { thread_id: conversationId },
                context: { user_id: userId },
            };

            const eventStream = agent.streamEvents(
                { messages: [{ role: "user", content: userMessage }] },
                {
                    version: "v2", // Always use version v2
                    configurable: config
                }
            );


            let fullAssistantResponse = '';
            for await (const event of eventStream) {
                // 1. Stream tokens to the UI
                if (event.event === "on_chat_model_stream") {
                    const content = event.data.chunk.content;
                    if (content) {
                        fullAssistantResponse += content;
                        io.to(socketId).emit('stream:chunk', {
                            chunk: content,
                            done: false,
                        });
                    }
                }

                // 2. Stream tool calls (useful for status indicators)
                if (event.event === "on_tool_start") {
                    io.to(socketId).emit('stream:status', {
                        status: `Using tool: ${event.name}`,
                    });
                }
            }

            // Signal completion to the client
            io.to(socketId).emit('stream:chunk', {
                chunk: "",
                done: true,
            });

            // Persist the assistant message
            await storeMessage(
                {
                    conversationId: conversationId!,
                    content: fullAssistantResponse,
                    role: 'assistant',
                }
            );
        } catch (err) {
            socket.emit("error", "Failed to process message");
        }
    });
}
