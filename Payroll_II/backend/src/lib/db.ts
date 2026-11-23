import { Pool, types } from 'pg';
import { errorDetails, log } from './logger';


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
    log('error', 'Database idle connection error', errorDetails(error));
});

export async function checkDatabaseConnection(): Promise<void> {
    log('info', 'Database connecting');
    try {
        await pool.query('SELECT 1');
        log('info', 'Database connected', { database: pool.options.database, host: pool.options.host, port: pool.options.port });
    } catch (error) {
        log('error', 'Database connection failed', errorDetails(error));
        throw error;
    }
}
