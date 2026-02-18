import { OpenAIEmbeddings } from "@langchain/openai";
import { desc, eq, sql } from "drizzle-orm";
import { db } from "../config/database";
import { memoriesTable } from "../config/schema";

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

export async function getMemories(userId: string) {
    return await db
        .select({
            id: memoriesTable.id,
            key: memoriesTable.key,
            content: memoriesTable.content,
            createdAt: memoriesTable.createdAt,
        })
        .from(memoriesTable)
        .where(eq(memoriesTable.userId, userId))
        .orderBy(desc(memoriesTable.createdAt));
}
