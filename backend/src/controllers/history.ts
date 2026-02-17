import { ChatOpenAI } from "@langchain/openai";
import { and, desc, eq, lt } from "drizzle-orm";
import { Request, Response } from 'express';
import db from "../config/database";
import { conversationsTable, messagesTable } from "../config/schema";


export const historyController = {
    createConversation: async (req: Request | any, res: Response) => {
        try {
            const userId = req.auth?.userId;
            if (!userId) {
                return res.status(401).json({ message: "Unauthorized", success: false });
            }

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
    getConversations: async (req: Request | any, res: Response) => {
        try {
            const userId = req.auth?.userId;
            if (!userId) {
                return res.status(401).json({ message: "Unauthorized", success: false });
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
    getMessages: async (req: Request | any, res: Response) => {
        try {
            const userId = req.auth?.userId;
            const { id, limit = '20', cursor } = req.query as { id: string, limit?: string, cursor?: string };
            if (!id) {
                return res.status(400).json({ message: 'ID is required', success: false });
            }

            // Verify ownership
            const conv = await db.select().from(conversationsTable).where(and(eq(conversationsTable.id, id), eq(conversationsTable.userId, userId))).limit(1);
            if (conv.length === 0) {
                return res.status(403).json({ message: 'Forbidden', success: false });
            }

            const limitNum = parseInt(limit);

            let query = db.select()
                .from(messagesTable)
                .where(eq(messagesTable.conversationId, id))
                .orderBy(desc(messagesTable.createdAt))
                .limit(limitNum);

            if (cursor && cursor !== 'undefined') {
                query = db.select()
                    .from(messagesTable)
                    .where(and(eq(messagesTable.conversationId, id), lt(messagesTable.createdAt, new Date(cursor))))
                    .orderBy(desc(messagesTable.createdAt))
                    .limit(limitNum);
            }

            const history = await query;

            return res.json({
                history: history.reverse(), // Reverse to send in ascending order for the page, but the query got the latest
                nextCursor: history.length === limitNum ? history[0].createdAt : null, // history[0] because it's desc, so last in result is oldest
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
    generateConversationName: async (req: Request | any, res: Response) => {
        try {
            const userId = req.auth?.userId;
            const body = req.body as { id: string, message: string };
            const id = body.id;
            const message = body.message;
            if (!id) {
                return res.status(400).json({ message: 'ID is required', success: false });
            }

            // Verify ownership
            const conv = await db.select().from(conversationsTable).where(and(eq(conversationsTable.id, id), eq(conversationsTable.userId, userId))).limit(1);
            if (conv.length === 0) {
                return res.status(403).json({ message: 'Forbidden', success: false });
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