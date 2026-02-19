'use client'

import { ingestPdf } from "@/services/doc";
import { useAuth } from "@clerk/nextjs";
import { useMutation } from "@tanstack/react-query";
import { FileText, Loader2, Plus, SendHorizonal, Square, X } from "lucide-react";
import { memo, useCallback, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "../../button";
import { Textarea } from "../../textarea";

interface InputFieldProps {
    onSendMessage?: (message: string, docUrl?: string) => void;
    onFileSelect?: (file: File) => void;
    onKeyDown?: (e: React.KeyboardEvent<HTMLTextAreaElement>, message: string) => void;
    disabled?: boolean;
    isStreaming?: boolean;
    onStop?: () => void;
}

export const InputField = memo(function InputField({ onSendMessage, onFileSelect, onKeyDown, disabled, isStreaming, onStop }: InputFieldProps) {
    const [message, setMessage] = useState("");
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [uploadedDocUrl, setUploadedDocUrl] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { getToken } = useAuth();

    const uploadMutation = useMutation({
        mutationKey: ['upload-pdf'],
        mutationFn: async (file: File) => {
            const token = await getToken();
            return await ingestPdf(file, token || undefined);
        },
        onSuccess: (data: any) => { // Use 'any' or proper type if imported
            if (data?.publicUrl) {
                setUploadedDocUrl(data.publicUrl);
            }
        },
        onSettled: () => {
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    });

    const isUploading = uploadMutation.isPending;

    const handleSend = useCallback(() => {
        const nextMessage = message.trim();
        const hasFile = selectedFile && !isUploading;

        if ((!nextMessage && !hasFile) || disabled || isStreaming) return;

        if (nextMessage) {
            onSendMessage?.(nextMessage, uploadedDocUrl || undefined);
        } else if (hasFile && uploadedDocUrl) {
            // If only file is present, send a default message or handle as file-only
            onSendMessage?.("Sent a file", uploadedDocUrl);
        }

        if (hasFile) {
            onFileSelect?.(selectedFile);
        }

        setMessage("");
        setSelectedFile(null);
        setUploadedDocUrl(null);
        uploadMutation.reset();
    }, [message, onSendMessage, onFileSelect, disabled, isStreaming, selectedFile, isUploading, uploadMutation, uploadedDocUrl]);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.type !== "application/pdf") {
            toast.info("Only PDF files are allowed");
            return;
        }

        setSelectedFile(file);
        uploadMutation.mutate(file);
    };


    return (
        <div className="relative group/input">
            <div className={`relative flex flex-col p-2 bg-card/60 backdrop-blur-xl border border-border/80 rounded-[32px] shadow-lg ring-1 ring-border/20 focus-within:ring-primary/20 focus-within:border-primary/40 transition-all duration-500 hover:border-border ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}>

                {/* File Upload Preview */}
                {selectedFile && (
                    <div
                        className="flex items-center gap-3 p-2 mb-2 bg-muted/20 border border-border/40 rounded-2xl w-fit transition-all duration-500 animate-in fade-in slide-in-from-bottom-2"
                        style={{ opacity: isUploading ? 0.75 : 1 }}
                    >
                        <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center shrink-0 border border-red-500/20">
                            {isUploading ? <Loader2 className="w-5 h-5 text-red-500 animate-spin" /> : <FileText className="w-5 h-5 text-red-500" />}
                        </div>
                        <div className="flex-1 min-w-0 pr-8 relative">
                            <p className="text-xs font-bold text-foreground/90 truncate max-w-[200px]">
                                {selectedFile.name}
                            </p>
                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mt-0.5">
                                {isUploading ? 'Uploading...' : 'PDF'}
                            </p>
                            <button
                                onClick={() => {
                                    setSelectedFile(null);
                                    setUploadedDocUrl(null);
                                    uploadMutation.reset();
                                }}
                                className="absolute top-1/2 -right-1 -translate-y-1/2 p-1.5 rounded-full hover:bg-muted/50 text-muted-foreground transition-colors"
                                disabled={isUploading}
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                )}

                <div className="flex items-center gap-2">
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        accept=".pdf"
                        className="hidden"
                    />

                    <Button
                        size="icon"
                        variant="ghost"
                        className="h-10 w-10 shrink-0 rounded-full text-muted-foreground hover:text-primary hover:bg-primary/5 transition-all duration-300 relative overflow-hidden group"
                        disabled={disabled || isStreaming || isUploading}
                        onClick={() => fileInputRef.current?.click()}
                    >
                        {isUploading ? (
                            <Loader2 className="h-5 w-5 animate-spin" />
                        ) : (
                            <>
                                <Plus className="h-5 w-5 group-hover:scale-110 transition-transform" />
                                <div className="absolute inset-0 bg-primary/0 group-hover:bg-primary/5 transition-colors" />
                            </>
                        )}
                    </Button>

                    <Textarea
                        onKeyDown={onKeyDown ? (e) => onKeyDown(e, message) : handleKeyDown}
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder={isStreaming ? "AI is thinking..." : "Ask your personal assistant..."}
                        className="flex-1 min-h-[44px] max-h-[200px] resize-none border-0 bg-transparent px-2 py-3 text-[15px] focus-visible:ring-0 focus-visible:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50 ring-0! shadow-none! selection:bg-primary/20 placeholder:text-muted-foreground/60 placeholder:font-medium"
                        rows={1}
                        disabled={disabled || isStreaming}
                    />

                    {isStreaming ? (
                        <Button
                            size="icon"
                            className="h-8 w-8 shrink-0 rounded-full hover:text-white transition-all duration-300"
                            onClick={onStop}
                        >
                            <Square className="h-4 w-4 fill-current" />
                        </Button>
                    ) : (
                        <Button
                            size="icon"
                            className={`h-8 w-8 shrink-0 rounded-full transition-all duration-500 ${(message.trim() || (selectedFile && !isUploading)) && !disabled
                                ? 'bg-primary text-primary-foreground shadow-[0_0_15px_rgba(var(--primary),0.3)] hover:scale-105 active:scale-95'
                                : 'bg-muted/50 text-muted-foreground/30 opacity-50 cursor-not-allowed'
                                }`}
                            onClick={handleSend}
                            disabled={(!message.trim() && !(selectedFile && !isUploading)) || disabled}
                        >
                            <SendHorizonal className="h-5 w-5" />
                        </Button>
                    )}
                </div>
            </div>

            <div className="absolute -inset-0.5 bg-linear-to-r from-primary/10 to-transparent rounded-[26px] -z-10 opacity-0 group-focus-within/input:opacity-100 transition-opacity duration-700 blur-sm" />
        </div>
    );
});
