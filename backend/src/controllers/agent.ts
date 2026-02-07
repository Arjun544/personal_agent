import { createAgent } from "langchain";
import { Server as SocketIOServer } from 'socket.io';
import { PERSONAL_PROMPT } from '../prompts/personal';

import { Request, Response } from 'express';
import { storeMessage } from "../services/store";
import { currentTimeTool } from '../tools/current-time-tool';

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

            // save user message
            await storeMessage(
                {
                    conversationId: conversationId!,
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

            const stream = await agent.stream(
                { messages: [{ role: "user", content: userMessage }] },
                { configurable: config, streamMode: "messages", }
            );

            let fullAssistantResponse = '';
            for await (const chunk of stream) {
                const data = chunk[0];
                if (data?.content) {
                    const content = data.content as string;
                    fullAssistantResponse += content;

                    io.to(socketId).emit('stream:chunk', {
                        chunk: content,
                        done: false,
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

            return res.status(200).json({
                message: 'Stream success',
                success: true,
            });

        } catch (error) {
            console.error(error)
            const errorMessage = error instanceof Error
                ? error.message
                : String(error);

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
