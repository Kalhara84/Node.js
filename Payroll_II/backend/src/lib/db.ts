// Set up shared PostgreSQL connections for the backend models.
import { Pool, types } from 'pg';


// return DATE columns as plain 'YYYY-MM-DD' text (no timezone shifting)
types.setTypeParser(1082, (v: string) => {
    return v;
});

// Create shared PostgreSQL connections using settings from backend/.env.
export const pool = new Pool({
    
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '5432', 10),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,

});
