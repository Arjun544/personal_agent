// Cache key generators
export const CacheKeys = {
    conversations: (userId: string) => `conversations:${userId}`,
    conversationPattern: (userId: string) => `conversations:${userId}*`,
    messages: (conversationId: string, limit: string, cursor?: string) =>
        `messages:${conversationId}:limit:${limit}${cursor ? `:cursor:${cursor}` : ''}`,
    messagesPattern: (conversationId: string) => `messages:${conversationId}*`,
    memories: (userId: string, limit: string, cursor?: string) =>
        `memories:${userId}:limit:${limit}${cursor ? `:cursor:${cursor}` : ''}`,
    memoriesPattern: (userId: string) => `memories:${userId}*`,
};
