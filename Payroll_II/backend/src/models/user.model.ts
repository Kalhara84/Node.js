// Find a login account in PostgreSQL by username.
import { pool } from '../lib/db';
import type { UserRow } from '../types';


export const UserModel = {

    // Find the account matching the entered username.
    async findByUsername(username: string): Promise<UserRow | null> {
        
        // Pass username as $1 separately from SQL to keep input out of SQL code.
        const r = await pool.query<UserRow>(
            `SELECT usdsno, usdusd, usdpwd, usdnam, usddes, usdactive FROM usdmast WHERE usdusd = $1`, 
            [username]
        );

        // Return the first matching user, or null if no account was found.
        return r.rows[0] ?? null;
    },
    
};
