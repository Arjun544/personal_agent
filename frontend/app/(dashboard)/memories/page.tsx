'use client';

import { useAuth } from "@clerk/nextjs";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { getMemories, Memory } from "@/services/memory";
import { Brain, Calendar, Tag, Search, Sparkles, Inbox, RefreshCw, Layers, Database } from "lucide-react";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

export default function MemoriesPage() {
    const { getToken, isLoaded } = useAuth();
    const queryClient = useQueryClient();
    const [searchQuery, setSearchQuery] = useState("");

    const { data: memories, isLoading, refetch, isRefetching } = useQuery({
        queryKey: ["memories"],
        queryFn: async () => {
            const token = await getToken();
            return getMemories(token as string);
        },
        enabled: isLoaded,
    });

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

    const filteredMemories = memories?.filter(m => 
        m.key?.toLowerCase().includes(searchQuery.toLowerCase()) || 
        m.content.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="flex-1 overflow-y-auto bg-zinc-50/50 dark:bg-[#020202] text-zinc-900 dark:text-zinc-200">
            {/* Ambient Background Effect - Dark Mode Only */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none opacity-0 dark:opacity-100">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-900/20 blur-[120px] rounded-full" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-900/20 blur-[120px] rounded-full" />
                <div className="absolute top-[20%] right-[10%] w-[20%] h-[20%] bg-blue-900/10 blur-[100px] rounded-full" />
            </div>

            <main className="relative z-10 max-w-7xl mx-auto px-6 py-12 lg:py-16">
                <header className="mb-12 space-y-6">
                    <div className="space-y-2">
                        <div className="flex items-center gap-2 mb-4">
                            <div className="flex -space-x-2">
                                <div className="p-2 rounded-lg bg-indigo-500/10 border border-indigo-500/20">
                                    <Brain className="w-5 h-5 text-indigo-500" />
                                </div>
                                <div className="p-2 rounded-lg bg-purple-500/10 border border-purple-500/20 scale-90 translate-y-1">
                                    <Database className="w-5 h-5 text-purple-500" />
                                </div>
                            </div>
                            <span className="text-xs font-bold uppercase tracking-[0.2em] text-indigo-500/70 dark:text-indigo-400">Knowledge Base</span>
                        </div>
                        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-zinc-900 dark:text-white">
                            Long-term <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-purple-600 dark:from-indigo-400 dark:to-purple-500">Memories</span>
                        </h1>
                        <p className="text-zinc-500 dark:text-zinc-400 text-lg max-w-2xl font-normal leading-relaxed">
                            A persistent store of insights, preferences, and facts distilled from your interactions. This consciousness builds your agent's unique context.
                        </p>
                    </div>
                    
                    <div className="flex flex-col sm:flex-row gap-4 pt-4">
                        <div className="relative group flex-1">
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 group-focus-within:text-indigo-500 transition-colors" />
                            <Input 
                                placeholder="Search through consciousness..." 
                                className="bg-white dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-800 focus:border-indigo-500/50 focus:ring-4 focus:ring-indigo-500/5 pl-11 h-12 rounded-2xl transition-all shadow-sm dark:shadow-none"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <button 
                            onClick={() => refetch()}
                            disabled={isRefetching}
                            className="flex items-center justify-center gap-2 px-6 h-12 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded-2xl transition-all disabled:opacity-50 shadow-sm dark:shadow-none font-medium active:scale-95"
                        >
                            <RefreshCw className={`w-4 h-4 text-indigo-500 ${isRefetching ? 'animate-spin' : ''}`} />
                            <span className="text-zinc-700 dark:text-zinc-300">Refresh</span>
                        </button>
                    </div>
                </header>

                {isLoading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                        {[...Array(6)].map((_, i) => (
                            <div key={i} className="h-48 w-full rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white/50 dark:bg-zinc-900/20 p-6 space-y-4">
                                <Skeleton className="h-6 w-24 rounded-lg bg-zinc-200 dark:bg-zinc-800" />
                                <Skeleton className="h-20 w-full rounded-lg bg-zinc-100 dark:bg-zinc-800/50" />
                            </div>
                        ))}
                    </div>
                ) : filteredMemories && filteredMemories.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                        {filteredMemories.map((memory) => (
                            <Card key={memory.id} className="group relative bg-white dark:bg-zinc-900/40 border-zinc-200 dark:border-zinc-800/60 hover:border-indigo-500/30 dark:hover:border-indigo-500/30 hover:shadow-2xl hover:shadow-indigo-500/5 transition-all duration-300 rounded-[2rem] overflow-hidden backdrop-blur-md">
                                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/[0.02] via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                <CardHeader className="pb-4">
                                    <div className="flex justify-between items-start mb-2">
                                        <Badge variant="outline" className="bg-indigo-50 dark:bg-indigo-500/5 text-indigo-600 dark:text-indigo-400 border-indigo-100 dark:border-indigo-500/20 font-bold px-3 py-1 text-[10px] uppercase tracking-wider rounded-xl">
                                            {memory.key || 'Universal'}
                                        </Badge>
                                        <div className="text-[10px] text-zinc-400 dark:text-zinc-600 font-mono tracking-tighter">
                                            {format(new Date(memory.createdAt), 'MMM dd, yyyy')}
                                        </div>
                                    </div>
                                    <CardTitle className="text-zinc-800 dark:text-zinc-100 text-lg leading-relaxed font-semibold">
                                        {memory.content}
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="pt-0 pb-7 flex items-center gap-4 text-zinc-400 dark:text-zinc-500">
                                    <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest bg-zinc-50 dark:bg-white/5 px-3 py-1.5 rounded-full border border-zinc-100 dark:border-white/5">
                                        <Layers className="w-3 h-3 text-indigo-500/50" />
                                        <span>Layer 01</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest bg-zinc-50 dark:bg-white/5 px-3 py-1.5 rounded-full border border-zinc-100 dark:border-white/5">
                                        <Sparkles className="w-3 h-3 text-amber-500/50" />
                                        <span>Active</span>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-24 text-center space-y-6 bg-white dark:bg-zinc-900/20 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-[3rem]">
                        <div className="w-24 h-24 rounded-full bg-zinc-50 dark:bg-zinc-900 flex items-center justify-center border border-zinc-200 dark:border-zinc-800 shadow-inner">
                            <Layers className="w-10 h-10 text-zinc-300 dark:text-zinc-700 animate-pulse" />
                        </div>
                        <div className="space-y-2 px-6">
                            <h3 className="text-2xl font-bold text-zinc-800 dark:text-zinc-200 tracking-tight">Vast area of emptiness</h3>
                            <p className="text-zinc-500 dark:text-zinc-400 max-w-sm mx-auto leading-relaxed">
                                Your digital twin is waiting for more interactions to build its consciousness. Start chatting to populate this memory space.
                            </p>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
