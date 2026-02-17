import axiosInstance from "@/lib/axios";

export const ingestPdf = async (file: File, token?: string, conversationId?: string) => {
    const formData = new FormData();
    formData.append("pdf", file);
    formData.append("conversationId", conversationId || "");

    const response = await axiosInstance.post(`/agent/ingest-pdf`, formData, {
        headers: {
            "Content-Type": "multipart/form-data",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
    });

    return response.data;
};

export const getDocuments = async (token?: string) => {
    const response = await axiosInstance.get(`/agent/documents`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    return response.data.documents || [];
};
