import { tool } from "@langchain/core/tools";

export const currentTimeTool = tool(
    (_) => new Date().toLocaleString(),
    {
        name: "get_current_time",
        description: "Returns the current time",
    }
);