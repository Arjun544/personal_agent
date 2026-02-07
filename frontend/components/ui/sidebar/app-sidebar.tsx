"use client"

import {
    Edit2
} from "lucide-react"
import Image from "next/image"

import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader
} from "@/components/ui/sidebar"
import { Conversation } from "@/lib/types"
import { NavHistory } from "./nav-history"
import { NavMain } from "./nav-main"
import { NavUser } from "./nav-user"

import { usePathname } from "next/navigation"

export function AppSidebar({
    conversations,
    ...props
}: {
    conversations: Conversation[]
} & React.ComponentProps<typeof Sidebar>) {
    const pathname = usePathname()

    // This is sample data.
    const data = {
        navUser: {
            name: "John Doe",
            email: "john.doe@example.com",
            avatar: "/logo_svg.svg",
        },
        navMain: [
            {
                title: "New Chat",
                url: "/new",
                icon: Edit2,
                isActive: pathname === "/new",
            },
        ],
    }

    return (
        <Sidebar
            className="border-r border-sidebar-border bg-sidebar/50 backdrop-blur-xl"
            {...props}
        >
            <SidebarHeader className="px-4 py-6">
                <div className="flex items-center gap-3 px-2 mb-4">

                    <Image
                        src="/logo_svg.svg"
                        alt="Persona"
                        width={32}
                        height={32}
                        className="h-7 w-auto"
                    />

                    <div className="flex flex-col">
                        <span className="text-sm font-semibold tracking-tight text-foreground">Persona</span>
                        <span className="text-[10px] uppercase tracking-wider text-muted-foreground/70 font-bold">Intelligent Agent</span>
                    </div>
                </div>
                <NavMain items={data.navMain} />
            </SidebarHeader>
            <SidebarContent className="px-2">
                <NavHistory conversations={conversations} />
            </SidebarContent>
            <SidebarFooter className="p-4 bg-sidebar/30 border-t border-sidebar-border/50">
                <NavUser user={data.navUser} />
            </SidebarFooter>
        </Sidebar>
    )
}
