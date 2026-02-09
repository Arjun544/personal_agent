import { PostgresSaver } from "@langchain/langgraph-checkpoint-postgres";
import { PostgresStore } from "@langchain/langgraph-checkpoint-postgres/store";
import dotenv from "dotenv";
import { Pool } from "pg";

dotenv.config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

export const checkpointer = new PostgresSaver(pool);
export const store = new PostgresStore({
    connectionOptions: process.env.DATABASE_URL!,
});
export { pool };


