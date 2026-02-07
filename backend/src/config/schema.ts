import { pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

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
    createdAt: timestamp("created_at").defaultNow().notNull(),
});