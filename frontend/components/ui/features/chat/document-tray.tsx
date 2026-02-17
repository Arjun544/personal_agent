'use client'

import { ScrollArea } from '@/components/ui/scroll-area'
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from "@/components/ui/sheet"
import { getDocuments } from '@/services/doc'
import { useAuth } from '@clerk/nextjs'
import { Clock, ExternalLink, FileText, FolderOpen, Hash, Library, Loader2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Button } from '../../button'

interface Document {
    name: string;
    url: string;
}

export function DocumentTray() {
    const [documents, setDocuments] = useState<Document[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const { getToken } = useAuth();

    useEffect(() => {
        fetchDocs();
    }, []);

    const fetchDocs = async () => {
        setIsLoading(true);
        try {
            const token = await getToken();
            const docs = await getDocuments(token || undefined);
            setDocuments(docs);
        } catch (error) {
            console.error("Error fetching docs:", error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Sheet>
            <SheetTrigger>
                <Button
                    variant="ghost"
                    size="sm"
                    className="gap-2 text-xs font-bold text-muted-foreground hover:text-primary hover:bg-primary/5 rounded-xl px-4"
                >
                    <Library className="w-4 h-4" />
                    <span className="hidden sm:inline">Library</span>
                </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-80 sm:w-96 p-0 gap-0">
                <SheetHeader className="p-6 border-b border-border/40">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
                            <FolderOpen className="w-5 h-5 text-primary" />
                        </div>
                        <div className="space-y-0.5">
                            <SheetTitle className="text-sm font-bold tracking-tight">Your Knowledge</SheetTitle>
                            <SheetDescription className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">
                                {documents.length} {documents.length === 1 ? 'Document' : 'Documents'} Available
                            </SheetDescription>
                        </div>
                    </div>
                </SheetHeader>

                <ScrollArea className="flex-1 p-4">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-12 gap-3">
                            <Loader2 className="w-6 h-6 text-primary animate-spin" />
                            <p className="text-xs font-medium text-muted-foreground">Indexing library...</p>
                        </div>
                    ) : documents.length > 0 ? (
                        <div className="space-y-3">
                            {documents.map((doc, i) => (
                                <div
                                    key={doc.name}
                                    className="group relative p-4 rounded-2xl bg-card border border-border/50 hover:border-primary/30 hover:shadow-lg transition-all duration-300 animate-in fade-in slide-in-from-right-4"
                                    style={{ animationDelay: `${i * 50}ms` }}
                                >
                                    <div className="flex items-start gap-4">
                                        <div className="mt-1 w-10 h-10 rounded-xl bg-muted/30 flex items-center justify-center shrink-0 group-hover:bg-primary/5 transition-colors">
                                            <FileText className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h3 className="text-sm font-bold text-foreground/90 truncate group-hover:text-primary transition-colors pr-6">
                                                {doc.name}
                                            </h3>
                                            <div className="flex items-center gap-3 mt-1.5">
                                                <span className="flex items-center gap-1 text-[10px] font-bold text-muted-foreground uppercase">
                                                    <Hash className="w-3 h-3" /> PDF
                                                </span>
                                                <span className="flex items-center gap-1 text-[10px] font-bold text-muted-foreground uppercase">
                                                    <Clock className="w-3 h-3" /> Managed
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <a
                                        href={doc.url}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="absolute top-4 right-4 p-2 rounded-lg bg-muted/0 hover:bg-primary/10 text-muted-foreground/30 group-hover:text-primary group-hover:bg-primary/5 transition-all opacity-0 group-hover:opacity-100"
                                    >
                                        <ExternalLink className="w-4 h-4" />
                                    </a>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-20 text-center px-6">
                            <div className="w-16 h-16 rounded-3xl bg-muted/10 flex items-center justify-center mb-4">
                                <FileText className="w-8 h-8 text-muted-foreground/30" />
                            </div>
                            <h4 className="text-sm font-bold text-foreground/90 mb-1">No documents yet</h4>
                            <p className="text-xs text-muted-foreground leading-relaxed">
                                Upload your PDFs to build a personal knowledge base for the assistant.
                            </p>
                        </div>
                    )}
                </ScrollArea>
            </SheetContent>
        </Sheet>
    );
}
