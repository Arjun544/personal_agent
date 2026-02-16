'use client'
import { useCopy } from "@/hooks/use-copy";
import { Message } from "@/lib/types";
import { Check, Copy, CopyCheck } from "lucide-react";

export const UserBubble = function UserBubble({ message }: { message: Message }) {
    const { isCopied, copyToClipboard } = useCopy();

    const handleCopy = () => {
        copyToClipboard(message.content as string);
    }

    return (
        <div className="flex flex-col items-end gap-1.5 max-w-[85%] group">
            <div className="flex bg-primary text-primary-foreground rounded-2xl rounded-tr-sm px-4 py-2.5 text-sm md:text-[15px] leading-relaxed wrap-break-word shadow-md transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 active:scale-[0.98] border border-primary/20">
                <p className="font-medium selection:bg-primary-foreground/20">{message.content as string}</p>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground/0 group-hover:text-muted-foreground/75 transition-all duration-300 mt-1">
                {isCopied ? <CopyCheck size={15} className="cursor-pointer" /> : <Copy size={15} className="cursor-pointer" onClick={handleCopy} />}
            </div>
        </div>
    );
};

