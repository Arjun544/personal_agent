import { tool } from "@langchain/core/tools";
import { ChatOpenAI } from "@langchain/openai";
import { createAgent, dynamicSystemPromptMiddleware } from "langchain";
import { z } from "zod";
import { PERSONAL_PROMPT } from "../prompts/personal";
import { calculateTool } from "../tools/calculate-tool";
import { currentTimeTool } from "../tools/current-time-tool";
import { checkpointer, store } from "./checkpointer";

const llm = new ChatOpenAI({
    modelName: "gpt-4o",
    temperature: 0.7,
});

const contextSchema = z.object({
    userId: z.string(),
});

/**
 * Tool to save long-term memory about the user.
 * This information persists across different conversations (threads).
 */
const upsertMemoryTool = tool(
    async ({ content, key }, runtime) => {
        const userId = runtime.context?.userId;
        if (!userId) return "Error: User ID not found in context.";

        // Use runtime.store to ensure the operation is bound to the agent's execution
        await runtime.store.put(["memories", userId], key, { content });
        return `Successfully remembered ${key}.`;
    },
    {
        name: "upsert_memory",
        description: "Save user preferences or facts for future conversations.",
        schema: z.object({
            key: z.string().describe("Short key like 'favorite_color'"),
            content: z.string().describe("The info to remember"),
        }),
    }
);

// Define tools available to the agent
const tools = [currentTimeTool, calculateTool, upsertMemoryTool];

/**
 * Middleware to dynamically inject long-term memories into the system prompt.
 */
const memoryMiddleware = dynamicSystemPromptMiddleware<z.infer<typeof contextSchema>>(
    async (state, runtime) => {
        const userId = runtime.context?.userId;
        const store = runtime.store;

        if (!userId || !store) return PERSONAL_PROMPT;

        try {
            // Search the store using the namespace
            const items = await store.search(["memories", userId]);
            const memoriesContext = items.length > 0
                ? "\n\n### User Information:\n" + items.map(i => `- ${i.key}: ${i.value.content}`).join("\n")
                : "";

            return PERSONAL_PROMPT + memoriesContext;
        } catch (error) {
            console.error("Store search failed:", error);
            return PERSONAL_PROMPT;
        }
    }
);
/**
 * We use dynamicSystemPromptMiddleware to inject long-term memories into the system prompt.
 */
export const agent = createAgent({
    model: llm,
    tools,
    checkpointer,
    store,
    contextSchema,
    middleware: [memoryMiddleware],
});
