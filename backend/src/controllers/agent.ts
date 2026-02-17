import { createClerkClient } from '@clerk/backend';
import { Request, Response } from 'express';
import { Server as SocketIOServer } from 'socket.io';
import { agent } from "../services/agent";
import { storeMessage } from "../services/store";

const clerkClient = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });

export const agentController = {
    chat: async (req: Request | any, res: Response) => {
        try {
            const body = req.body as { message?: string; socketId: string; agent?: string; userId?: string; conversationId?: string };
            const userId = req.auth?.userId;
            if (!userId) {
                return res.status(401).json({ message: "Unauthorized", success: false });
            }
            const userMessage = body?.message || 'Hello! How can I help you today?';
            const socketId = body.socketId;
            const conversationId = body.conversationId;

            const io = (globalThis as any).io as SocketIOServer;

            if (!io) {
                return res.status(500).json({
                    message: 'Socket.IO server not initialized.',
                    success: false,
                });
            }

            // Verify socket association
            if (socketId) {
                const targetSocket = io.sockets.sockets.get(socketId);
                if (!targetSocket || targetSocket.data.userId !== userId) {
                    console.warn(`Unauthorized socket attempt: socket ${socketId} does not belong to user ${userId}`);
                    return res.status(403).json({
                        message: 'Forbidden: Invalid socket association',
                        success: false,
                    });
                }
            }

            // Save user message
            await storeMessage({
                conversationId: conversationId!,
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

            // Stream events from the LangGraph agent
            const eventStream = agent.streamEvents(
                { messages: [{ role: "user", content: userMessage }] },
                {
                    version: "v2",
                    configurable: {
                        thread_id: conversationId,
                    },
                    context: {
                        userId: userId!,
                        googleToken: googleToken,
                    }
                }
            );

            let fullAssistantResponse = '';
            for await (const event of eventStream) {
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

                if (event.event === "on_chat_model_start") {
                    io.to(socketId).emit('stream:status', { status: "Thinking" });
                }
            }

            // Signal completion to the client
            io.to(socketId).emit('stream:chunk', {
                chunk: "",
                done: true,
            });

            // Persist the assistant message
            await storeMessage({
                conversationId: conversationId!,
                content: fullAssistantResponse,
                role: 'assistant',
            });

            return res.status(200).json({
                message: 'Stream success',
                success: true,
            });

        } catch (error) {
            console.error('Error in agent controller:', error);
            const errorMessage = error instanceof Error ? error.message : String(error);

            // Emit error to socket if socketId was provided
            const body = req.body as { message?: string; socketId?: string };
            const socketId = body?.socketId;
            if (socketId) {
                const io = (globalThis as any).io as SocketIOServer;
                if (io) {
                    io.to(socketId).emit('stream:error', {
                        error: errorMessage,
                    });
                }
            }

            return res.status(500).json({
                message: 'An error occurred while processing your request.',
                error: errorMessage,
                success: false,
            });
        }
    },
};
