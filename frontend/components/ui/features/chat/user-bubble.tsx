import { Message } from "@/lib/types";
import { memo } from "react";

export const UserBubble =function UserBubble({ message }: { message: Message }) {
    return (
        <div className="flex flex-col items-end gap-1.5 max-w-[85%] group">
            <div className="flex bg-primary text-primary-foreground rounded-2xl rounded-tr-sm px-4 py-2.5 text-sm md:text-[15px] leading-relaxed break-words shadow-md transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 active:scale-[0.98] border border-primary/20">
                <p className="font-medium selection:bg-primary-foreground/20">{message.content as string}</p>
            </div>
            <span className="text-[10px] text-muted-foreground/0 group-hover:text-muted-foreground/40 transition-all duration-300 px-1">
                You
            </span>
        </div>
    );
};

