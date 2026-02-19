'use client'
import { useCopy } from "@/hooks/use-copy";
import { Message } from "@/lib/types";
import { Copy, CopyCheck, FileText } from "lucide-react";

export const UserBubble = function UserBubble({ message }: { message: Message }) {
    const { isCopied, copyToClipboard } = useCopy();

    const handleCopy = () => {
        copyToClipboard(message.content as string);
    }

    return (
        <div className="flex flex-col items-end gap-1.5 max-w-[85%] group">
            {message.docUrl && (
                <a
                    href={message.docUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 p-2.5 mb-1 bg-card border border-border/60 rounded-xl hover:bg-muted/50 transition-all duration-300 shadow-sm group/doc"
                >
                    <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center border border-red-500/20 group-hover/doc:border-red-500/40 transition-colors">
                        <FileText className="w-4 h-4 text-red-500" />
                    </div>
                    <div className="flex flex-col gap-0.5">
                        <span className="text-xs font-bold text-foreground/80">Attached Document</span>
                        <span className="text-[10px] text-muted-foreground font-medium">Click to view</span>
                    </div>
                </a>
            )}
            <div className="flex bg-primary text-primary-foreground rounded-2xl rounded-tr-sm px-4 py-2.5 text-sm md:text-[15px] leading-relaxed wrap-break-word shadow-md transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 active:scale-[0.98] border border-primary/20">
                <p className="font-medium selection:bg-primary-foreground/20">{message.content as string}</p>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground/0 group-hover:text-muted-foreground/75 transition-all duration-300 mt-1">
                {isCopied ? <CopyCheck size={15} className="cursor-pointer" /> : <Copy size={15} className="cursor-pointer" onClick={handleCopy} />}
            </div>
        </div>
    );
};

