"use client"

import {
    LogIn
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
    SidebarGroup,
    SidebarGroupLabel,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem
} from "@/components/ui/sidebar"
import { Conversation } from "@/lib/types"
import { getConversations } from "@/services/history"
import { SignInButton, useAuth, useUser } from "@clerk/nextjs"
import { useQuery } from "@tanstack/react-query"

import { usePathname } from "next/navigation"

export function NavHistory({ conversations: initialData }: { conversations: Conversation[] }) {
    const { isSignedIn } = useAuth()
    const { user } = useUser()
    const pathname = usePathname()

    const { data: conversations } = useQuery({
        queryKey: ['conversations'],
        queryFn: () => getConversations(user!.id),
        initialData: initialData,
        enabled: !!user?.id,
    });

    const displayConversations = conversations ?? initialData;

    return (
        <SidebarGroup className="group-data-[collapsible=icon]:hidden">
            <div className="flex items-center justify-between px-2 mb-2">
                <SidebarGroupLabel className="px-0 text-[11px] font-bold uppercase tracking-widest text-muted-foreground/60">
                    Recent Conversations
                </SidebarGroupLabel>
            </div>

            {!isSignedIn && (
                <div className="px-2 mb-4">
                    <Card className="shadow-none border-dashed bg-muted/30">
                        <CardContent className="p-4 text-center space-y-4">
                            <div className="space-y-1">
                                <p className="text-xs font-medium text-muted-foreground/80">
                                    Sign in to view your history and save your chats.
                                </p>
                            </div>
                            <SignInButton mode="modal">
                                <Button size="sm" className="w-full h-8 text-xs font-semibold rounded-lg cursor-pointer" variant="secondary">
                                    <LogIn className="mr-2 size-3" />
                                    Sign In
                                </Button>
                            </SignInButton>
                        </CardContent>
                    </Card>
                </div>
            )}
            <SidebarMenu className="gap-0.5">
                {isSignedIn && displayConversations.map((item) => (
                    <SidebarMenuItem key={item.id} className="group/item">
                        <SidebarMenuButton
                            asChild
                            isActive={pathname === `/chat/${item.id}`}
                            className="h-9 px-2 hover:bg-sidebar-accent/50 transition-colors rounded-lg relative overflow-hidden data-[active=true]:bg-sidebar-accent/70 data-[active=true]:ring-primary/10 group"
                        >
                            <a href={`/chat/${item.id}`} title={item.title ?? "Unknown"} className="flex items-center gap-2">
                                <span className="capitalize truncate text-sm font-medium text-foreground/70 group-hover/item:text-foreground group-data-[active=true]:text-foreground group-data-[active=true]:font-semibold">
                                    {item.title ?? 'New Conversation'}
                                </span>
                            </a>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                ))}
            </SidebarMenu>
        </SidebarGroup>
    )
}
