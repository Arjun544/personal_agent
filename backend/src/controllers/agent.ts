import { Request, Response } from 'express';
import { Server as SocketIOServer } from 'socket.io';
import { agent } from "../services/agent";
import { storeMessage } from "../services/store";

export const agentController = {
    chat: async (req: Request, res: Response) => {
        try {
            const body = req.body as { message?: string; socketId: string; agent?: string; userId?: string; conversationId?: string };
            const userId = body?.userId;
            const userMessage = body?.message || 'Hello! How can I help you today?';
            const socketId = body.socketId;
            const conversationId = body.conversationId;

            // Get Socket.IO instance
            const io = (globalThis as any).io as SocketIOServer;

            if (!io) {
                return res.status(500).json({
                    message: 'Socket.IO server not initialized.',
                    success: false,
                });
            }

            // Save user message
            await storeMessage({
                conversationId: conversationId!,
                content: userMessage,
                role: 'user',
            });

            // Stream events from the LangGraph agent
            const eventStream = agent.streamEvents(
                { messages: [{ role: "user", content: userMessage }] },
                {
                    version: "v2",
                    configurable: {
                        thread_id: conversationId,
                        user_id: userId,
                    }
                }
            );

            let fullAssistantResponse = '';
            for await (const event of eventStream) {
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
