import { useAuth } from "@clerk/nextjs";
import axios from "axios";
import { useMemo } from "react";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";

export const useApi = () => {
    const { getToken } = useAuth();

    const api = useMemo(() => {
        const instance = axios.create({
            baseURL: BACKEND_URL,
        });

        instance.interceptors.request.use(async (config) => {
            const token = await getToken();
            if (token) {
                config.headers.Authorization = `Bearer ${token}`;
            }
            return config;
        });

        instance.interceptors.response.use(
            (response) => {
                if (response.data && response.data.status === 'success' && 'data' in response.data) {
                    return {
                        ...response,
                        data: response.data.data
                    };
                }
                return response;
            },
            (error) => {
                const message = error.response?.data?.message || error.message;
                console.error('API Error:', message);
                return Promise.reject(error);
            }
        );

        return instance;

    }, [getToken]);

    return api;
};
