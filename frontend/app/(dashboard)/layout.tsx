import {
    SidebarInset,
    SidebarProvider,
    SidebarTrigger,
} from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/ui/sidebar/app-sidebar";
import { getQueryClient } from "@/lib/get-query-client";
import { getConversations } from "@/services/history";
import { clerkClient, currentUser } from "@clerk/nextjs/server";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";



export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const user = await currentUser();
    const queryClient = getQueryClient();

    if (user) {
        await queryClient.prefetchQuery({
            queryKey: ['conversations'],
            queryFn: () => getConversations(user.id),
        });
    }

    const conversations = user ? await getConversations(user.id) : [];


    const client = clerkClient();

    const response = await (await client).users.getUserOauthAccessToken(user!.id, 'oauth_google')
    console.log('response', response.data[0].idToken)



    return (
        <SidebarProvider defaultOpen={true}>
            <HydrationBoundary state={dehydrate(queryClient)}>
                <div className="flex h-screen w-full">
                    <AppSidebar conversations={conversations ?? []} />
                    <SidebarInset className="flex flex-1 flex-col">
                        <header className="sticky top-0 z-10 flex h-16 items-center gap-4 bg-white px-6">
                            <SidebarTrigger />
                        </header>
                        <main className="flex-1 flex flex-col min-h-0 bg-white">{children}</main>
                    </SidebarInset>
                </div>
            </HydrationBoundary>
        </SidebarProvider>
    );
}
