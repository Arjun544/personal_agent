import { Message } from "@/lib/types";
import { Loader2, Terminal } from "lucide-react";
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

    return (
        <div className="flex gap-2.5 max-w-[92%] group">
            <div className="text-sm md:text-[15px] leading-relaxed wrap-break-word rounded-2xl rounded-tl-sm px-5 py-4 bg-card border border-border/40 shadow-sm relative transition-all duration-300 hover:shadow-md hover:border-border/60">
                {showStatus && status && (
                    <div className="flex items-center gap-2.5 mb-4 bg-primary/5 py-1.5 px-3 rounded-full w-fit animate-in fade-in slide-in-from-top-2 duration-500 border border-primary/10">
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
                        <span className="text-xs font-bold text-primary/80 tracking-tight">{status}...</span>
                    </div>
                )}

                <div className="prose prose-sm dark:prose-invert max-w-none prose-p:leading-relaxed prose-pre:my-0 prose-pre:bg-transparent prose-pre:p-0">
                    <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                            p: ({ children }) => <p className="mb-4 last:mb-0 text-foreground/85">{children}</p>,
                            strong: ({ children }) => <span className="font-bold text-foreground">{children}</span>,
                            ul: ({ children }) => <ul className="list-disc pl-5 mb-4 space-y-2 text-foreground/80">{children}</ul>,
                            ol: ({ children }) => <ol className="list-decimal pl-5 mb-4 space-y-2 text-foreground/80">{children}</ol>,
                            li: ({ children }) => <li className="mb-1">{children}</li>,
                            code: ({ children, className }) => {
                                const isInline = !className?.includes('language-');
                                if (isInline) {
                                    return <code className="bg-primary/5 text-primary px-1.5 py-0.5 rounded-md text-[0.9em] font-bold font-mono border border-primary/10">{children}</code>;
                                }
                                return <code>{children}</code>;
                            },
                            pre: ({ children }) => (
                                <div className="group/code relative my-5 overflow-hidden rounded-xl border border-border/60 bg-muted/40 backdrop-blur-sm shadow-sm transition-all hover:shadow-md">
                                    <div className="flex items-center justify-between px-4 py-2 bg-muted/50 border-b border-border/40">
                                        <div className="flex items-center gap-2">
                                            <Terminal className="w-3.5 h-3.5 text-muted-foreground" />
                                            <span className="text-[10px] font-bold text-muted-foreground tracking-tighter uppercase">Code Snippet</span>
                                        </div>
                                    </div>
                                    <pre className="p-4 overflow-x-auto font-mono text-[13px] leading-relaxed">
                                        {children}
                                    </pre>
                                </div>
                            ),
                            a: ({ children, href }) => (
                                <a
                                    href={href}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-primary font-bold underline underline-offset-4 decoration-primary/20 hover:decoration-primary transition-all"
                                >
                                    {children}
                                </a>
                            ),
                            blockquote: ({ children }) => (
                                <blockquote className="border-l-4 border-primary/30 pl-4 py-1 italic my-5 text-muted-foreground bg-primary/5 rounded-r-lg">
                                    {children}
                                </blockquote>
                            ),
                        }}
                    >
                        {message.content}
                    </ReactMarkdown>

                    {isStreaming && !status && (
                        <span className="inline-block w-1 h-4 bg-primary/40 animate-pulse align-middle rounded-full shadow-[0_0_8px_rgba(var(--primary),0.3)]" />
                    )}
                </div>
            </div>
        </div>
    );
};

