'use client'

import { getQueryClient } from '@/lib/get-query-client'
import { createSocket } from '@/lib/socket'
import { Conversation, Message } from '@/lib/types'
import { sendMessage, stopStream } from '@/services/chat'
import { getMessages, renameConversation } from '@/services/history'
import { useAuth, useUser } from '@clerk/nextjs'
import { InfiniteData, useMutation, useSuspenseInfiniteQuery } from '@tanstack/react-query'
import { ArrowDown, Check, Sparkles } from 'lucide-react'
import { useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { Virtuoso, VirtuosoHandle } from 'react-virtuoso'
import { Socket } from 'socket.io-client'
import { toast } from 'sonner'
import { AssistantBubble } from './assistant-bubble'
import { InputField } from './input-field'
import { UserBubble } from './user-bubble'

type StreamChunk = {
    chunk: string;
    done: boolean;
};


export function ChatMessages({ id }: { id: string }) {
    const virtuosoRef = useRef<VirtuosoHandle>(null);
    const queryClient = getQueryClient();
    const { user } = useUser();
    const { getToken } = useAuth();
    const searchParams = useSearchParams();

    // 1. Extract first message and docUrl from URL (?m=...&docUrl=...)
    const firstMessage = (searchParams.get('m') || '').trim();
    const docUrlParam = (searchParams.get('docUrl') || '').trim();

    const [isConnected, setIsConnected] = useState(false);
    const [status, setStatus] = useState<string | null>(null);
    const [showScrollButton, setShowScrollButton] = useState(false);
    const [isStreaming, setIsStreaming] = useState(false);

    const renamingId = useRef<string | null>(null);
    const hasSeededFirstMessage = useRef(false);
    const socketRef = useRef<Socket | null>(null);

    // 2. Use useId for a stable, unique prefix that is "pure"
    const stableId = useId();
    const tempCounter = useRef(0);

    // 3. Update nextTempId to use the stable ID
    const nextTempId = useCallback((role: 'user' | 'assistant') => {
        tempCounter.current += 1;
        return `temp-${stableId}-${role}-${tempCounter.current}`;
    }, [stableId]);

    const buildMessage = useCallback(
        (role: 'user' | 'assistant', content: string, statusValue: Message['status'], docUrl?: string): Message => ({
            id: nextTempId(role),
            conversationId: id,
            role,
            content,
            docUrl,
            status: statusValue,
            createdAt: new Date().toISOString(),
        }),
        [id, nextTempId],
    );

    // 2. Fetch or Sync Messages
    const { data, fetchNextPage, hasNextPage, isFetchingNextPage } = useSuspenseInfiniteQuery({
        queryKey: ['chat-messages', id],
        queryFn: async ({ pageParam }) => {
            const token = await getToken();
            return getMessages(id, 20, pageParam as string | undefined, token || undefined);
        },
        initialPageParam: undefined as string | undefined,
        getNextPageParam: (lastPage) => lastPage.nextCursor,
    });

    const messages = data.pages.slice().reverse().flatMap((page) => page.history);

    const renameConversationMutation = useMutation({
        mutationKey: ['rename_conversation'],
        mutationFn: async (data: { id: string; message: string }) => {
            const token = await getToken();
            return renameConversation(data.id, data.message, token || undefined);
        },
        onSuccess: async (updated) => {
            if (!updated) return;
            queryClient.setQueryData<Conversation[]>(['conversations'], (old = []) =>
                old.map((item) => (item.id === updated.id ? { ...item, title: updated.title } : item)),
            );
        },
    });

    // 3. Send Message Mutation with Optimistic Update
    const sendMessageMutation = useMutation({
        mutationKey: ['send_message', id],
        mutationFn: async (variables: { message: string; docUrl?: string }) => {
            const { message: userMessage, docUrl } = variables;
            if (!socketRef.current?.connected) {
                if (!isConnected) throw new Error("Connection lost");
            }

            const token = await getToken();
            await sendMessage({
                message: userMessage,
                threadId: id,
                socketId: socketRef.current?.id,
                docUrl,
            }, token || undefined);
        },
        onMutate: async (variables) => {
            const { message: userMessage, docUrl } = variables;
            await queryClient.cancelQueries({ queryKey: ['chat-messages', id] });

            const previousMessages = queryClient.getQueryData<InfiniteData<{ history: Message[], nextCursor: string | null }>>(['chat-messages', id]);

            const userEntry = buildMessage('user', userMessage, 'sending', docUrl);
            const assistantEntry = buildMessage('assistant', '', 'streaming');

            queryClient.setQueryData<InfiniteData<{ history: Message[], nextCursor: string | null }>>(['chat-messages', id], (old) => {
                if (!old) {
                    return {
                        pages: [{ history: [userEntry, assistantEntry], nextCursor: null }],
                        pageParams: [undefined]
                    };
                }
                const newPages = [...old.pages];
                if (newPages.length > 0) {
                    newPages[0] = {
                        ...newPages[0],
                        history: [...newPages[0].history, userEntry, assistantEntry]
                    };
                }
                return { ...old, pages: newPages };
            });

            setStatus(null);
            setIsStreaming(true);

            // Scroll to bottom immediately
            setTimeout(() => {
                virtuosoRef.current?.scrollToIndex({
                    index: (messages.length) + 1, // +2 items added
                    behavior: 'smooth',
                    align: 'end',
                });
            }, 10);

            return { previousMessages };
        },
        onError: (err, variables, context) => {
            console.error("Failed to send message:", err);
            toast.error("Failed to send message");
            setIsStreaming(false);
            if (context?.previousMessages) {
                queryClient.setQueryData(['chat-messages', id], context.previousMessages);
            }
        },
    });

    const stopStreamMutation = useMutation({
        mutationKey: ['stop_stream', id],
        mutationFn: async () => {
            const token = await getToken();
            await stopStream(id, token || undefined);
        },
        onMutate: async () => {
            setIsStreaming(false);
            setStatus(null);

            // Optimistically update last assistant message to 'done'
            queryClient.setQueryData<InfiniteData<{ history: Message[], nextCursor: string | null }>>(['chat-messages', id], (old) => {
                if (!old || old.pages.length === 0) return old;
                const newPages = [...old.pages];
                const lastHistory = [...newPages[0].history];
                const lastIndex = lastHistory.length - 1;

                if (lastIndex >= 0 && lastHistory[lastIndex].role === 'assistant') {
                    lastHistory[lastIndex] = { ...lastHistory[lastIndex], status: 'done' };
                    newPages[0] = { ...newPages[0], history: lastHistory };
                }
                return { ...old, pages: newPages };
            });
        },
        onError: (err) => {
            console.error("Failed to stop generation:", err);
        }
    });

    const handleSendMessage = useCallback((message: string, docUrl?: string) => {
        if (isStreaming) return;
        sendMessageMutation.mutate({ message, docUrl });
    }, [sendMessageMutation]);

    const handleStopStream = useCallback(() => {
        stopStreamMutation.mutate();
    }, [stopStreamMutation]);

    // 4. SEEDING & AUTO-SEND EFFECT
    useEffect(() => {
        if ((!firstMessage && !docUrlParam) || hasSeededFirstMessage.current || !isConnected) return;

        // Clean up URL: remove ?m= and ?docUrl= parameters without refreshing
        const url = new URL(window.location.href);
        url.searchParams.delete('m');
        url.searchParams.delete('docUrl');
        window.history.replaceState({}, '', url.pathname + url.search); // maintain other params if any? url.pathname is safer for clean URL

        hasSeededFirstMessage.current = true;

        // Trigger mutation immediately
        sendMessageMutation.mutate({ message: firstMessage || "Sent a file", docUrl: docUrlParam || undefined });

    }, [firstMessage, docUrlParam, isConnected, sendMessageMutation]);

    // 6. AUTO-RENAME EFFECT: Create a title based on the first message
    useEffect(() => {
        if (messages.length > 0) {
            const conversations = queryClient.getQueryData<Conversation[]>(['conversations']);
            const currentConversation = conversations?.find((c) => String(c.id) === String(id));

            if (
                currentConversation &&
                !currentConversation.title &&
                renamingId.current !== id &&
                !renameConversationMutation.isPending
            ) {
                renamingId.current = id;
                renameConversationMutation.mutate({
                    id,
                    message: messages[0].content,
                });
            }
        }
    }, [messages, id, queryClient, renameConversationMutation]);

    // 7. SOCKET LISTENERS
    useEffect(() => {
        let isMounted = true;
        let socketInstance: Socket | null = null;

        const initSocket = async () => {
            const token = await getToken();
            if (!isMounted) return;

            const socket = createSocket(token || undefined);
            socketInstance = socket;
            socketRef.current = socket;

            const onConnect = () => {
                if (isMounted) setIsConnected(true);
            }
            const onDisconnect = () => {
                if (isMounted) setIsConnected(false);
            }

            const onStreamChunk = ({ chunk, done }: StreamChunk) => {
                if (!isMounted) return;

                queryClient.setQueryData<InfiniteData<{ history: Message[], nextCursor: string | null }>>(['chat-messages', id], (old) => {
                    if (!old || old.pages.length === 0) return old;

                    const newPages = [...old.pages];
                    const lastPageIndex = 0; // Newest page
                    const lastHistory = [...newPages[lastPageIndex].history];

                    if (lastHistory.length === 0) return old;

                    const lastIndex = lastHistory.length - 1;
                    const lastMessage = lastHistory[lastIndex];

                    if (lastMessage.role !== 'assistant') {
                        // Should typically not happen if we optimistically added an assistant block
                        // But if we did, we might want to append. 
                        // However, with optimistic updates, we expect the last message to be assistant.
                        // If it's done, we might need a new block? 
                        // For now, let's assume standard flow.
                        const assistantEntry = buildMessage('assistant', chunk, done ? 'done' : 'streaming');
                        lastHistory.push(assistantEntry);
                    } else {
                        // Avoid duplicates if usage logic changes, but here we just append
                        lastHistory[lastIndex] = {
                            ...lastMessage,
                            content: lastMessage.content + chunk,
                            status: done ? 'done' : 'streaming',
                        };
                    }

                    newPages[lastPageIndex] = {
                        ...newPages[lastPageIndex],
                        history: lastHistory
                    };

                    return { ...old, pages: newPages };
                });

                if (done) {
                    setStatus(null);
                    setIsStreaming(false);
                }
            };

            const onStreamStatus = (payload: { status: string }) => {
                if (isMounted) setStatus(payload.status);
            }

            socket.on('connect', onConnect);
            socket.on('disconnect', onDisconnect);
            socket.on('stream:chunk', onStreamChunk);
            socket.on('stream:status', onStreamStatus);

            if (socket.connected) {
                onConnect();
            }
        };

        initSocket();

        return () => {
            isMounted = false;
            if (socketInstance) {
                socketInstance.off('connect');
                socketInstance.off('disconnect');
                socketInstance.off('stream:chunk');
                socketInstance.off('stream:status');
                socketInstance.disconnect();
            }
            if (socketRef.current === socketInstance) {
                socketRef.current = null;
            }
        };
    }, [id, buildMessage, queryClient, getToken]);

    const scrollToBottom = useCallback(() => {
        if (messages.length > 0) {
            virtuosoRef.current?.scrollToIndex({
                index: messages.length - 1,
                behavior: 'smooth',
                align: 'end',
            });
        }
    }, [messages.length]); // Use messages.length for stability

    const renderItem = useCallback((index: number, message: Message) => {
        const isLast = index === messages.length - 1;
        return (
            <div className="flex flex-col items-center w-full py-3 sm:py-4">
                <div className={`flex w-full max-w-4xl gap-4 px-4 md:px-8 lg:px-12 ${message.role === 'user' ? 'justify-end' : 'justify-start'
                    }`}>
                    {message.role === 'user' ? (
                        <UserBubble message={message} />
                    ) : (
                        <AssistantBubble
                            message={message}
                            status={status}
                            isLast={isLast}
                        />
                    )}
                </div>
            </div>
        );
    }, [messages.length, status]);

    const handleScrollUp = useCallback(() => {
        if (hasNextPage && !isFetchingNextPage) {
            fetchNextPage();
        }
    }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

    const handleFileUploaded = useCallback((file: File) => {
        toast.success(`"${file.name}" ingested successfully`);
    }, []);

    const title = queryClient.getQueryData<Conversation[]>(['conversations'])
        ?.find(c => String(c.id) === String(id))?.title || 'New Conversation';

    return (
        <div className="flex flex-col flex-1 bg-background w-full min-h-0 relative font-sans selection:bg-primary/10">
            {/* Header / Navigation Bar */}
            <header className="sticky top-0 z-30 w-full bg-background/80 backdrop-blur-xl border-b border-border/50 px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
                        <Sparkles className="w-4 h-4 text-primary" />
                    </div>
                    <h1 className="text-sm font-bold text-foreground/90 line-clamp-1 max-w-[200px] md:max-w-md">
                        {title}
                    </h1>
                </div>
            </header>


            <div className="flex-1 min-h-0 w-full flex flex-col items-center overflow-hidden relative">
                {messages.length > 0 ? (
                    <>
                        <Virtuoso
                            ref={virtuosoRef}
                            className="w-full h-full"
                            data={messages}
                            followOutput="smooth"
                            alignToBottom
                            initialTopMostItemIndex={messages.length - 1}
                            itemContent={renderItem}
                            atBottomStateChange={(atBottom) => setShowScrollButton(!atBottom)}
                            startReached={handleScrollUp}
                            components={{
                                Header: () => (
                                    <div className="h-10 flex items-center justify-center">
                                        {isFetchingNextPage && (
                                            <div className="flex items-center gap-2 text-xs text-muted-foreground animate-pulse">
                                                <div className="w-1 h-1 rounded-full bg-primary/40 animate-bounce" />
                                                <div className="w-1 h-1 rounded-full bg-primary/40 animate-bounce [animation-delay:-0.15s]" />
                                                <div className="w-1 h-1 rounded-full bg-primary/40 animate-bounce [animation-delay:-0.3s]" />
                                                Loading previous messages...
                                            </div>
                                        )}
                                    </div>
                                ),
                                Footer: () => <div className="h-32" />,
                            }}
                        />

                        {/* Floating Scroll to Bottom Button */}
                        <button
                            onClick={scrollToBottom}
                            className={`absolute bottom-10 right-6 z-20 p-3 rounded-full bg-background border border-border/60 shadow-xl transition-all duration-500 hover:scale-110 active:scale-90 cursor-pointer ${showScrollButton ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
                                }`}
                        >
                            <ArrowDown className="w-4 h-4 text-foreground/70" />
                        </button>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center gap-6 text-center p-8 max-w-md mx-auto">
                        <div className="relative">
                            <div className="w-16 h-16 rounded-3xl bg-primary/5 flex items-center justify-center animate-pulse border border-primary/10">
                                <Sparkles className="w-8 h-8 text-primary/40" />
                            </div>
                            <div className="absolute -bottom-1 -right-1 bg-emerald-500 rounded-full p-1 border-2 border-background">
                                <Check className="w-3 h-3 text-white" />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <h2 className="text-lg font-bold text-foreground/90 tracking-tight">System Ready</h2>
                            <p className="text-sm text-muted-foreground leading-relaxed font-medium">
                                Your personal AI assistant is initialized and ready to help. How can I assist you today?
                            </p>
                        </div>
                        <div className="flex flex-wrap justify-center gap-2">
                            {['Draft an email', 'Plan my day', 'Summarize notes'].map((suggestion) => (
                                <button
                                    key={suggestion}
                                    onClick={() => handleSendMessage(suggestion)}
                                    className="px-4 py-2 rounded-full border border-border/60 text-xs font-bold text-foreground/60 hover:bg-muted/50 hover:text-foreground transition-all"
                                >
                                    {suggestion}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            <div className="w-full bg-linear-to-t from-background via-background/95 to-transparent pb-6 pt-4 relative">
                <div className="max-w-3xl mx-auto px-4">
                    {user && (
                        <InputField
                            onSendMessage={handleSendMessage}
                            onFileSelect={handleFileUploaded}
                            isStreaming={isStreaming}
                            onStop={handleStopStream}
                        />
                    )}
                    <div className="flex items-center justify-center gap-2 mt-4 opacity-40 hover:opacity-100 transition-opacity duration-500">
                        <div className="h-px w-8 bg-muted-foreground/30" />
                        <p className="text-[10px] font-bold tracking-tighter text-muted-foreground uppercase text-center">
                            AI may provide inaccurate info.
                        </p>
                        <div className="h-px w-8 bg-muted-foreground/30" />
                    </div>
                </div>
            </div>
        </div>
    );
}