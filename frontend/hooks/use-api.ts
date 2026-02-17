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

        return instance;
    }, [getToken]);

    return api;
};
