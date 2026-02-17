import { and, eq } from "drizzle-orm";
import db from "../config/database";
import { conversationsTable, messagesTable } from "../config/schema";
import { CacheKeys } from "../utils/cache_keys";
import { CacheService } from "./cache";


export const storeConversation = async (data: typeof conversationsTable.$inferInsert): Promise<string> => {
    try {
        const conversations = await db.insert(conversationsTable).values(data).returning({ id: conversationsTable.id });

        // Invalidate conversations cache for this user
        if (data.userId) {
            await CacheService.delete(CacheKeys.conversations(data.userId));
        }

        return conversations[0].id;
    } catch (error) {
        throw error;

    }
}


export const storeMessage = async (data: typeof messagesTable.$inferInsert) => {
    try {
        await db.insert(messagesTable).values(data);

        // Invalidate all cached messages for this conversation
        if (data.conversationId) {
            await CacheService.deletePattern(CacheKeys.messagesPattern(data.conversationId));

            // Also invalidate conversations cache since first message might have changed
            // We need to get the userId from the conversation
            const conv = await db.select()
                .from(conversationsTable)
                .where(eq(conversationsTable.id, data.conversationId))
                .limit(1);

            if (conv.length > 0 && conv[0].userId) {
                await CacheService.delete(CacheKeys.conversations(conv[0].userId));
            }
        }
    } catch (error) {
        throw error;

    }
}

export const deleteConversation = async (id: string, userId: string) => {
    try {
        await db.delete(conversationsTable)
            .where(and(eq(conversationsTable.id, id), eq(conversationsTable.userId, userId)));

        // Invalidate caches
        await CacheService.delete(CacheKeys.conversations(userId));
        await CacheService.deletePattern(CacheKeys.messagesPattern(id));
    } catch (error) {
        throw error;
    }
}

export const deleteMessage = async (id: string, conversationId: string, userId: string) => {
    try {
        await db.delete(messagesTable)
            .where(eq(messagesTable.id, id));

        // Invalidate caches
        await CacheService.deletePattern(CacheKeys.messagesPattern(conversationId));
        await CacheService.delete(CacheKeys.conversations(userId));
    } catch (error) {
        throw error;
    }
}