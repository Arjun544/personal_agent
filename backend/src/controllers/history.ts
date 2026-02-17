import { ChatOpenAI } from "@langchain/openai";
import { and, desc, eq, lt } from "drizzle-orm";
import { Request, Response } from 'express';
import db from "../config/database";
import { conversationsTable, messagesTable } from "../config/schema";
import { asyncHandler } from "../middleware/error-handler";
import { CONVERSATION_TITLE_PROMPT } from "../prompts/conversation-title";
import { CacheService } from "../services/cache";
import { CacheKeys } from "../utils/cache_keys";
import { ForbiddenError, UnauthorizedError, ValidationError } from "../utils/errors";
import { ApiResponse } from "../utils/response";


export const historyController = {
    createConversation: asyncHandler(async (req: Request | any, res: Response) => {
        const userId = req.auth?.userId;
        if (!userId) {
            throw new UnauthorizedError();
        }

        const conversation = await db.insert(conversationsTable).values({ userId }).returning();

        // Invalidate conversations cache for this user
        await CacheService.delete(CacheKeys.conversations(userId));

        return ApiResponse.success(res, { conversation: conversation[0] });
    }),

    getConversations: asyncHandler(async (req: Request | any, res: Response) => {
        const userId = req.auth?.userId;
        if (!userId) {
            throw new UnauthorizedError();
        }

        // Try to get from cache first
        const cacheKey = CacheKeys.conversations(userId);
        const cachedData = await CacheService.get<any>(cacheKey);

        if (cachedData) {
            return ApiResponse.success(res, { history: cachedData });
        }

        // If not in cache, fetch from database
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

        // Cache the result for 5 minutes (300 seconds)
        await CacheService.set(cacheKey, conversationsWithFirstMessage, 300);

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

        // Try to get from cache first
        const cacheKey = CacheKeys.messages(id, limit, cursor);
        const cachedData = await CacheService.get<any>(cacheKey);

        if (cachedData) {
            return ApiResponse.success(res, cachedData);
        }

        // If not in cache, fetch from database
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

        const responseData = {
            history: history.reverse(),
            nextCursor: history.length === limitNum ? history[0].createdAt : null,
        };

        // Cache the result for 5 minutes (300 seconds)
        await CacheService.set(cacheKey, responseData, 300);

        return ApiResponse.success(res, responseData);
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

        const response = await model.invoke(
            CONVERSATION_TITLE_PROMPT.replace('{message}', message)
        );

        const content = response.content as string;

        const updated = await db.update(conversationsTable)
            .set({ title: content })
            .where(eq(conversationsTable.id, id))
            .returning();

        // Invalidate conversations cache for this user
        await CacheService.delete(CacheKeys.conversations(userId));

        return ApiResponse.success(res, { conversation: updated[0] });
    }),
    
    deleteConversation: asyncHandler(async (req: Request | any, res: Response) => {
        const userId = req.auth?.userId;
        const { id } = req.params as { id: string };

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

        const { deleteConversation: deleteConv } = await import("../services/store");
        await deleteConv(id, userId);

        return ApiResponse.success(res, { message: "Conversation deleted successfully" });
    }),

    deleteMessage: asyncHandler(async (req: Request | any, res: Response) => {
        const userId = req.auth?.userId;
        const { id, conversationId } = req.body as { id: string, conversationId: string };

        if (!id || !conversationId) {
            throw new ValidationError("Message ID and Conversation ID are required");
        }

        // Verify ownership of the conversation
        const conv = await db.select()
            .from(conversationsTable)
            .where(and(eq(conversationsTable.id, conversationId), eq(conversationsTable.userId, userId)))
            .limit(1);

        if (conv.length === 0) {
            throw new ForbiddenError("You do not have access to this conversation");
        }

        const { deleteMessage: deleteMsg } = await import("../services/store");
        await deleteMsg(id, conversationId, userId);

        return ApiResponse.success(res, { message: "Message deleted successfully" });
    })
}
