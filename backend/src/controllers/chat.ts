import { createClerkClient } from '@clerk/backend';
import { AIMessageChunk } from '@langchain/core/messages';
import { StreamEvent } from '@langchain/core/tracers/log_stream';
import { IterableReadableStream } from '@langchain/core/utils/stream';
import { Request, Response } from "express";
import { asyncHandler } from "../middleware/error-handler";
import { agent } from "../services/agent";
import { GenerationControlService } from "../services/generation-control";
import { storeMessage } from "../services/store";
import { UnauthorizedError, ValidationError } from "../utils/errors";
import { ApiResponse } from "../utils/response";

const clerkClient = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });

export const chatController = {
    chat: asyncHandler(async (req: Request | any, res: Response) => {
        const { message, threadId, socketId, docUrl } = req.body;
        const userId = req.auth?.userId;

        if (!userId) {
            throw new UnauthorizedError();
        }

        if (!message) {
            throw new ValidationError("Message is required");
        }

        // Return immediately to confirm receipt
        res.status(202).json({ success: true, message: "Processing started" });

        const conversationId = threadId || `user_${userId}`; // Default if not provided, though ideally should be provided or created

        try {
            // Check for stop signal
            GenerationControlService.clearSignal(conversationId);

            // Save user message immediately to ensure it's in the history
            await storeMessage({
                conversationId,
                content: message,
                role: 'user',
                docUrl,
            });

            // Fetch Google OAuth token from Clerk
            let googleToken: string | undefined;
            try {
                const clerkResponse = await clerkClient.users.getUserOauthAccessToken(userId, 'oauth_google');
                googleToken = clerkResponse.data[0]?.token;
            } catch (error) {
                // Log error but continue
                console.error('Error fetching Clerk OAuth token:', error);
            }

            const config = {
                configurable: {
                    thread_id: conversationId,
                },
                context: {
                    userId,
                    googleToken,
                } as const
            };

            const eventStream: IterableReadableStream<StreamEvent> = agent.streamEvents(
                { messages: [{ role: "user", content: message }] },
                {
                    version: "v2",
                    ...config
                }
            );

            let fullAssistantResponse: string = "";
            const io = (globalThis as any).io; // Access global io instance

            // If socketId is provided, emit to that specific socket
            // Otherwise, emit to userId room (assuming joined)
            // Ideally socketId is provided by frontend
            const targetSocket = socketId ? io.to(socketId) : io.to(userId);

            for await (const event of eventStream) {
                if (GenerationControlService.shouldStop(conversationId)) break;

                // 2. Filter for chat model stream events
                if (event.event === "on_chat_model_stream") {
                    const chunk = event.data.chunk as AIMessageChunk;

                    // chunk.text is the standard way to get string tokens in v1
                    const token: string = chunk.text;

                    if (token) {
                        targetSocket.emit('stream:status', { status: null });
                        fullAssistantResponse += token;
                        targetSocket.emit('stream:chunk', { chunk: token, done: false, conversationId });
                    }

                    // 3. Type-safe check for server-side tools (like webSearch)
                    // These are emitted as blocks inside the message content
                    if (Array.isArray(chunk.content)) {
                        const blocks = chunk.content as any[];
                        const hasWebSearch = blocks.some((block: any) =>
                            block.type === "server_tool_call_chunk" && block.name === "web_search"
                        );

                        if (hasWebSearch) {
                            targetSocket.emit('stream:status', { status: "Searching the web..." });
                        }
                    }
                }

                // 4. Filter for tool start events (for your custom tools)
                // Chunks are coming in
                if (event.event === "on_tool_start") {
                    // event.name is typed as string in StreamEvent
                    const toolMessages: Record<string, string> = {
                        "get_current_time": "Checking the time...",
                        "create_calendar_event": "Scheduling your meeting...",
                        "list_calendar_events": "Checking your calendar...",
                        "upsert_memory": "Remembering this for you...",
                        "calculator": "Doing some math...",
                        "search_personal_memory": "Searching your memories...",
                        "search_documents": "Searching your documents..."
                    };

                    const status: string = toolMessages[event.name] || `Using ${event.name}`;
                    targetSocket.emit('stream:status', { status });
                }

                if (event.event === "on_chat_model_start") {
                    targetSocket.emit('stream:status', {
                        status: "Thinking",
                    });
                }

                if (event.event === "on_chain_end") {
                    targetSocket.emit('stream:chunk', {
                        chunk: "",
                        done: true,
                        conversationId
                    });
                }
            }

            // Persist the full assistant message after the stream ends
            if (fullAssistantResponse) {
                await storeMessage({
                    conversationId,
                    content: fullAssistantResponse,
                    role: 'assistant',
                });
            }

        } catch (err) {
            console.error('Error in chat controller:', err);
            const io = (globalThis as any).io;
            if (io) {
                const targetSocket = socketId ? io.to(socketId) : io.to(userId);
                targetSocket.emit("error", "Failed to process message");
            }
        }
    }),

    stop: asyncHandler(async (req: Request | any, res: Response) => {
        const { threadId } = req.body;

        if (!threadId) {
            throw new ValidationError("Thread ID is required");
        }

        GenerationControlService.signalStop(threadId);
        return ApiResponse.success(res, { message: "Stop signal received" });
    }),
};
