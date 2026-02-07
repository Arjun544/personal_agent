import db from "../config/database";
import { conversationsTable, messagesTable } from "../config/schema";


export const storeConversation = async (data: typeof conversationsTable.$inferInsert): Promise<string>  => {
    try {
        const conversations = await db.insert(conversationsTable).values(data).returning({id: conversationsTable.id});
        return conversations[0].id;
    } catch (error) {
        throw error;

    }
}


export const storeMessage = async (data: typeof messagesTable.$inferInsert) => {
    try {
        await db.insert(messagesTable).values(data);
    } catch (error) {
        throw error;

    }
}