import { tool } from "@langchain/core/tools";
import z from "zod";
import { searchDocuments } from "../services/doc";

/**
 * Tool to search specifically through uploaded documents/PDFs.
 */
export const documentSearchTool = tool(
    async ({ query }, runtime) => {
        const userId = runtime.context?.userId;
        if (!userId) return "Error: User ID not found in context.";

        try {
            const results = await searchDocuments(userId, query, 5);

            if (results.length === 0) return "No relevant information found in the documents.";

            return results
                .map(r => {
                    const meta = r.metadata as any;
                    return `[Source: ${meta.source}, Page: ${meta.pageNumber}]\n${r.content}`;
                })
                .join("\n\n");
        } catch (error) {
            console.error("Document search failed:", error);
            return "Error searching documents.";
        }
    },
    {
        name: "search_documents",
        description: "Search internal uploaded documents for proprietary information, project details, and specific terminology (like 'Cordion'). USE THIS FIRST for questions about specific entities or 'what is' questions.",
        schema: z.object({
            query: z.string().describe("The specific term or question to find in the user's private files."),
        }),
    }
);