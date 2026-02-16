import { createClerkClient } from '@clerk/backend';
import type { Server, Socket } from "socket.io";
import { agent } from "../services/agent";
import { storeMessage } from "../services/store";

const clerkClient = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });

type ChatMessage = {
    conversationId: string;
    userMessage: string;
    socketId: string;
    userId: string;
};

export default function registerChatHandlers(socket: Socket) {
    let stopSignal = false;

    socket.on("stop_generation", (payload: { conversationId: string }) => {
        console.log('stop_generation received for', payload.conversationId);
        stopSignal = true;
    });

    socket.on("user_message", async (payload: ChatMessage | { data: ChatMessage }) => {
        try {
            stopSignal = false;
            const data = "data" in payload ? payload.data : payload;
            const { conversationId, userMessage, socketId, userId } = data;
            console.log('user_message received', conversationId, userMessage, socketId, userId);

            const io = (globalThis as any).io as Server;
            if (!io) {
                socket.emit("error", "Socket.IO server not initialized.");
                return;
            }

            // Save user message immediately to ensure it's in the history
            await storeMessage({
                conversationId,
                content: userMessage,
                role: 'user',
            });

            // Fetch Google OAuth token from Clerk
            let googleToken: string | undefined;
            if (userId) {
                try {
                    const clerkResponse = await clerkClient.users.getUserOauthAccessToken(userId, 'oauth_google');
                    console.log('clerkResponse', clerkResponse);
                    googleToken = clerkResponse.data[0]?.token;
                    console.log('Google Token retrieved:', !!googleToken);
                } catch (error) {
                    console.error('Error fetching Clerk OAuth token:', error);
                }
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
                        googleToken: googleToken,
                    }
                }
            );

            let fullAssistantResponse = '';
            for await (const event of eventStream) {
                if (stopSignal) {
                    console.log('Stopping generation as per stopSignal');
                    break;
                }

                // 1. Stream tokens to the UI
                if (event.event === "on_chat_model_stream") {
                    const content = event.data.chunk.content;
                    if (content) {
                        io.to(socketId).emit('stream:status', { status: null });

                        fullAssistantResponse += content;
                        io.to(socketId).emit('stream:chunk', {
                            chunk: content,
                            done: false,
                        });
                    }
                }

                // 2. Stream tool calls with user-friendly messages
                if (event.event === "on_tool_start") {
                    const toolMessages: Record<string, string> = {
                        "get_current_time": "Checking the time...",
                        "create_calendar_event": "Scheduling your meeting...",
                        "list_calendar_events": "Checking your calendar...",
                        "upsert_memory": "Remembering this for you...",
                        "calculate": "Doing some math...",
                    };

                    const status = toolMessages[event.name] || `Using ${event.name}`;
                    io.to(socketId).emit('stream:status', { status });
                }

                // 3. Thinking status
                if (event.event === "on_chat_model_start") {
                    io.to(socketId).emit('stream:status', {
                        status: "Thinking",
                    });
                }

                if (event.event === "on_chat_model_end") {
                    // Signal model end if needed, but the final done signal is sent after the loop
                }
            }

            // Signal completion to the client after all events are processed
            io.to(socketId).emit('stream:chunk', {
                chunk: "",
                done: true,
            });

            // Persist the full assistant message after the stream ends
            if (fullAssistantResponse) {
                await storeMessage({
                    conversationId,
                    content: fullAssistantResponse,
                    role: 'assistant',
                });
            }

        } catch (err) {
            console.error('Error in chat handler:', err);
            socket.emit("error", "Failed to process message");
        }
    });
}
