import { Calculator } from "@langchain/community/tools/calculator";
import { trimMessages } from "@langchain/core/messages";
import { tool } from "@langchain/core/tools";
import { ChatOpenAI, tools as openAItools } from "@langchain/openai";
import { createAgent, createMiddleware, dynamicSystemPromptMiddleware, llmToolSelectorMiddleware, modelCallLimitMiddleware, summarizationMiddleware } from "langchain";
import { z } from "zod";
import { createCalendarEvent, listCalendarEvents } from "../config/googleCalendar";
import { PERSONAL_PROMPT } from "../prompts/personal";
import { currentTimeTool } from "../tools/current-time-tool";
import { documentSearchTool } from "../tools/search-doc-tool";
import { checkpointer } from "./checkpointer";
import { saveMemory, searchMemory } from "./memory";


const llm = new ChatOpenAI({
    modelName: "gpt-4o",
    temperature: 0, // Lower temperature for more consistent tool use
});

const summarizationModel = new ChatOpenAI({
    modelName: "gpt-4o-mini",
    temperature: 0,
});

const contextSchema = z.object({
    userId: z.string(),
    googleToken: z.string().optional(),
});

/**
 * Tool to save long-term memory about the user.
 * This information persists across different conversations (threads).
 */
const upsertMemoryTool = tool(
    async ({ content, key }, runtime) => {
        const userId = runtime.context?.userId;
        if (!userId) return "Error: User ID not found in context. Cannot save memory.";

        try {
            await saveMemory(userId, key.toLowerCase().replace(/\s+/g, '_'), content);
            return `Successfully remembered ${key}. I will use this in future conversations.`;
        } catch (error) {
            console.error("Error saving memory:", error);
            return `Critical: Failed to save memory. ${error instanceof Error ? error.message : String(error)}`;
        }
    },
    {
        name: "upsert_memory",
        description: "Save user preferences, personal facts, project details, or recurring tasks for future conversations. Use this whenever the user shares something they want you to remember across sessions.",
        schema: z.object({
            key: z.string().describe("A short, descriptive key (e.g. 'coding_preferences', 'dog_name')"),
            content: z.string().describe("The specific information to remember."),
        }),
    }
);

/**
 * Tool to create an event in Google Calendar.
 */
const googleCalendarCreateTool = tool(
    async ({ summary, description, start, end }, runtime) => {
        const accessToken = runtime.context?.googleToken;
        if (!accessToken) return "Error: Google OAuth token missing. The user must connect their Google Calendar first.";

        try {
            const event = await createCalendarEvent(accessToken, { summary, description, start, end });
            return `Event created successfully: ${event.summary} (${event.start?.dateTime || event.start?.date}). Link: ${event.htmlLink}`;
        } catch (error) {
            console.error("Error creating calendar event:", error);
            return `Error: Could not create calendar event. ${error instanceof Error ? error.message : String(error)}`;
        }
    },
    {
        name: "create_calendar_event",
        description: "Schedule sessions, meetings, or reminders in the user's Google Calendar. Ensure you have the date and time clarified.",
        schema: z.object({
            summary: z.string().describe("Title of the event"),
            description: z.string().optional().describe("Description or notes for the event"),
            start: z.string().describe("Start time in ISO format (e.g. '2024-05-20T10:00:00Z')"),
            end: z.string().describe("End time in ISO format"),
        }),
    }
);

/**
 * Tool to list upcoming events from Google Calendar.
 */
const googleCalendarListTool = tool(
    async ({ timeMin, timeMax, maxResults = 5 }, runtime) => {
        const accessToken = runtime.context?.googleToken;
        if (!accessToken) return "Error: Google OAuth token missing.";

        try {
            const events = await listCalendarEvents(accessToken, {
                timeMin: timeMin || new Date().toISOString(),
                timeMax,
                maxResults
            });

            if (events.length === 0) return "Your calendar is clear for this period.";

            const eventsList = events.slice(0, 5).map(e => {
                const start = e.start?.dateTime || e.start?.date;
                const end = e.end?.dateTime || e.end?.date;
                return `- ${e.summary} (${start} to ${end})`;
            }).join("\n");

            return `Here are the upcoming events (top 5):\n${eventsList}`;
        } catch (error) {
            console.error("Error listing calendar events:", error);
            return `Error: Failed to retrieve calendar events. ${error instanceof Error ? error.message : String(error)}`;
        }
    },
    {
        name: "list_calendar_events",
        description: "Fetch upcoming events from the user's Google Calendar to check availability or provide a schedule overview.",
        schema: z.object({
            timeMin: z.string().optional().describe("Start time in ISO format (default: now)"),
            timeMax: z.string().optional().describe("End time in ISO format"),
            maxResults: z.number().optional().describe("Number of events to list (default 5)"),
        }),
    }
);

/**
 * Enhanced middleware to dynamically inject long-term memories into the system prompt.
 * Uses a sliding window of recent messages for better semantic retrieval.
 */
const memoryMiddleware = dynamicSystemPromptMiddleware<z.infer<typeof contextSchema>>(
    async (state, runtime) => {
        const userId = runtime.context?.userId;
        if (!userId) return PERSONAL_PROMPT;

        // Query only on the last user message to keep retrieval focused
        const lastUserMessage = state.messages.findLast(m => m.type === "user");
        if (!lastUserMessage || typeof lastUserMessage.content !== 'string') return PERSONAL_PROMPT;

        try {
            // Reduce count to 2 highly relevant items
            const items = await searchMemory(userId, lastUserMessage.content, 2);
            if (items.length === 0) return PERSONAL_PROMPT;

            // Use a denser format to save tokens
            const memoriesContext = "\n\nKnown Facts: " +
                items.map(i => `${i.key}=${i.content}`).join(" | ");

            return PERSONAL_PROMPT + memoriesContext;
        } catch (error) {
            return PERSONAL_PROMPT;
        }
    }
);

const searchMemoryTool = tool(
    async ({ query }, runtime) => {
        const userId = runtime.context?.userId;
        if (!userId) return "Error: User ID not found.";

        try {
            // Re-use your existing searchMemory service
            const items = await searchMemory(userId, query, 3);
            if (items.length === 0) return "No personal memories found for this query.";

            return items.map(i => `${i.key}: ${i.content}`).join("\n");
        } catch (error) {
            return "Error searching long-term memory.";
        }
    },
    {
        name: "search_personal_memory",
        description: "Search for specific facts about the user (name, preferences, bio) that were saved in previous chats. Use this if the info is not already in your system prompt.",
        schema: z.object({
            query: z.string().describe("The user fact to look up, e.g., 'user name'"),
        }),
    }
);


/**
 * Middleware to automatically summarize conversation history when token limits are approached.
 */
const historyMiddleware = summarizationMiddleware({
    model: summarizationModel,
    trigger: { tokens: 5000 },
    keep: { messages: 20 },
});

const trimmer = trimMessages({
    maxTokens: 4000,
    strategy: "last",
    tokenCounter: llm,
    includeSystem: true,
});

const trimmingMiddleware = createMiddleware(async (state: any) => {
    const trimmedMessages = await trimmer.invoke(state.messages);
    return { messages: trimmedMessages };
});

// Define tools available to the agent
const tools = [
    currentTimeTool,
    new Calculator(),
    openAItools.webSearch(),
    upsertMemoryTool,
    searchMemoryTool,
    googleCalendarCreateTool,
    googleCalendarListTool,
    documentSearchTool,
];

/**
 * We use dynamicSystemPromptMiddleware to inject long-term memories into the system prompt.
 */
export const agent = createAgent({
    model: llm,
    tools,
    checkpointer,
    contextSchema,
    middleware: [
        // memoryMiddleware,
        historyMiddleware,
        trimmingMiddleware,
        modelCallLimitMiddleware({
        threadLimit: 10,
        runLimit: 5,
        exitBehavior: "end",
    }),
    ],
});

