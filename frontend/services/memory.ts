import axiosInstance from "@/lib/axios";

export interface Memory {
    id: string;
    key: string;
    content: string;
    createdAt: string;
}

export const getMemories = async (token?: string, limit: number = 20, cursor?: string ): Promise<{ memories: Memory[], nextCursor: string | null }> => {
    try {
        const response = await axiosInstance.get(`/memories`,
            token ? { headers: { Authorization: `Bearer ${token}` } } : {}
        );
        return response.data;
    } catch (error) {
        console.error(error);
        return { memories: [], nextCursor: null };
    }
}
