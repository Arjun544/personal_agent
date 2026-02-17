"use client";

import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { useApi } from "@/hooks/use-api";
import { createSocket } from "@/lib/socket";
import { useAuth, useUser } from "@clerk/nextjs";
import { Send } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Socket } from "socket.io-client";


interface Message {
    id: string;
    role: "user" | "assistant";
    content: string;
}

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";


export default function DashboardPage() {
    const [messages, setMessages] = useState<Message[]>([]);
    const [conversationId, setConversationId] = useState('6');
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [socketId, setSocketId] = useState<string | null>(null);
    const scrollAreaRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const socketRef = useRef<Socket | null>(null);
    const streamingMessageIdRef = useRef<string | null>(null);
    const { user } = useUser();
    const { getToken } = useAuth();

    // Initialize Socket.IO connection
    useEffect(() => {
        const initSocket = async () => {
            const socket = createSocket(getToken);


            socket.on("connect", () => {
                console.log("Connected to backend:", socket.id);
                setSocketId(socket.id || null);
            });

            socket.on("connect_error", (error) => {
                console.error("Socket connection error:", error);
                console.error("Attempting to connect to:", BACKEND_URL);
            });

            socket.on("socket:connected", (data: { socketId: string }) => {
                console.log("Socket ID received:", data.socketId);
                setSocketId(data.socketId);
            });

            socket.on("stream:chunk", (data: { chunk: string; done: boolean }) => {
                if (data.done) {
                    setIsLoading(false);
                    streamingMessageIdRef.current = null;
                    return;
                }

                setMessages((prev) => {
                    const lastMessage = prev[prev.length - 1];
                    if (
                        lastMessage?.role === "assistant" &&
                        lastMessage.id === streamingMessageIdRef.current
                    ) {
                        return prev.map((msg) =>
                            msg.id === streamingMessageIdRef.current
                                ? { ...msg, content: msg.content + data.chunk }
                                : msg
                        );
                    }
                    return prev;
                });
            });

            socket.on("stream:complete", (data: { message: string }) => {
                setIsLoading(false);
                streamingMessageIdRef.current = null;
            });

            socket.on("stream:error", (data: { error: string }) => {
                console.error("Stream error:", data.error);
                setIsLoading(false);
                setMessages((prev) => {
                    const lastMessage = prev[prev.length - 1];
                    if (
                        lastMessage?.role === "assistant" &&
                        lastMessage.id === streamingMessageIdRef.current
                    ) {
                        return prev.map((msg) =>
                            msg.id === streamingMessageIdRef.current
                                ? { ...msg, content: msg.content + `\n\nError: ${data.error}` }
                                : msg
                        );
                    }
                    return prev;
                });
                streamingMessageIdRef.current = null;
            });

            socket.on("disconnect", () => {
                console.log("Disconnected from backend");
                setSocketId(null);
            });

            socketRef.current = socket;
        };

        initSocket();

        return () => {
            socketRef.current?.disconnect();
        };
    }, [getToken]);

    const api = useApi();

    const handleSend = async () => {
        if (!input.trim() || isLoading) return;

        const userMessage: Message = {
            id: Date.now().toString(),
            role: "user",
            content: input.trim(),
        };

        setMessages((prev) => [...prev, userMessage]);
        const messageText = input.trim();
        setInput("");
        setIsLoading(true);

        // Auto-resize textarea
        if (textareaRef.current) {
            textareaRef.current.style.height = "auto";
        }

        // Create assistant message placeholder for streaming
        const assistantMessageId = (Date.now() + 1).toString();
        streamingMessageIdRef.current = assistantMessageId;
        setMessages((prev) => [
            ...prev,
            {
                id: assistantMessageId,
                role: "assistant",
                content: "",
            },
        ]);

        try {
            const response = await api.post("/agent/chat", {
                message: messageText,
                threadId: conversationId || undefined,
                socketId: socketId || undefined,
                userId: user?.id,
            });

            const data = response.data;


            // If no socketId was provided or streaming failed, use regular response
            if (!socketId || !data.socketId) {
                setMessages((prev) =>
                    prev.map((msg) =>
                        msg.id === assistantMessageId
                            ? { ...msg, content: data.message || "No response received." }
                            : msg
                    )
                );
                setIsLoading(false);
                streamingMessageIdRef.current = null;
            }
            // If socketId was provided, streaming will be handled by socket events
        } catch (error) {
            console.error("Error sending message:", error);
            const errorMessage =
                error instanceof Error ? error.message : "Failed to send message";
            setMessages((prev) =>
                prev.map((msg) =>
                    msg.id === assistantMessageId
                        ? { ...msg, content: `Error: ${errorMessage}` }
                        : msg
                )
            );
            setIsLoading(false);
            streamingMessageIdRef.current = null;
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    // Auto-resize textarea
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = "auto";
            textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
        }
    }, [input]);

    // Auto-scroll to bottom when new messages arrive
    useEffect(() => {
        if (scrollAreaRef.current) {
            const viewport = scrollAreaRef.current.querySelector(
                '[data-slot="scroll-area-viewport"]'
            );
            if (viewport) {
                viewport.scrollTop = viewport.scrollHeight;
            }
        }
    }, [messages]);

    return (
        <div className="flex h-full w-full flex-col bg-background">
            {/* Messages Area */}
            <ScrollArea className="flex-1 min-h-0" ref={scrollAreaRef}>
                <div className="mx-auto w-full max-w-3xl px-4 py-8">
                    {messages.length === 0 ? (
                        <div className="flex h-full items-center justify-center">
                            <div className="text-center">
                                <h1 className="mb-2 text-2xl font-semibold">
                                    &quot;How can I help you today?&quot;

                                </h1>
                                <p className="text-muted-foreground">
                                    &quot;I&apos;m your personal assistant. Ask me anything.&quot;

                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {messages.map((message) => (
                                <div
                                    key={message.id}
                                    className={`flex gap-4 ${message.role === "user" ? "justify-end" : "justify-start"
                                        }`}
                                >
                                    <div
                                        className={`max-w-[85%] rounded-lg px-4 py-3 text-sm leading-relaxed wrap-break-word ${message.role === "user"
                                            ? "bg-primary text-primary-foreground"
                                            : "bg-muted text-muted-foreground"
                                            }`}
                                    >
                                        <ReactMarkdown
                                            remarkPlugins={[remarkGfm]}
                                            components={{
                                                p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                                                strong: ({ children }) => <span className="font-bold">{children}</span>,
                                                ul: ({ children }) => <ul className="list-disc pl-4 mb-2">{children}</ul>,
                                                ol: ({ children }) => <ol className="list-decimal pl-4 mb-2">{children}</ol>,
                                                li: ({ children }) => <li className="mb-1">{children}</li>,
                                                a: ({ children, href }) => (
                                                    <a
                                                        href={href}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="underline hover:opacity-80"
                                                    >
                                                        {children}
                                                    </a>
                                                ),
                                            }}
                                        >
                                            {message.content}
                                        </ReactMarkdown>
                                    </div>
                                </div>
                            ))}
                            {isLoading && (
                                <div className="flex justify-start gap-4">
                                    <div className="max-w-[85%] rounded-lg bg-muted px-4 py-3">
                                        <div className="flex gap-1">
                                            <div className="h-2 w-2 animate-pulse rounded-full bg-muted-foreground" />
                                            <div className="h-2 w-2 animate-pulse rounded-full bg-muted-foreground [animation-delay:0.2s]" />
                                            <div className="h-2 w-2 animate-pulse rounded-full bg-muted-foreground [animation-delay:0.4s]" />
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </ScrollArea>

            {/* Input Area */}
            <div className="border-t border-border bg-background">
                <div className="mx-auto w-full max-w-3xl px-4 py-4">
                    <div className="relative flex items-end gap-2 rounded-lg border border-input bg-background p-2 shadow-sm focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
                        <Textarea
                            ref={textareaRef}
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Message..."
                            className="min-h-[24px] max-h-[200px] resize-none border-0 bg-transparent px-2 py-1.5 text-sm shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
                            rows={1}
                            disabled={isLoading}
                        />
                        <Button
                            onClick={handleSend}
                            disabled={!input.trim() || isLoading}
                            size="icon"
                            className="h-8 w-8 shrink-0"
                        >
                            <Send className="h-4 w-4" />
                        </Button>
                    </div>
                    <p className="mt-2 text-center text-xs text-muted-foreground">
                        Press Enter to send, Shift+Enter for new line
                    </p>
                </div>
            </div>
        </div>
    );
}
