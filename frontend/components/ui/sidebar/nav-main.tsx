"use client"

import { type LucideIcon } from "lucide-react"

import {
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from "@/components/ui/sidebar"

export function NavMain({
    items,
}: {
    items: {
        title: string
        url: string
        icon: LucideIcon
        isActive?: boolean
    }[]
}) {
    return (
        <SidebarMenu className="gap-2">
            {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                        asChild
                        isActive={item.isActive}
                        className="h-11 px-3 bg-primary/5 hover:bg-primary/10 text-primary transition-all duration-200 rounded-lg cursor-pointer hover:shadow-2xs"
                    >
                        <a href={item.url} className="flex items-center gap-3">
                            <item.icon className="size-[18px] group-hover:scale-110 group-data-[active=true]:scale-110 transition-transform" />
                            <span className="font-semibold">{item.title}</span>
                        </a>
                    </SidebarMenuButton>
                </SidebarMenuItem>
            ))}
        </SidebarMenu>
    )
}
