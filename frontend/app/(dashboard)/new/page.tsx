"use client";

import { InputField } from "@/components/ui/features/chat/input-field";
import { getQueryClient } from "@/lib/get-query-client";
import { Conversation } from "@/lib/types";
import { createConversation } from "@/services/history";
import { useAuth, useUser } from "@clerk/nextjs";
import { useMutation } from "@tanstack/react-query";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export default function NewChatPage() {
    const router = useRouter();
    const { user } = useUser();
    const { getToken } = useAuth();

    const createConversationMutation = useMutation({
        mutationKey: ['create_conversation'],
        onMutate: (payload: { userId: string; message: string }) => {
            if (!payload.userId) {
                console.error("User not found in payload", payload);
                toast.error("User not found");
                return;
            }
        },
        mutationFn: async (payload: { userId: string; message: string }) => {
            const token = await getToken();
            return createConversation(payload.userId, payload.message, token || undefined);
        },

        onSuccess: async (data, payload) => {
            if (!data) {
                toast.error("Failed to create conversation");
                return;
            }
            const queryClient = getQueryClient();
            queryClient.setQueryData<Conversation[]>(['conversations'], (old = []) => [data, ...old]);
            router.push(`/chat/${data.id}?m=${encodeURIComponent(payload.message)}`);
        },
        onError: () => {
            toast.error("Failed to send message");
        }
    });


    const handleSend = async (message: string) => {
        const trimmed = message.trim();
        if (!user?.id) {
            showLoginToast();
            return;
        }
        if (!trimmed) return;
        createConversationMutation.mutate({ userId: user.id, message: trimmed });
    }

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>, message: string) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            const trimmed = message.trim();
            if (!user?.id) {
                showLoginToast();
                return;
            }
            if (!trimmed) return;
            createConversationMutation.mutate({ userId: user.id, message: trimmed });
        }
    };

    const showLoginToast = () => {
        toast.info("Please login to continue")
    }

    return (
        <div className="flex flex-col flex-1 bg-background w-full min-h-0 relative font-sans selection:bg-primary/10">
            <div className="flex-1 min-h-0 w-full flex flex-col items-center justify-center overflow-hidden relative">
                <div className="flex-1 flex flex-col items-center justify-center gap-6 text-center p-8 max-w-md mx-auto">
                    <Image
                        src="/logo_svg.svg"
                        alt="Persona"
                        width={120}
                        height={40}
                        className="h-12 w-auto"
                    />
                    <div className="space-y-2">
                        <h2 className="text-lg font-bold text-foreground/90 tracking-tight">
                            {user?.firstName ? `Good to see you, ${user.firstName}` : "System Ready"}
                        </h2>
                        <p className="text-sm text-muted-foreground leading-relaxed font-medium">
                            Your personal AI assistant is initialized and ready to help. How can I assist you today?
                        </p>
                    </div>
                    <div className="flex flex-wrap justify-center gap-2">
                        {['Draft an email', 'Plan my day', 'Summarize notes'].map((suggestion) => (
                            <button
                                key={suggestion}
                                onClick={() => handleSend(suggestion)}
                                className="px-4 py-2 rounded-full border border-border/60 text-xs font-bold text-foreground/60 hover:bg-muted/50 hover:text-foreground transition-all"
                                disabled={createConversationMutation.isPending}
                            >
                                {suggestion}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="w-full bg-linear-to-t from-background via-background/95 to-transparent pb-6 pt-4 relative">
                <div className="max-w-3xl mx-auto px-4">

                    <InputField
                        onSendMessage={handleSend}
                        onKeyDown={handleKeyDown}
                        disabled={createConversationMutation.isPending}
                    />

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
