import { pool } from '../lib/db';
import type { UserRow } from '../types';

export const UserModel = {
  async findByUsername(username: string): Promise<UserRow | null> {
    
    const r = await pool.query<UserRow>(
      `SELECT usdsno, usdusd, usdpwd, usdnam, usddes, usdactive FROM usdmast WHERE usdusd = $1`,
      [username],
    );
    
    return r.rows[0] ?? null;
  },
};
