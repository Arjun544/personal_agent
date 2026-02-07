import { ChatOpenAI } from "@langchain/openai";
import { eq, desc } from "drizzle-orm";
import { Request, Response } from 'express';
import db from "../config/database";
import { conversationsTable, messagesTable } from "../config/schema";


export const historyController = {
    createConversation: async (req: Request, res: Response) => {
        try {
            const body = req.body as { userId: string};
            const { userId } = body;

            const conversation = await db.insert(conversationsTable).values({ userId }).returning();
            return res.json({ conversation: conversation[0], success: true });
        }
        catch (error) {
            const errorMessage = error instanceof Error
                ? error.message
                : String(error);
            return res.status(500).json({
                message: 'An error occurred while processing your request.',
                error: errorMessage,
                success: false,
            });
        }
    },
    getConversations: async (req: Request, res: Response) => {
        try {
            const body = req.query as { id: string };
            const userId = body.id;
            if (!userId) {
                return res.status(400).json({
                    message: 'User ID is required',
                    success: false,
                });
            }

            const conversations = await db.select().from(conversationsTable).where(eq(conversationsTable.userId, userId)).orderBy(desc(conversationsTable.createdAt));

            // Handle empty conversations
            if (conversations.length === 0) {
                return res.json({
                    history: [],
                    success: true,
                });
            }

            // Fetch first message for each conversation
            const conversationsWithFirstMessage = await Promise.all(
                conversations.map(async (conversation) => {
                    const messages = await db
                        .select()
                        .from(messagesTable)
                        .where(eq(messagesTable.conversationId, conversation.id))
                        .orderBy(messagesTable.createdAt) // Get the first (oldest) message
                        .limit(1);

                    // Extract content from the message item, default to empty string if no messages
                    const firstMessage = messages.length > 0
                        ? messages[0].content
                        : '';

                    return {
                        ...conversation,
                        firstMessage,
                    };
                })
            );

            return res.json({
                history: conversationsWithFirstMessage,
                success: true,
            });
        } catch (error) {
            const errorMessage = error instanceof Error
                ? error.message
                : String(error);
            return res.status(500).json({
                message: 'An error occurred while processing your request.',
                error: errorMessage,
                success: false,
            });
        }
    },
    getMessages: async (req: Request, res: Response) => {
        try {
            const body = req.query as { id: string };
            const id = body.id;
            if (!id) {
                return res.status(400).json({
                    message: 'ID is required',
                    success: false,
                });
            }

            const history = await db.select().from(messagesTable).where(eq(messagesTable.conversationId, id));
            return res.json({
                history,
                success: true,
            });
        } catch (error) {
            const errorMessage = error instanceof Error
                ? error.message
                : String(error);
            return res.status(500).json({
                message: 'An error occurred while processing your request.',
                error: errorMessage,
                success: false,
            });
        }
    },
    generateConversationName: async (req: Request, res: Response) => {
        try {
            const body = req.body as { id: string, message: string };
            const id = body.id;
            const message = body.message;
            if (!id) {
                return res.status(400).json({
                    message: 'ID is required',
                    success: false,
                });
            }
            if (!message) {
                return res.status(400).json({
                    message: 'Message is required',
                    success: false,
                });
            }

            const model = new ChatOpenAI({
                modelName: "gpt-4o-mini",
                temperature: 0,
                maxTokens: 20,
            });

            const response = await model.invoke(`
                Generate a short, concise conversation title (max 5 words) based on the user message.
                Respond with ONLY the title text.

                Examples:
                User: "Hi" -> Title: Greeting Exchange
                User: "What can you do for me?" -> Title: What can you do

                User Message: "${message}"
                Title:
            `);

            const content = response.content as string;

            const conversations = await db.update(conversationsTable).set({ title: content }).where(eq(conversationsTable.id, id)).returning();
            return res.json({
                conversation: conversations[0],
                success: true,
            });
        } catch (error) {
            console.error(error)
            const errorMessage = error instanceof Error
                ? error.message
                : String(error);
            return res.status(500).json({
                message: 'An error occurred while processing your request.',
                error: errorMessage,
                success: false,
            });
        }
    }
}