"use client";

import { io, Socket } from "socket.io-client";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";

export const createSocket = (token?: string | (() => Promise<string | null>)): Socket => {
    return io(BACKEND_URL, {
        path: "/socket.io/",
        auth: async (cb: (data: any) => void) => {
            const t = typeof token === 'function' ? await token() : token;
            cb({ token: t });
        },
        transports: ["websocket", "polling"],
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: 5,
    });
};
