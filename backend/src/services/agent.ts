import { tool } from "@langchain/core/tools";
import { ChatOpenAI } from "@langchain/openai";
import { createAgent, dynamicSystemPromptMiddleware } from "langchain";
import { z } from "zod";
import { createCalendarEvent, listCalendarEvents } from "../config/googleCalendar";
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
    googleToken: z.string().optional(),
});

/**
 * Tool to save long-term memory about the user.
 * This information persists across different conversations (threads).
 */
const upsertMemoryTool = tool(
    async ({ content, key }, runtime) => {
        const userId = runtime.context?.userId;
        if (!userId) return "Error: User ID not found in context.";

        // @ts-ignore
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

/**
 * Tool to create an event in Google Calendar.
 */
const googleCalendarCreateTool = tool(
    async ({ summary, description, start, end }, runtime) => {
        console.log("googleCalendarCreateTool called with:", { summary, description, start, end });
        const accessToken = runtime.context?.googleToken;
        console.log("Access Token exists:", !!accessToken);
        if (!accessToken) return "Error: Google OAuth token not found. Please connect your Google Calendar.";
        try {
            const event = await createCalendarEvent(accessToken, { summary, description, start, end });
            console.log("Event created successfully:", event.htmlLink);
            return `Successfully created event: ${event.htmlLink}`;
        } catch (error) {
            console.error("Error creating calendar event:", error);
            return `Error creating event: ${error instanceof Error ? error.message : String(error)}`;
        }
    },
    {
        name: "create_calendar_event",
        description: "Create a new event in Google Calendar.",
        schema: z.object({
            summary: z.string().describe("The title of the event"),
            description: z.string().optional().describe("The description of the event"),
            start: z.string().describe("The start time in ISO format (e.g. 2024-05-20T10:00:00Z)"),
            end: z.string().describe("The end time in ISO format"),
        }),
    }
);

/**
 * Tool to list upcoming events from Google Calendar.
 */
const googleCalendarListTool = tool(
    async ({ timeMin, timeMax, maxResults }, runtime) => {
        console.log("googleCalendarListTool called with:", { timeMin, timeMax, maxResults });
        const accessToken = runtime.context?.googleToken;
        console.log("Access Token exists:", !!accessToken);
        if (!accessToken) return "Error: Google OAuth token not found. Please connect your Google Calendar.";
        try {
            const events = await listCalendarEvents(accessToken, { timeMin, timeMax, maxResults });
            console.log(`Found ${events.length} events.`);
            if (events.length === 0) return "No events found for the requested period.";

            const eventsList = events.map(e => {
                const start = e.start?.dateTime || e.start?.date;
                const end = e.end?.dateTime || e.end?.date;
                return `- ${e.summary}: ${start} to ${end}`;
            }).join("\n");

            return `Upcoming events:\n${eventsList}`;
        } catch (error) {
            console.error("Error listing calendar events:", error);
            return `Error listing events: ${error instanceof Error ? error.message : String(error)}`;
        }
    },
    {
        name: "list_calendar_events",
        description: "List upcoming events from Google Calendar.",
        schema: z.object({
            timeMin: z.string().optional().describe("ISO format start time (e.g. 2024-05-20T00:00:00Z), defaults to now"),
            timeMax: z.string().optional().describe("ISO format end time"),
            maxResults: z.number().optional().describe("Max number of events to return (default 10)"),
        }),
    }
);

// Define tools available to the agent
const tools = [
    currentTimeTool,
    calculateTool,
    upsertMemoryTool,
    googleCalendarCreateTool,
    googleCalendarListTool,
];

/**
 * Middleware to dynamically inject long-term memories into the system prompt.
 */
const memoryMiddleware = dynamicSystemPromptMiddleware<z.infer<typeof contextSchema>>(
    async (state, runtime) => {
        console.log("Memory middleware called with context:", runtime.context);
        const userId = runtime.context?.userId;
        // @ts-ignore
        const memoryStore = runtime.store || store;

        if (!userId || !memoryStore) return PERSONAL_PROMPT;

        try {
            // Search the store using the namespace
            const items = await memoryStore.search(["memories", userId]);
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
