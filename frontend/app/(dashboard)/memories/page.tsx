
import { Memories } from "@/components/ui/features/memories/memories";
import { getQueryClient } from "@/lib/get-query-client";
import { getMemories, Memory } from "@/services/memory";
import { auth } from "@clerk/nextjs/server";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";

export default async function MemoriesPage() {
    const { getToken } = await auth();
    const token = await getToken();
    const queryClient = getQueryClient()

    await queryClient.prefetchInfiniteQuery({
        queryKey: ['memories'],
        queryFn: ({ pageParam }) => getMemories(token || undefined, 20, pageParam as string | undefined),
        initialPageParam: undefined as string | undefined,
        getNextPageParam: (lastPage: { memories: Memory[], nextCursor: string | null }) => lastPage.nextCursor,
    })

    return <HydrationBoundary state={dehydrate(queryClient)}>
               <Memories />
           </HydrationBoundary>
}
