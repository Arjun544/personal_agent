import axiosInstance from "@/lib/axios";
import { Conversation, Message } from "@/lib/types";


export const createConversation = async (userId: string, message: string, token?: string): Promise<Conversation | undefined> => {
    try {
        const response = await axiosInstance.post(`/history/create`,
            { userId, message },
            token ? { headers: { Authorization: `Bearer ${token}` } } : {}
        );
        return response.data.conversation;
    } catch (error) {
        console.error(error);
    }
}

export const renameConversation = async (id: string, message: string, token?: string): Promise<Conversation | undefined> => {
    try {
        const response = await axiosInstance.post(`/history/rename`,
            { id, message },
            token ? { headers: { Authorization: `Bearer ${token}` } } : {}
        );
        return response.data.conversation;
    } catch (error) {
        console.error(error);
    }
}

export const getConversations = async (userId: string, token?: string): Promise<Conversation[]> => {
    try {
        const response = await axiosInstance.get(`/history/conversations?id=${userId}`,
            token ? { headers: { Authorization: `Bearer ${token}` } } : {}
        );
        return response.data.history || [];
    } catch (error) {
        console.error(error);
        return [];
    }
}

export const getMessages = async (id: string, limit: number = 20, cursor?: string, token?: string): Promise<{ history: Message[], nextCursor: string | null }> => {
    try {
        const response = await axiosInstance.get(`/history/messages?id=${id}&limit=${limit}${cursor ? `&cursor=${cursor}` : ''}`,
            token ? { headers: { Authorization: `Bearer ${token}` } } : {}
        );
        return {
            history: response.data.history || [],
            nextCursor: response.data.nextCursor || null
        };
    } catch (error) {
        console.error(error);
        return { history: [], nextCursor: null };
    }
}