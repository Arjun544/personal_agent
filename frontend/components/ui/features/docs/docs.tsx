"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getDocuments } from "@/services/doc";
import { useAuth } from "@clerk/nextjs";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { ExternalLink, FileText } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";

interface Doc {
    name: string;
    url: string;
}

export function Docs() {
    const { getToken, isLoaded } = useAuth();
    const queryClient = useQueryClient();

    const { data: documents, isLoading } = useSuspenseQuery({
        queryKey: ['documents'],
        queryFn: async () => {
            const token = await getToken();
            return getDocuments(token || undefined);
        },
    });

    // Prefetch on load
    useEffect(() => {
        if (isLoaded) {
            getToken().then(token => {
                if (token) {
                    queryClient.prefetchQuery({
                        queryKey: ["documents"],
                        queryFn: () => getDocuments(token),
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
                            Documents
                        </h1>
                        <p className="text-muted-foreground text-lg max-w-2xl">
                            A collection of uploaded documents and resources.
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
                ) : documents && documents.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                        {documents.map((doc: Doc, index: number) => (
                            <Link href={doc.url} key={index} target="_blank" passHref>
                                <Card className="transition-all hover:bg-accent/40 h-full cursor-pointer group">
                                    <CardHeader className="space-y-3">
                                        <div className="flex justify-between items-center">
                                            <Badge variant="secondary" className="font-medium">
                                                PDF
                                            </Badge>
                                            <ExternalLink className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                                        </div>
                                        <CardTitle className="text-base font-medium leading-relaxed flex items-center gap-2">
                                            <FileText className="w-5 h-5 text-muted-foreground shrink-0" />
                                            <span className="truncate" title={doc.name}>{doc.name}</span>
                                        </CardTitle>
                                    </CardHeader>
                                </Card>
                            </Link>
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-20 text-center space-y-6 border border-dashed rounded-2xl">
                        <div className="p-4 rounded-full bg-secondary">
                            <FileText className="w-8 h-8 text-muted-foreground" />
                        </div>
                        <div className="space-y-2">
                            <h3 className="text-xl font-semibold">No documents found</h3>
                            <p className="text-muted-foreground max-w-sm">
                                Upload documents in the chat to see them here.
                            </p>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
