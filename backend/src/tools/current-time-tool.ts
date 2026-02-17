import { tool } from "@langchain/core/tools";

export const currentTimeTool = tool(
    (_) => {
        const now = new Date().toLocaleString();
        return now;
    },
    {
        name: "get_current_time",
        description: "Returns the current time",
    }
);