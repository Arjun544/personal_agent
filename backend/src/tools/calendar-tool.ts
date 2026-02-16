import { z } from "zod"
import { tool } from "@langchain/core/tools"
import {
    GoogleCalendarCreateTool,
    GoogleCalendarViewTool,
} from "@langchain/community/tools/google_calendar";

export const scheduleMeetingTool = tool(
    async (input) => {
        const accessToken = await getGoogleAccessToken()

        if (!accessToken) {
            return "User has not connected Google Calendar."
        }

        const event = await createCalendarEvent(accessToken, input)

        return `Meeting scheduled successfully. Event ID: ${event.id}`
    },
    {
        name: "schedule_meeting",
        description: "Schedule a meeting on Google Calendar",
        schema: z.object({

            summary: z.string(),
            description: z.string().optional(),
            start: z.string().describe("ISO datetime format"),
            end: z.string().describe("ISO datetime format"),
        }),
    }
)