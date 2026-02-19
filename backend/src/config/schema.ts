import { jsonb, pgEnum, pgTable, serial, text, timestamp, uuid, varchar, vector } from "drizzle-orm/pg-core";

export const roleEnum = pgEnum('role', ['user', 'assistant']);


export const conversationsTable = pgTable("conversations", {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text("user_id").notNull(),
    title: text("title"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const messagesTable = pgTable("messages", {
    id: uuid('id').primaryKey().defaultRandom(),
    conversationId: uuid("conversation_id").notNull().references(() => conversationsTable.id),
    role: roleEnum('role').notNull().default('user'),
    content: text("content").notNull(),
    docUrl: text("doc_url"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const memoriesTable = pgTable("memories", {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text("user_id").notNull(),
    key: text("key"),
    content: text("content").notNull(),
    embedding: vector("embedding", { dimensions: 1536 }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const documentChunks = pgTable("document_chunks", {
    id: uuid('id').primaryKey().defaultRandom(),
    content: text("content").notNull(),
    metadata: jsonb("metadata").notNull(), // Stores source, page number, userId, etc.
    embedding: vector("embedding", { dimensions: 1536 }),
    userId: text("user_id").notNull(),
});
