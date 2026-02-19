export interface Conversation {
    id: string;
    userId: string;
    title?: string;
    createdAt: string;
}

export interface Message {
    id: string;
    conversationId: string;
    role: "user" | "assistant";
    content: string;
    docUrl?: string;
    createdAt: string;
    status: "sending" | "streaming" | "done" | "error";
}