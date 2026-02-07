import axiosInstance from "@/lib/axios";
import { Conversation, Message } from "@/lib/types";


export const createConversation = async (userId: string, message: string): Promise<Conversation | undefined> => {
    try {
        const response = await axiosInstance.post(`/history/create`, { userId, message });
        return response.data.conversation;
    } catch (error) {
        console.error(error);
    }
}

export const renameConversation = async (id: string, message: string): Promise<Conversation | undefined> => {
    try {
        const response = await axiosInstance.post(`/history/rename`, { id, message });
        return response.data.conversation;
    } catch (error) {
        console.error(error);
    }
}

export const getConversations = async (userId: string): Promise<Conversation[]> => {
    try {
        const response = await axiosInstance.get(`/history/conversations?id=${userId}`);
        return response.data.history || [];
    } catch (error) {
        console.error(error);
        return [];
    }
}

export const getMessages = async (id: string): Promise<Message[]> => {
    try {
        const response = await axiosInstance.get(`/history/messages?id=${id}`);
        return response.data.history || [];
    } catch (error) {
        console.error(error);
        return [];
    }
}