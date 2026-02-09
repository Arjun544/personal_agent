import dotenv from "dotenv";
import { Pool } from "pg";

dotenv.config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

async function check() {
    try {
        const res = await pool.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
            AND table_name LIKE 'checkpoint%';
        `);
        console.log("Checkpointer tables found:", res.rows.map(r => r.table_name));

        if (res.rows.length > 0) {
            const count = await pool.query("SELECT count(*) FROM checkpoints");
            console.log("Number of checkpoints:", count.rows[0].count);
        }
    } catch (err) {
        console.error("Error checking tables:", err);
    } finally {
        await pool.end();
    }
}

check();
