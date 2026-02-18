import axiosInstance from "@/lib/axios";

export interface Memory {
    id: string;
    key: string;
    content: string;
    createdAt: string;
}

export const getMemories = async (token?: string): Promise<Memory[]> => {
    try {
        const response = await axiosInstance.get(`/memories`,
            token ? { headers: { Authorization: `Bearer ${token}` } } : {}
        );
        return response.data.memories || [];
    } catch (error) {
        console.error(error);
        return [];
    }
}
