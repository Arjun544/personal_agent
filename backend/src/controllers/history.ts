import { ChatOpenAI } from "@langchain/openai";
import { and, desc, eq, lt } from "drizzle-orm";
import { Request, Response } from 'express';
import db from "../config/database";
import { conversationsTable, messagesTable } from "../config/schema";
import { asyncHandler } from "../middleware/error-handler";
import { ForbiddenError, UnauthorizedError, ValidationError } from "../utils/errors";
import { ApiResponse } from "../utils/response";


export const historyController = {
    createConversation: asyncHandler(async (req: Request | any, res: Response) => {
        const userId = req.auth?.userId;
        if (!userId) {
            throw new UnauthorizedError();
        }

        const conversation = await db.insert(conversationsTable).values({ userId }).returning();
        return ApiResponse.success(res, { conversation: conversation[0] });
    }),

    getConversations: asyncHandler(async (req: Request | any, res: Response) => {
        const userId = req.auth?.userId;
        if (!userId) {
            throw new UnauthorizedError();
        }

        const conversations = await db.select()
            .from(conversationsTable)
            .where(eq(conversationsTable.userId, userId))
            .orderBy(desc(conversationsTable.createdAt));

        // Fetch first message for each conversation
        const conversationsWithFirstMessage = await Promise.all(
            conversations.map(async (conversation) => {
                const messages = await db
                    .select()
                    .from(messagesTable)
                    .where(eq(messagesTable.conversationId, conversation.id))
                    .orderBy(messagesTable.createdAt)
                    .limit(1);

                return {
                    ...conversation,
                    firstMessage: messages.length > 0 ? messages[0].content : '',
                };
            })
        );

        return ApiResponse.success(res, { history: conversationsWithFirstMessage });
    }),

    getMessages: asyncHandler(async (req: Request | any, res: Response) => {
        const userId = req.auth?.userId;
        const { id, limit = '20', cursor } = req.query as { id: string, limit?: string, cursor?: string };

        if (!id) {
            throw new ValidationError("ID is required");
        }

        // Verify ownership
        const conv = await db.select()
            .from(conversationsTable)
            .where(and(eq(conversationsTable.id, id), eq(conversationsTable.userId, userId)))
            .limit(1);

        if (conv.length === 0) {
            throw new ForbiddenError("You do not have access to this conversation");
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

        return ApiResponse.success(res, {
            history: history.reverse(),
            nextCursor: history.length === limitNum ? history[0].createdAt : null,
        });
    }),

    generateConversationName: asyncHandler(async (req: Request | any, res: Response) => {
        const userId = req.auth?.userId;
        const { id, message } = req.body as { id: string, message: string };

        if (!id) {
            throw new ValidationError("ID is required");
        }
        if (!message) {
            throw new ValidationError("Message is required");
        }

        // Verify ownership
        const conv = await db.select()
            .from(conversationsTable)
            .where(and(eq(conversationsTable.id, id), eq(conversationsTable.userId, userId)))
            .limit(1);

        if (conv.length === 0) {
            throw new ForbiddenError();
        }

        const model = new ChatOpenAI({
            modelName: "gpt-4o-mini",
            temperature: 0,
            maxTokens: 20,
        });

        const response = await model.invoke(`
            Generate a short, concise conversation title (max 5 words) based on the user message.
            Respond with ONLY the title text.

            User Message: "${message}"
        `);

        const content = response.content as string;

        const updated = await db.update(conversationsTable)
            .set({ title: content })
            .where(eq(conversationsTable.id, id))
            .returning();

        return ApiResponse.success(res, { conversation: updated[0] });
    })
}
