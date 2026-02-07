'use client'

import { Plus, SendHorizonal } from "lucide-react";
import { memo, useCallback, useState } from "react";
import { Button } from "../../button";
import { Textarea } from "../../textarea";

interface InputFieldProps {
    onSendMessage?: (message: string) => void;
    disabled?: boolean;
}

export const InputField = memo(function InputField({ onSendMessage, disabled }: InputFieldProps) {
    const [message, setMessage] = useState("");

    const handleSend = useCallback(() => {
        const nextMessage = message.trim();
        if (!nextMessage || disabled) return;

        setMessage("");
        onSendMessage?.(nextMessage);
    }, [message, onSendMessage, disabled]);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    return (
        <div className="relative group/input">
            <div className={`relative flex items-end gap-2 p-2 bg-card/60 backdrop-blur-xl border border-border/80 rounded-[24px] shadow-lg ring-1 ring-border/20 focus-within:ring-primary/20 focus-within:border-primary/40 transition-all duration-500 hover:border-border ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}>
                <Button
                    size="icon"
                    variant="ghost"
                    className="h-10 w-10 shrink-0 rounded-full text-muted-foreground/50 hover:text-primary hover:bg-primary/5 transition-colors"
                    disabled={disabled}
                >
                    <Plus className="h-5 w-5" />
                </Button>

                <Textarea
                    onKeyDown={handleKeyDown}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Ask your personal assistant..."
                    className="flex-1 min-h-[44px] max-h-[200px] resize-none border-0 bg-transparent px-2 py-3 text-[15px] focus-visible:ring-0 focus-visible:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50 ring-0! shadow-none! selection:bg-primary/20 placeholder:text-muted-foreground/60 placeholder:font-medium"
                    rows={1}
                    disabled={disabled}
                />

                <Button
                    size="icon"
                    className={`h-10 w-10 shrink-0 rounded-full transition-all duration-500 ${message.trim() && !disabled
                        ? 'bg-primary text-primary-foreground shadow-[0_0_15px_rgba(var(--primary),0.3)] hover:scale-105 active:scale-95'
                        : 'bg-muted/50 text-muted-foreground/30 opacity-50 cursor-not-allowed'
                        }`}
                    onClick={handleSend}
                    disabled={!message.trim() || disabled}
                >
                    <SendHorizonal className="h-5 w-5" />
                </Button>
            </div>

            <div className="absolute -inset-0.5 bg-linear-to-r from-primary/10 to-transparent rounded-[26px] -z-10 opacity-0 group-focus-within/input:opacity-100 transition-opacity duration-700 blur-sm" />
        </div>
    );
});

