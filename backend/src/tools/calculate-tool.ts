import { tool } from "@langchain/core/tools";
import { evaluate } from "mathjs";
import { z } from "zod";

export const calculateTool = tool(
    async ({ expression }) => {
        try {
            const result = evaluate(expression);
            return String(result);
        } catch (error) {
            return `Error evaluating expression: ${error instanceof Error ? error.message : String(error)}`;
        }
    },
    {
        name: "calculate",
        description: "Safely evaluate a mathematical expression. Supports basic arithmetic, functions, and constants.",
        schema: z.object({
            expression: z.string().describe("The mathematical expression to evaluate, e.g., '(2 + 3) * 4'"),
        }),
    }
);
