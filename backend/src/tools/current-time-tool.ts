import * as z from "zod"
import { tool } from "langchain"

export const currentTimeTool = tool(
    (_) => new Date().toLocaleString(),
    {
        name: "get_current_time",
        description: "Returns the current time",
    }
);