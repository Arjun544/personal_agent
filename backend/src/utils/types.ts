export interface Conversation {
    id: number;
    userId: string;
    agent: string;
    firstMessage: string,
    createdAt: string;
}

export interface Message {
    id: number;
    conversationId: number;
    role:          "user" | "assistant";
    content:       string;
    createdAt: string;
    status: 'sending' | 'streaming' | 'done' | 'error';
}