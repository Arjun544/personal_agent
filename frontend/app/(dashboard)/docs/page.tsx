
import { Docs } from "@/components/ui/features/docs/docs";
import { getQueryClient } from "@/lib/get-query-client";
import { getDocuments } from "@/services/doc";
import { auth } from "@clerk/nextjs/server";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";

export default async function DocsPage() {
    const { getToken } = await auth();
    const token = await getToken();
    const queryClient = getQueryClient()

    await queryClient.prefetchQuery({
        queryKey: ['documents'],
        queryFn: () => getDocuments(token || undefined),
    })

    return <HydrationBoundary state={dehydrate(queryClient)}>
        <Docs />
    </HydrationBoundary>
}
