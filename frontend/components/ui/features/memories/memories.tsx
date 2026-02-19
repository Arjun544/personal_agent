"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getMemories } from "@/services/memory";
import { useAuth } from "@clerk/nextjs";
import { useQueryClient, useSuspenseInfiniteQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Layers } from "lucide-react";
import { useEffect } from "react";

export function Memories() {
    const { getToken, isLoaded } = useAuth();
    const queryClient = useQueryClient();

    const { data, isLoading } = useSuspenseInfiniteQuery({
        queryKey: ['memories'],
        queryFn: async ({ pageParam }) => {
            const token = await getToken();
            return getMemories(token || undefined);
        },
        initialPageParam: undefined as string | undefined,
        getNextPageParam: (lastPage) => lastPage.nextCursor,
    });

    const memories = data.pages.slice().reverse().flatMap((page) => page.memories);

    // Prefetch on load
    useEffect(() => {
        if (isLoaded) {
            getToken().then(token => {
                if (token) {
                    queryClient.prefetchQuery({
                        queryKey: ["memories"],
                        queryFn: () => getMemories(token),
                    });
                }
            });
        }
    }, [isLoaded, getToken, queryClient]);

    return (
        <div className="flex-1 overflow-y-auto h-full">
            <main className="max-w-full mx-auto space-y-8">
                <header className="space-y-4">
                    <div className="space-y-2">
                        <h1 className="text-3xl font-semibold tracking-tight">
                            Memories
                        </h1>
                        <p className="text-muted-foreground text-lg max-w-2xl">
                            A persistent store of insights, preferences, and facts distilled from your interactions.
                        </p>
                    </div>
                </header>

                {isLoading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                        {[...Array(6)].map((_, i) => (
                            <div key={i} className="h-40 w-full rounded-xl border bg-card p-6 space-y-4">
                                <Skeleton className="h-5 w-24 rounded-md" />
                                <Skeleton className="h-16 w-full rounded-md" />
                            </div>
                        ))}
                    </div>
                ) : memories && memories.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                        {memories.map((memory) => (
                            <Card key={memory.id} className="transition-all hover:bg-accent/40">
                                <CardHeader className="space-y-3">
                                    <div className="flex justify-between items-center">
                                        <Badge variant="secondary" className="font-medium">
                                            {memory.key || 'Universal'}
                                        </Badge>
                                        <span className="text-xs text-muted-foreground font-medium">
                                            {format(new Date(memory.createdAt), 'MMM dd, yyyy')}
                                        </span>
                                    </div>
                                    <CardTitle className="text-base font-medium leading-relaxed">
                                        {memory.content}
                                    </CardTitle>
                                </CardHeader>
                            </Card>
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-20 text-center space-y-6 border border-dashed rounded-2xl">
                        <div className="p-4 rounded-full bg-secondary">
                            <Layers className="w-8 h-8 text-muted-foreground" />
                        </div>
                        <div className="space-y-2">
                            <h3 className="text-xl font-semibold">No memories found</h3>
                            <p className="text-muted-foreground max-w-sm">
                                Start chatting to populate this memory space.
                            </p>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}