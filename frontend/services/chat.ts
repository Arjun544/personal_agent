import axiosInstance from "@/lib/axios";

interface SendMessageParams {
    message: string;
    threadId: string;
    socketId?: string;
    docUrl?: string;
}

export const sendMessage = async (params: SendMessageParams, token?: string) => {
    return await axiosInstance.post(
        "/agent/chat",
        params,
        token ? { headers: { Authorization: `Bearer ${token}` } } : {}
    );
};

export const stopStream = async (threadId: string, token?: string) => {
    return await axiosInstance.post(
        "/agent/chat/stop",
        { threadId },
        token ? { headers: { Authorization: `Bearer ${token}` } } : {}
    );
};
