import { PostgresSaver } from "@langchain/langgraph-checkpoint-postgres";
import dotenv from "dotenv";
import { Pool } from "pg";

dotenv.config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

export const checkpointer = new PostgresSaver(pool);
export { pool };

