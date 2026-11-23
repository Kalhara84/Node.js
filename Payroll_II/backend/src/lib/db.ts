import { Pool, types } from 'pg';


// return DATE columns as plain 'YYYY-MM-DD' text (no timezone shifting)
types.setTypeParser(1082, (v: string) => {
    return v;
});

export const pool = new Pool({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '5432', 10),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    connectionTimeoutMillis: 10000,
});

pool.on('error', (error) => {
    console.error(`  ✗ Database connection error: ${error.message.replace(/[\x00-\x1f\x7f-\x9f]/g, ' ')}`);
});

export async function checkDatabaseConnection(): Promise<void> {
    await pool.query('SELECT 1');
}
