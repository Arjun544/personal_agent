import { ChatMessages } from "@/components/ui/features/chat/chat-messages";
import { getQueryClient } from "@/lib/get-query-client";
import { getMessages } from "@/services/history";
import { HydrationBoundary, dehydrate, queryOptions } from "@tanstack/react-query";

export default async function ChatPage({ params }: { params: { id: string } }) {
    const { id } = await params;

    const queryClient = getQueryClient()

    void queryClient.prefetchQuery(queryOptions({
        queryKey: ['chat-messages', id],
        queryFn: () => getMessages(id),
    }))

    return (
        <div className="flex-1 flex flex-col min-h-0">
            <HydrationBoundary state={dehydrate(queryClient)}>
                <ChatMessages id={id} />
            </HydrationBoundary>
        </div>
    )
}