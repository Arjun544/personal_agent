'use client'
import { useCopy } from "@/hooks/use-copy";

import { Message } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Copy, CopyCheck, Loader2, Terminal } from "lucide-react";
import Image from "next/image";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface AssistantBubbleProps {
    message: Message;
    status: string | null;
    isLast?: boolean;
}

export const AssistantBubble = function AssistantBubble({ message, status, isLast }: AssistantBubbleProps) {
    const isStreaming = message.status === 'streaming';
    const showStatus = isLast && (isStreaming || status);

    const { isCopied, copyToClipboard } = useCopy();

    const handleCopy = () => {
        copyToClipboard(message.content as string);
    }


    return (
        <div className="flex flex-col gap-2 max-w-[90%] group animate-in fade-in slide-in-from-bottom-3 duration-700 ease-out">
            <div className="flex gap-4 items-start">
                <div className={cn(
                    "w-10 h-10 rounded-2xl flex items-center justify-center transition-all duration-500",
                    isStreaming && "scale-110"
                )}>
                    <Image
                        src="/logo_svg.svg"
                        alt="Assistant"
                        width={24}
                        height={24}
                        className={cn(
                            "w-6 h-6 object-contain transition-transform duration-500",
                            isStreaming && "animate-pulse"
                        )}
                    />
                </div>

                {/* Content Area */}
                <div className="flex-1 flex flex-col gap-3 min-w-0">
                    {message.content && (
                        <div className={cn(
                            "relative px-6 py-5 rounded-3xl transition-all duration-500",
                            "bg-card/50 backdrop-blur-xl border border-border/40 shadow-sm",
                        )}>
                            <div className="prose prose-sm dark:prose-invert max-w-none prose-p:leading-relaxed prose-pre:my-0 prose-pre:bg-transparent prose-pre:p-0">
                                <ReactMarkdown
                                    remarkPlugins={[remarkGfm]}
                                    components={{
                                        p: ({ children }) => <p className="mb-4 last:mb-0 text-foreground/85 text-[15px] leading-[1.7]">{children}</p>,
                                        strong: ({ children }) => <span className="font-bold text-foreground bg-primary/5 px-1 rounded-sm">{children}</span>,
                                        ul: ({ children }) => <ul className="list-disc pl-5 mb-4 space-y-2 text-foreground/80">{children}</ul>,
                                        ol: ({ children }) => <ol className="list-decimal pl-5 mb-4 space-y-2 text-foreground/80">{children}</ol>,
                                        li: ({ children }) => <li className="mb-1">{children}</li>,
                                        code: ({ children, className }) => {
                                            const isInline = !className?.includes('language-');
                                            if (isInline) {
                                                return <code className="bg-primary/10 text-primary px-1.5 py-0.5 rounded-md text-[0.85em] font-bold font-mono border border-primary/5">{children}</code>;
                                            }
                                            return <code>{children}</code>;
                                        },
                                        pre: ({ children }) => (
                                            <div className="group/code relative my-6 overflow-hidden rounded-2xl border border-border/60 bg-muted/30 backdrop-blur-sm shadow-lg transition-all hover:shadow-primary/5 hover:border-border/80">
                                                <div className="flex items-center justify-between px-4 py-2.5 bg-muted/50 border-b border-border/40">
                                                    <div className="flex items-center gap-3">
                                                        <div className="flex gap-1.5">
                                                            <div className="w-2.5 h-2.5 rounded-full bg-border" />
                                                            <div className="w-2.5 h-2.5 rounded-full bg-border" />
                                                            <div className="w-2.5 h-2.5 rounded-full bg-border" />
                                                        </div>
                                                        <div className="h-3 w-px bg-border mx-1" />
                                                        <Terminal className="w-3.5 h-3.5 text-muted-foreground/60" />
                                                        <span className="text-[10px] font-bold text-muted-foreground/60 tracking-wider uppercase">Code</span>
                                                    </div>
                                                </div>
                                                <pre className="p-5 overflow-x-auto font-mono text-[13px] leading-relaxed text-foreground/90">
                                                    {children}
                                                </pre>
                                            </div>
                                        ),
                                        a: ({ children, href }) => (
                                            <a
                                                href={href}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-primary font-bold underline underline-offset-4 decoration-primary/20 hover:decoration-primary transition-all bg-primary/5 hover:bg-primary/10 px-1 rounded-sm"
                                            >
                                                {children}
                                            </a>
                                        ),
                                        blockquote: ({ children }) => (
                                            <blockquote className="border-l-4 border-primary/40 pl-5 py-2 italic my-6 text-muted-foreground bg-primary/5 rounded-r-2xl border-dashed">
                                                {children}
                                            </blockquote>
                                        ),
                                    }}
                                >
                                    {message.content}
                                </ReactMarkdown>
                            </div>

                        </div>
                    )}

                    {message.content && <div className="flex items-center gap-2 text-muted-foreground/0 group-hover:text-muted-foreground/75 transition-all duration-300 mt-1">
                        {isCopied ? <CopyCheck size={15} className="cursor-pointer" /> : <Copy size={15} className="cursor-pointer" onClick={handleCopy} />}
                    </div>}

                    {/* Status: Outside Bubble */}
                    {showStatus && status && (
                        <div className="flex items-center gap-2.5 px-4 py-2 self-start bg-primary/5 rounded-full border border-primary/10 animate-in fade-in slide-in-from-left-4 duration-500">
                            <div className="relative">
                                <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
                                <div className="absolute inset-0 bg-primary/20 blur-[2px] rounded-full animate-pulse" />
                            </div>
                            <span className="text-[11px] font-bold text-primary/80 tracking-tighter uppercase italic">{status}</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

