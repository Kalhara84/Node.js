// Run SQL for programs, user accounts, lookup lists and user rights.
import { pool } from '../lib/db';
import { fail } from '../lib/errors';
import { rightFlags } from '../validators/administration.validator';

// List public user fields; exclude the password hash.
const publicUserColumns = 'usdsno, usdcomsno, usdusd, usduno, usdnam, usdad1, usdad2, usdad3, usdtel, usdfax, usdmail, usdnic, usddes, usdactive';

export const AdministrationModel = {
    // ---------- Account ----------

    // Active flag + administrator flag of the signed-in user
    async accountStatus(id: number) {
        const r = await pool.query(
            'SELECT usdactive, usdadmin FROM usdmast WHERE usdsno=$1', 
            [id]
        );
        return r.rows[0] ?? null;
    },

    // Check whether this account is marked as an administrator.
    async isAdministrator(id: number): Promise<boolean> {
        const r = await pool.query(
            'SELECT 1 FROM usdmast WHERE usdsno=$1 AND usdadmin=true', 
            [id]
        );
        return !!r.rowCount;
    },

    // ---------- Lookups (modules, submodules, locations) ----------

    // Read modules (32), submodules (33) and locations together.
    async lookups() {
        const [modules, submodules, locations] = await Promise.all([
            pool.query(
                'SELECT syssno, sysdes FROM a_sysmast WHERE sysrtp=32 ORDER BY sysdes'
            ),
            pool.query(
                'SELECT syssno, sysdes FROM a_sysmast WHERE sysrtp=33 ORDER BY sysdes'
            ),
            pool.query(
                'SELECT locsno, locnam FROM s_locmast ORDER BY locnam'
            )
        ]);
        return {
            modules: modules.rows,
            submodules: submodules.rows,
            locations: locations.rows
        };
    },

    // Insert a module or submodule and return its generated ID.
    async createLookup(type: number, code: string, description: string) {
        const r = await pool.query(
            'INSERT INTO a_sysmast(sysrtp, sysrno, sysdes) VALUES($1, $2, $3) RETURNING syssno',
            [type, code, description]
        );
        return r.rows[0];
    },

    // Check that a selected location exists before assigning it.
    async locationExists(id: unknown): Promise<boolean> {
        const r = await pool.query(
            'SELECT 1 FROM s_locmast WHERE locsno=$1',
             [id]
        );
        return !!r.rowCount;
    },

    // ---------- Programs ----------

    // List programs with module/submodule names in display order.
    async programs() {
        const r = await pool.query(`
            SELECT p.*, m.sysdes AS module, s.sysdes AS submodule 
            FROM prgmast p
            LEFT JOIN a_sysmast m ON m.syssno = p.prgmodsno 
            LEFT JOIN a_sysmast s ON s.syssno = p.prgsmdsno
            ORDER BY p.prgmodsno, p.prgsmdsno, p.prgorder, p.prgsno
        `);
        return r.rows;
    },

    // True when both the module and the submodule exist
    async moduleAndSubmoduleExist(module: number, submodule: number): Promise<boolean> {
        const r = await pool.query(
            'SELECT syssno FROM a_sysmast WHERE (syssno=$1 AND sysrtp=32) OR (syssno=$2 AND sysrtp=33)',
            [module, submodule]
        );
        return r.rowCount === 2;
    },

    // Insert program fields and record who created the program and when.
    async createProgram(values: unknown[], by: string) {
        const r = await pool.query(`
            INSERT INTO prgmast(prgmodsno, prgsmdsno, prgorder, prglvl, prgnam, prgdes, prgucdnew, prgentddt, prgenttime)
            VALUES($1, $2, $3, $4, $5, $6, $7, CURRENT_DATE, LOCALTIME) 
            RETURNING *
        `, [...values, by]);
        return r.rows[0];
    },

    // Update program fields and record who changed the program and when.
    async updateProgram(id: number, values: unknown[], by: string) {
        const r = await pool.query(`
            UPDATE prgmast 
            SET prgmodsno=$1, prgsmdsno=$2, prgorder=$3, prglvl=$4, prgnam=$5, prgdes=$6,
                prgucdame=$7, prgameddt=CURRENT_DATE, prgametime=LOCALTIME 
            WHERE prgsno=$8 
            RETURNING *
        `, [...values, by, id]);
        return r.rows[0] ?? null;
    },

    // Delete program and all rights assigned to it. Returns false when the program does not exist.
    async deleteProgram(id: number): Promise<boolean> {
        const c = await pool.connect();
        try {
            // Start a transaction so related changes succeed or are undone together.
            await c.query('BEGIN');
            await c.query(
                'LOCK TABLE prgmast IN SHARE ROW EXCLUSIVE MODE'
            );
            await c.query(
                'DELETE FROM usrmast WHERE usrprgsno=$1', 
                [id]
            );
            const r = await c.query(
                'DELETE FROM prgmast WHERE prgsno=$1', 
                [id]
            );
            // Save every change made in this transaction.
            await c.query('COMMIT');
            return !!r.rowCount;
        } catch (e) {
            // Undo this transaction when a SQL or validation step fails.
            await c.query('ROLLBACK');
            throw e;
        } finally {
            // Always return the connection to the pool, even after a failure.
            c.release();
        }
    },

    // ---------- Users ----------

    // List public account fields in username order.
    async users() {
        const r = await pool.query(
            `SELECT ${publicUserColumns} FROM usdmast ORDER BY usdusd`
        );
        return r.rows;
    },

    // column names come from the validator whitelist, values are always parameters
    // Insert validated user fields and audit details using SQL parameters.
    async createUser(data: Record<string, unknown>, by: string) {
        const keys = Object.keys(data);
        const r = await pool.query(`
            INSERT INTO usdmast(${keys.join(',')}, usducdnew, usdentddt, usdenttime)
            VALUES(${keys.map((_, i) => `$${i + 1}`).join(',')}, $${keys.length + 1}, CURRENT_DATE, LOCALTIME) 
            RETURNING ${publicUserColumns}
        `, [...Object.values(data), by]);
        return r.rows[0];
    },

    // Update validated account fields and return the public profile if found.
    async updateUser(id: number, data: Record<string, unknown>, by: string) {
        const keys = Object.keys(data);
        const r = await pool.query(`
            UPDATE usdmast 
            SET ${keys.map((k, i) => `${k}=$${i + 1}`).join(',')}, usducdame=$${keys.length + 1}, usdameddt=CURRENT_DATE, usdametime=LOCALTIME 
            WHERE usdsno=$${keys.length + 2} 
            RETURNING ${publicUserColumns}
        `, [...Object.values(data), by, id]);
        return r.rows[0] ?? null;
    },

    // ---------- User rights ----------

    // All programs with the rights given to one user
    async rights(userId: number) {
        const r = await pool.query(`
            SELECT p.*, m.sysdes AS module, s.sysdes AS submodule, r.usryn, r.usraddyn, r.usrameyn, r.usrdelyn
            FROM prgmast p 
            LEFT JOIN a_sysmast m ON m.syssno = p.prgmodsno 
            LEFT JOIN a_sysmast s ON s.syssno = p.prgsmdsno
            LEFT JOIN usrmast r ON r.usrprgsno = p.prgsno AND r.usrusdsno = $1 
            ORDER BY p.prgmodsno, p.prgsmdsno, p.prgorder
        `, [userId]);
        return r.rows;
    },

    // Save (or clear) the rights of one user in a single transaction
    async saveRights(userId: number, rows: Record<string, any>[], ids: number[], clear: boolean, by: string) {
        const c = await pool.connect();
        try {
            // Start a transaction so related changes succeed or are undone together.
            await c.query('BEGIN');
            await c.query('LOCK TABLE prgmast IN SHARE MODE');

            if (!(await c.query('SELECT 1 FROM usdmast WHERE usdsno=$1 FOR UPDATE', [userId])).rowCount) {
                fail('User not found');
            }

            // Verify submitted programs still exist before writing rights.
            const programs = await c.query(
                'SELECT prgsno, prglvl FROM prgmast WHERE prgsno=ANY($1::int[])', 
                [ids]
            );

            if (programs.rowCount !== ids.length) {
                fail('Program no longer exists; reload');
            }
            // Map program IDs to Single or Multi levels for permission rules.
            const levels = new Map<number, string>(programs.rows.map((p) => [p.prgsno, p.prglvl]));

            for (const row of rows) {
                // Delete this user/program permission row when Clear was requested.
                if (clear) {
                    
                    await c.query(
                        'DELETE FROM usrmast WHERE usrusdsno=$1 AND usrprgsno=$2', 
                        [userId, row.prgsno]
                    );

                    continue;
                }

                // Single level program: only "view" flag, Multi level program: only add/amend/delete flags
                const level = levels.get(Number(row.prgsno));
                const values = rightFlags.map((f, i) => (level === 'S' && i > 0) || (level === 'M' && i === 0) ? 'n' : row[f]);

                await c.query(`
                    INSERT INTO usrmast(usrusdsno, usrprgsno, usryn, usraddyn, usrameyn, usrdelyn, usrucdnew, usrentddt, usrenttime)
                    VALUES($1, $2, $3, $4, $5, $6, $7, CURRENT_DATE, LOCALTIME) 
                    ON CONFLICT(usrusdsno, usrprgsno)
                    DO UPDATE SET usryn=$3, usraddyn=$4, usrameyn=$5, usrdelyn=$6, usrucdame=$7, usrameddt=CURRENT_DATE, usrametime=LOCALTIME
                `, [userId, row.prgsno, ...values, by]);
            }

            // Save every change made in this transaction.
            await c.query('COMMIT');
        } catch (e) {
            // Undo this transaction when a SQL or validation step fails.
            await c.query('ROLLBACK');
            throw e;
        } finally {
            // Always return the connection to the pool, even after a failure.
            c.release();
        }
    },
};
