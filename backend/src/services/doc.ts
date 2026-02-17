import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { desc, eq, sql } from "drizzle-orm";
import fs from "fs/promises";
import path from "path";
import { db } from "../config/database";
import { documentChunks } from "../config/schema";
import { supabase } from "../config/supabase";
import { embeddings } from "./memory";

export async function ingestPDF(userId: string, filePath: string, conversationId: string) {
    const fileName = path.basename(filePath);
    const fileContent = await fs.readFile(filePath);

    // 1. Upload to Supabase Storage
    const storagePath = `documents/${userId}/${Date.now()}_${fileName}`;
    const { error: uploadError } = await supabase.storage
        .from('documents') // Make sure this bucket exists
        .upload(storagePath, fileContent, {
            contentType: 'application/pdf',
            upsert: true
        });

    if (uploadError) {
        console.error("Supabase upload error:", uploadError);
        throw new Error(`Failed to upload to storage: ${uploadError.message}`);
    }

    const { data: { publicUrl } } = supabase.storage
        .from('documents')
        .getPublicUrl(storagePath);

    // 2. Load and Split PDF
    const loader = new PDFLoader(filePath);
    const rawDocs = await loader.load();

    const splitter = new RecursiveCharacterTextSplitter({
        chunkSize: 1000,
        chunkOverlap: 200,
    });

    const docChunks = await splitter.splitDocuments(rawDocs);

    // 3. Generate Embeddings and Save to Database
    for (let i = 0; i < docChunks.length; i++) {
        const content = docChunks[i].pageContent;
        const pageNumber = (docChunks[i].metadata as any).loc?.pageNumber || 1;

        const [embedding] = await embeddings.embedDocuments([content]);

        await db.insert(documentChunks).values({
            userId,
            content,
            embedding,
            metadata: {
                source: fileName,
                fileUrl: publicUrl,
                pageNumber,
                chunkIndex: i,
                conversation_id: conversationId,
            }
        });
    }

    return { fileName, publicUrl };
}

export async function searchDocuments(userId: string, query: string, limit: number = 5) {
    const queryEmbedding = await embeddings.embedQuery(query);

    const similarity = sql<number>`1 - (${documentChunks.embedding} <=> ${JSON.stringify(queryEmbedding)}::vector)`;

    const results = await db.select({
        content: documentChunks.content,
        metadata: documentChunks.metadata,
        similarity: similarity
    })
        .from(documentChunks)
        .where(eq(documentChunks.userId, userId))
        .orderBy(desc(similarity))
        .limit(limit);

    return results;
}

export async function listDocuments(userId: string) {
    // Get unique documents by source from metadata
    const results = await db.select({
        metadata: documentChunks.metadata,
    })
        .from(documentChunks)
        .where(eq(documentChunks.userId, userId));

    const uniqueDocs = new Map();
    results.forEach(row => {
        const meta = row.metadata as any;
        if (!uniqueDocs.has(meta.source)) {
            uniqueDocs.set(meta.source, {
                name: meta.source,
                url: meta.fileUrl,
                // We could add more info like total chunks or something
            });
        }
    });

    return Array.from(uniqueDocs.values());
}
