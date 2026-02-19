import { OpenAIEmbeddings } from "@langchain/openai";
import { and, desc, eq, lt, sql } from "drizzle-orm";
import { db } from "../config/database";
import { memoriesTable } from "../config/schema";
import { CacheKeys } from "../utils/cache_keys";
import { CacheService } from "./cache";

export const embeddings = new OpenAIEmbeddings({
    modelName: "text-embedding-3-small", // or "text-embedding-ada-002"
});

export async function saveMemory(userId: string, key: string, content: string) {
    const [embedding] = await embeddings.embedDocuments([content]);

    await db.insert(memoriesTable).values({
        userId,
        key,
        content,
        embedding,
    });

    await CacheService.deletePattern(CacheKeys.memoriesPattern(userId));
}

export async function searchMemory(userId: string, query: string, limit: number = 5) {
    const queryEmbedding = await embeddings.embedQuery(query);

    // Use L2 distance or cosine similarity. pgvector supports both.
    // Drizzle syntax for vector similarity:
    const similarity = sql<number>`1 - (${memoriesTable.embedding} <=> ${JSON.stringify(queryEmbedding)}::vector)`;


    const results = await db
        .select({
            key: memoriesTable.key,
            content: memoriesTable.content,
            similarity: similarity,
        })
        .from(memoriesTable)
        .where(eq(memoriesTable.userId, userId))
        .orderBy(t => desc(t.similarity))
        .limit(limit);

    return results;
}

export async function getMemories(userId: string, limit: number = 20, cursor?: string) {
    const cacheKey = CacheKeys.memories(userId, limit.toString(), cursor);
    const cachedData = await CacheService.get<any>(cacheKey);

    if (cachedData) {
        return cachedData;
    }

    let query = db
        .select({
            id: memoriesTable.id,
            key: memoriesTable.key,
            content: memoriesTable.content,
            createdAt: memoriesTable.createdAt,
        })
        .from(memoriesTable)
        .where(eq(memoriesTable.userId, userId))
        .orderBy(desc(memoriesTable.createdAt))
        .limit(limit);

    if (cursor && cursor !== 'undefined') {
        query = db
            .select({
                id: memoriesTable.id,
                key: memoriesTable.key,
                content: memoriesTable.content,
                createdAt: memoriesTable.createdAt,
            })
            .from(memoriesTable)
            .where(and(eq(memoriesTable.userId, userId), lt(memoriesTable.createdAt, new Date(cursor))))
            .orderBy(desc(memoriesTable.createdAt))
            .limit(limit);
    }

    const memories = await query;

    const responseData = {
        memories,
        nextCursor: memories.length === limit ? memories[memories.length - 1].createdAt : null,
    };

    await CacheService.set(cacheKey, responseData, 300);

    return responseData;
}
