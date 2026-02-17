import { google } from "googleapis"

export async function createCalendarEvent(
    accessToken: string,
    eventDetails: {
        summary: string
        description?: string
        start: string
        end: string
    }
) {
    const oauth2Client = new google.auth.OAuth2()
    oauth2Client.setCredentials({ access_token: accessToken })

    const calendar = google.calendar({
        version: "v3",
        auth: oauth2Client,
    })

    const event = await calendar.events.insert({
        calendarId: "primary",
        requestBody: {
            summary: eventDetails.summary,
            description: eventDetails.description,
            start: {
                dateTime: eventDetails.start,
                timeZone: "Asia/Karachi",
            },
            end: {
                dateTime: eventDetails.end,
                timeZone: "Asia/Karachi",
            },
        },
    })

    return event.data
}

export async function listCalendarEvents(
    accessToken: string,
    params: {
        timeMin?: string
        timeMax?: string
        maxResults?: number
    } = {}
) {
    const oauth2Client = new google.auth.OAuth2()
    oauth2Client.setCredentials({ access_token: accessToken })

    const calendar = google.calendar({
        version: "v3",
        auth: oauth2Client,
    })

    const response = await calendar.events.list({
        calendarId: "primary",
        timeMin: params.timeMin || new Date().toISOString(),
        timeMax: params.timeMax,
        maxResults: params.maxResults || 10,
        singleEvents: true,
        orderBy: "startTime",
    })

    return response.data.items || []
}