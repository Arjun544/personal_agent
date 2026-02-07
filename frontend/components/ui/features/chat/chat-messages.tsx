'use client'

import { getQueryClient } from '@/lib/get-query-client'
import { socket } from '@/lib/socket'
import { Conversation, Message } from '@/lib/types'
import { getMessages, renameConversation } from '@/services/history'
import { useUser } from '@clerk/nextjs'
import { queryOptions, useMutation, useSuspenseQuery } from '@tanstack/react-query'
import { ArrowDown, Check, Sparkles } from 'lucide-react'
import { useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { Virtuoso, VirtuosoHandle } from 'react-virtuoso'
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
    const searchParams = useSearchParams();

    // 1. Extract first message from URL (?m=...)
    const firstMessage = (searchParams.get('m') || '').trim();

    const [isConnected, setIsConnected] = useState(false);
    const [status, setStatus] = useState<string | null>(null);
    const [showScrollButton, setShowScrollButton] = useState(false);

    const renamingId = useRef<string | null>(null);
    const hasSeededFirstMessage = useRef(false);
    const hasSentFirstMessage = useRef(false);

    // 2. Use useId for a stable, unique prefix that is "pure"
    const stableId = useId();
    const tempCounter = useRef(0);

    // 3. Update nextTempId to use the stable ID
    const nextTempId = useCallback((role: 'user' | 'assistant') => {
        tempCounter.current += 1;
        // This is now pure because stableId never changes for this component instance
        return `temp-${stableId}-${role}-${tempCounter.current}`;
    }, [stableId]);

    const buildMessage = useCallback(
        (role: 'user' | 'assistant', content: string, statusValue: Message['status']): Message => ({
            id: nextTempId(role), // Stable and predictable
            conversationId: Number(id),
            role,
            content,
            status: statusValue,
            createdAt: new Date().toISOString(), // This is fine here because it's inside a callback, not the render body
        }),
        [id, nextTempId],
    );

    // 2. Fetch or Sync Messages
    const { data } = useSuspenseQuery(queryOptions({
        queryKey: ['chat-messages', id],
        queryFn: async () => {
            const serverMessages = await getMessages(id);
            return serverMessages;
        },
    }));

    const renameConversationMutation = useMutation({
        mutationKey: ['rename_conversation'],
        mutationFn: (data: { id: string; message: string }) => renameConversation(data.id, data.message),
        onSuccess: async (updated) => {
            if (!updated) return;
            queryClient.setQueryData<Conversation[]>(['conversations'], (old = []) =>
                old.map((item) => (item.id === updated.id ? { ...item, title: updated.title } : item)),
            );
        },
    });

    // 3. Helper to update TanStack cache locally
    const appendMessages = useCallback(
        (userMessage: string) => {
            const userEntry = buildMessage('user', userMessage, 'sending');
            const assistantEntry = buildMessage('assistant', '', 'streaming');

            queryClient.setQueryData<Message[]>(['chat-messages', id], (old = []) => [
                ...old,
                userEntry,
                assistantEntry,
            ]);
        },
        [buildMessage, id, queryClient],
    );

    const emitMessage = useCallback(
        (userMessage: string) => {
            setStatus(null);
            socket.emit('user_message', {
                conversationId: id,
                userMessage,
                socketId: socket.id,
                userId: user?.id,
            });
        },
        [id, user],
    );

    const sendMessage = useCallback(
        (userMessage: string) => {
            appendMessages(userMessage);
            emitMessage(userMessage);
        },
        [appendMessages, emitMessage],
    );

    // 4. SEEDING EFFECT: Show the message from URL immediately
    useEffect(() => {
        if (!firstMessage || hasSeededFirstMessage.current) return;

        const currentData = queryClient.getQueryData<Message[]>(['chat-messages', id]) || [];

        if (currentData.length === 0) {
            const userEntry = buildMessage('user', firstMessage, 'sending');
            const assistantEntry = buildMessage('assistant', '', 'streaming');
            queryClient.setQueryData<Message[]>(['chat-messages', id], [userEntry, assistantEntry]);
        }

        hasSeededFirstMessage.current = true;
    }, [firstMessage, id, queryClient, buildMessage]);

    // 5. EMIT EFFECT: Trigger socket once connected and URL message is present
    useEffect(() => {
        if (!firstMessage || !isConnected || hasSentFirstMessage.current) return;

        hasSentFirstMessage.current = true;
        setTimeout(() => {
            emitMessage(firstMessage);
        }, 0);

        // Clean up URL: remove ?m= parameter without refreshing
        const url = new URL(window.location.href);
        url.searchParams.delete('m');
        window.history.replaceState({}, '', url.pathname);
    }, [firstMessage, isConnected, emitMessage]);

    // 6. AUTO-RENAME EFFECT: Create a title based on the first message
    useEffect(() => {
        if (data && data.length > 0) {
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
                    message: data[0].content,
                });
            }
        }
    }, [data, id, queryClient, renameConversationMutation]);

    // 7. SOCKET LISTENERS
    useEffect(() => {
        if (socket.connected) {
            setTimeout(() => {
                setIsConnected(true);
            }, 0);
        }

        const onConnect = () => setIsConnected(true);
        const onDisconnect = () => setIsConnected(false);

        const onStreamChunk = ({ chunk, done }: StreamChunk) => {
            queryClient.setQueryData<Message[]>(['chat-messages', id], (old = []) => {
                if (old.length === 0) return old;

                const lastIndex = old.length - 1;
                const lastMessage = old[lastIndex];

                if (lastMessage.role !== 'assistant') {
                    const assistantEntry = buildMessage('assistant', chunk, done ? 'done' : 'streaming');
                    return [...old, assistantEntry];
                }

                const updated: Message = {
                    ...lastMessage,
                    content: lastMessage.content + chunk,
                    status: done ? 'done' : 'streaming',
                };

                return [...old.slice(0, lastIndex), updated];
            });

            if (done) setStatus(null);
        };

        const onStreamStatus = (payload: { status: string }) => setStatus(payload.status);

        socket.on('connect', onConnect);
        socket.on('disconnect', onDisconnect);
        socket.on('stream:chunk', onStreamChunk);
        socket.on('stream:status', onStreamStatus);

        return () => {
            socket.off('connect', onConnect);
            socket.off('disconnect', onDisconnect);
            socket.off('stream:chunk', onStreamChunk);
            socket.off('stream:status', onStreamStatus);
        };
    }, [id, buildMessage, queryClient]);

    const scrollToBottom = useCallback(() => {
        if (data && data.length > 0) {
            virtuosoRef.current?.scrollToIndex({
                index: data.length - 1,
                behavior: 'smooth',
                align: 'end',
            });
        }
    }, [data.length]); // Use data.length for stability

    const handleSendMessage = useCallback((message: string) => {
        sendMessage(message);
        // Small delay to ensure the new message is in the DOM
        setTimeout(scrollToBottom, 50);
    }, [sendMessage, scrollToBottom]);

    const renderItem = useCallback((index: number, message: Message) => {
        const isLast = index === data.length - 1;
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
    }, [data.length, status]);

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
                {data && data.length > 0 ? (
                    <>
                        <Virtuoso
                            ref={virtuosoRef}
                            className="w-full h-full"
                            data={data}
                            followOutput="smooth"
                            alignToBottom
                            initialTopMostItemIndex={data.length - 1}
                            itemContent={renderItem}
                            atBottomStateChange={(atBottom) => setShowScrollButton(!atBottom)}
                            components={{
                                Header: () => <div className="h-4" />,
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
                    {user && <InputField onSendMessage={handleSendMessage} />}
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