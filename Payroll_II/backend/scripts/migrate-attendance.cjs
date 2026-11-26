// Run from backend: node --env-file=.env scripts/migrate-attendance.cjs
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const { Pool } = require('pg');
const pool = new Pool({ host: process.env.DB_HOST, port: Number(process.env.DB_PORT || 5432),
    user: process.env.DB_USER, password: process.env.DB_PASSWORD, database: process.env.DB_NAME,
    connectionTimeoutMillis: 10000 });
(async () => {
    const client = await pool.connect();
    try {
        await client.query(readFileSync(resolve(__dirname, '../../db/migrations/001_attendance.sql'), 'utf8'));
        console.log('Attendance schema and program registration ready.');
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally { client.release(); }
})().catch(error => { console.error(error.message); process.exitCode = 1; }).finally(() => pool.end());
