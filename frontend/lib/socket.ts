"use client";

import { io, Socket } from "socket.io-client";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";

export const createSocket = (token?: string): Socket => {
    return io(BACKEND_URL, {
        path: "/socket.io/",
        auth: {
            token,
        },
        transports: ["websocket", "polling"],
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: 5,
    });
};