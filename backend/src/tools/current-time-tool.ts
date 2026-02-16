import { tool } from "@langchain/core/tools";

export const currentTimeTool = tool(
    (_) => {
        const now = new Date().toLocaleString();
        console.log("get_current_time called, returning:", now);
        return now;
    },
    {
        name: "get_current_time",
        description: "Returns the current time",
    }
);