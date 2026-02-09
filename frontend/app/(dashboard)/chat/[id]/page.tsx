import { ChatMessages } from "@/components/ui/features/chat/chat-messages";
import { getQueryClient } from "@/lib/get-query-client";
import { Message } from "@/lib/types";
import { getMessages } from "@/services/history";
import { HydrationBoundary, dehydrate } from "@tanstack/react-query";

export default async function ChatPage({ params }: { params: { id: string } }) {
    const { id } = await params;

    const queryClient = getQueryClient()

    await queryClient.prefetchInfiniteQuery({
        queryKey: ['chat-messages', id],
        queryFn: ({ pageParam }) => getMessages(id, 20, pageParam as string | undefined),
        initialPageParam: undefined as string | undefined,
        getNextPageParam: (lastPage: { history: Message[], nextCursor: string | null }) => lastPage.nextCursor,
    })

    return (
        <div className="flex-1 flex flex-col min-h-0">
            <HydrationBoundary state={dehydrate(queryClient)}>
                <ChatMessages id={id} />
            </HydrationBoundary>
        </div>
    )
}