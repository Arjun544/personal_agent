import { createClerkClient } from '@clerk/backend';
import { AIMessageChunk } from '@langchain/core/messages';
import { StreamEvent } from '@langchain/core/tracers/log_stream';
import { IterableReadableStream } from '@langchain/core/utils/stream';
import type { Socket } from "socket.io";
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
        stopSignal = true;
    });

    socket.on("user_message", async (payload: ChatMessage | { data: ChatMessage }) => {
        try {
            stopSignal = false;
            const data = "data" in payload ? payload.data : payload;
            const { conversationId, userMessage } = data;
            const userId = socket.data.userId;

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
                    googleToken = clerkResponse.data[0]?.token;
                } catch (error) {
                    console.error('Error fetching Clerk OAuth token:', error);
                }
            }

            const eventStream: IterableReadableStream<StreamEvent> = agent.streamEvents(
                { messages: [{ role: "user", content: userMessage }] },
                {
                    version: "v2",
                    configurable: { thread_id: conversationId },
                    context: { userId, googleToken }
                }
            );

            let fullAssistantResponse: string = "";

            for await (const event of eventStream) {
                if (stopSignal) break;

                // 2. Filter for chat model stream events
                if (event.event === "on_chat_model_stream") {
                    const chunk = event.data.chunk as AIMessageChunk;

                    // chunk.text is the standard way to get string tokens in v1
                    const token: string = chunk.text;

                    if (token) {
                        socket.emit('stream:status', { status: null });
                        fullAssistantResponse += token;
                        socket.emit('stream:chunk', { chunk: token, done: false });
                    }

                    // 3. Type-safe check for server-side tools (like webSearch)
                    // These are emitted as blocks inside the message content
                    if (Array.isArray(chunk.content)) {
                        const blocks = chunk.content as any[];
                        const hasWebSearch = blocks.some((block: any) =>
                            block.type === "server_tool_call_chunk" && block.name === "web_search"
                        );

                        if (hasWebSearch) {
                            socket.emit('stream:status', { status: "Searching the web..." });
                        }
                    }
                }

                // 4. Filter for tool start events (for your custom tools)
                if (event.event === "on_tool_start") {
                    // event.name is typed as string in StreamEvent
                    const toolMessages: Record<string, string> = {
                        "get_current_time": "Checking the time...",
                        "create_calendar_event": "Scheduling your meeting...",
                        "list_calendar_events": "Checking your calendar...",
                        "upsert_memory": "Remembering this for you...",
                        "calculator": "Doing some math...",
                        "search_documents": "Searching your documents..."
                    };

                    const status: string = toolMessages[event.name] || `Using ${event.name}`;
                    socket.emit('stream:status', { status });
                }

                if (event.event === "on_chat_model_start") {
                    socket.emit('stream:status', {
                        status: "Thinking",
                    });
                }
            }
            // for await (const event of eventStream) {
            //     if (stopSignal) {
            //         break;
            //     }

            //     // 1. Stream tokens to the UI
            //     if (event.event === "on_chat_model_stream") {
            //         const content = event.data.chunk.content;
            //         if (content) {
            //             socket.emit('stream:status', { status: null });

            //             fullAssistantResponse += content;
            //             socket.emit('stream:chunk', {
            //                 chunk: content,
            //                 done: false,
            //             });
            //         }
            //     }

            //     // 2. Stream tool calls with user-friendly messages
            //     if (event.event === "on_tool_start") {
            //         const toolMessages: Record<string, string> = {
            //             "get_current_time": "Checking the time...",
            //             "create_calendar_event": "Scheduling your meeting...",
            //             "list_calendar_events": "Checking your calendar...",
            //             "upsert_memory": "Remembering this for you...",
            //             "calculate": "Doing some math...",
            //             "webSearch": "Searching the web...",
            //         };

            //         const status = toolMessages[event.name] || `Using ${event.name}`;
            //         socket.emit('stream:status', { status });
            //     }

            //     // 3. Thinking status
            //     if (event.event === "on_chat_model_start") {
            //         socket.emit('stream:status', {
            //             status: "Thinking",
            //         });
            //     }
            // }

            // Signal completion to the client after all events are processed
            socket.emit('stream:chunk', {
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
