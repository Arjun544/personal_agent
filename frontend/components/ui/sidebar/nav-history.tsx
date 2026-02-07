"use client"

import {
    ArrowUpRight,
    Link as LinkIcon,
    LogIn,
    MoreHorizontal,
    StarOff,
    Trash2,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
    SidebarGroup,
    SidebarGroupLabel,
    SidebarMenu,
    SidebarMenuAction,
    SidebarMenuButton,
    SidebarMenuItem,
    useSidebar,
} from "@/components/ui/sidebar"
import { Conversation } from "@/lib/types"
import { getConversations } from "@/services/history"
import { SignInButton, useAuth, useUser } from "@clerk/nextjs"
import { useQuery } from "@tanstack/react-query"

import { usePathname } from "next/navigation"

export function NavHistory({ conversations: initialData }: { conversations: Conversation[] }) {
    const { isMobile } = useSidebar()
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
                                <Button size="sm" className="w-full h-8 text-xs font-semibold rounded-lg" variant="secondary">
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
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <SidebarMenuAction
                                    showOnHover
                                    className="opacity-0 group-hover/item:opacity-100 transition-opacity hover:bg-primary/10 hover:text-primary rounded-md"
                                >
                                    <MoreHorizontal className="size-4" />
                                    <span className="sr-only">More</span>
                                </SidebarMenuAction>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent
                                className="w-56 rounded-xl shadow-lg border-sidebar-border"
                                side={isMobile ? "bottom" : "right"}
                                align={isMobile ? "end" : "start"}
                            >
                                <DropdownMenuItem className="gap-2 cursor-pointer transition-colors">
                                    <StarOff className="size-4 text-muted-foreground" />
                                    <span>Remove from Favorites</span>
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem className="gap-2 cursor-pointer transition-colors">
                                    <LinkIcon className="size-4 text-muted-foreground" />
                                    <span>Copy Link</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem className="gap-2 cursor-pointer transition-colors">
                                    <ArrowUpRight className="size-4 text-muted-foreground" />
                                    <span>Open in New Tab</span>
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem className="gap-2 cursor-pointer transition-colors text-destructive focus:text-destructive">
                                    <Trash2 className="size-4" />
                                    <span>Delete Chat</span>
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </SidebarMenuItem>
                ))}
            </SidebarMenu>
        </SidebarGroup>
    )
}
