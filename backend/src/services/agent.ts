import { MemorySaver } from "@langchain/langgraph";
import { ChatOpenAI } from "@langchain/openai";
import { createAgent } from "langchain";
import { PERSONAL_PROMPT } from "../prompts/personal";
import { calculateTool } from "../tools/calculate-tool";
import { currentTimeTool } from "../tools/current-time-tool";

const llm = new ChatOpenAI({
    modelName: "gpt-4o",
    temperature: 0.7,
});

// Define tools
const tools = [currentTimeTool, calculateTool];

// Create checkpointer for memory persistence
// In-memory version for now; can be upgraded to PostgresSaver
const checkpointer = new MemorySaver();

// Create ReAct agent using the unified createAgent
export const agent = createAgent({
    model: llm,
    tools,
    checkpointer: checkpointer,
    systemPrompt: PERSONAL_PROMPT,
});
