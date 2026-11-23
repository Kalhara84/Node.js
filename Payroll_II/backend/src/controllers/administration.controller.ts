import type { NextFunction, Request, Response } from 'express';
import { hashPassword } from '../lib/auth';
import { pool } from '../lib/db';
import { fail } from '../lib/errors';

// Administration input checks live here with the request handlers.
const rightFlags = ['usryn', 'usraddyn', 'usrameyn', 'usrdelyn'] as const;

// Field max lengths for user table validation
const userFields: Record<string, number> = {
    usdusd: 8,
    usdnam: 50,
    usdad1: 50,
    usdad2: 50,
    usdad3: 50,
    usdtel: 25,
    usdfax: 25,
    usdmail: 25,
    usdnic: 10,
    usddes: 25
};

// Integer validation helper
function integer(v: unknown, label: string, min = 1): number {
    if ((typeof v !== 'string' && typeof v !== 'number') || String(v).trim() === '') {
        fail(`${label} is required`);
    }
    const n = Number(v);
    if (!Number.isSafeInteger(n) || n < min || n > 2147483647) {
        fail(`${label} is invalid`);
    }
    return n;
}

// String validation helper
function string(v: unknown, label: string, max: number, required = false): string {
    if (v != null && typeof v !== 'string') {
        fail(`${label} must be text`);
    }
    const s = String(v ?? '').trim();
    if ((required && !s) || s.length > max) {
        fail(`${label} is required and must be at most ${max} characters`);
    }
    return s;
}

// Validate user profile input (password is returned as plain text; the controller hashes it)
function validateUser(body: Record<string, unknown>, create: boolean) {
    const data: Record<string, unknown> = {};

    for (const [key, max] of Object.entries(userFields)) {
        if (key === 'usdusd' && !create) continue;
        data[key] = string(body[key], key, max, key === 'usdusd');
    }

    data.usduno = body.usduno === '' || body.usduno == null ? null : integer(body.usduno, 'User number', 0);
    data.usdcomsno = body.usdcomsno === '' || body.usdcomsno == null ? 0 : integer(body.usdcomsno, 'Location');

    if (!['Y', 'N'].includes(String(body.usdactive ?? 'Y'))) {
        fail('Invalid active status');
    }
    data.usdactive = body.usdactive ?? 'Y';

    let password: string | null = null;
    if (create || body.usdpwd) {
        if (typeof body.usdpwd !== 'string' || !body.usdpwd.length || body.usdpwd.length > 256) {
            fail('Password is required (maximum 256 characters)');
        }
        password = body.usdpwd;
    }

    return { data, password };
}

// Validate the rights list sent from the user rights screen
function validateRights(body: Record<string, unknown>) {
    const rows = body.rows;

    if (!Array.isArray(rows) || rows.length > 10000) {
        fail('Invalid rights list');
    }

    const ids = rows.map((r) => integer(r?.prgsno, 'Program'));
    if (new Set(ids).size !== ids.length) {
        fail('Duplicate programs');
    }

    for (const row of rows) {
        for (const flag of rightFlags) {
            if (!['y', 'n'].includes(row[flag])) {
                fail('Rights must be y or n');
            }
        }
    }

    return { rows, ids, clear: body.clear === true };
}

// Request body as a plain object (empty object when missing)
const bodyOf = (req: Request): Record<string, unknown> => req.body ?? {};

// Check Program Master inputs here and keep SQL values in column order.
function programValues(body: Record<string, unknown>): { module: number; submodule: number; values: unknown[] } {
    const module = integer(body.prgmodsno, 'Module');
    const submodule = integer(body.prgsmdsno, 'Submodule');
    if (!['S', 'M'].includes(String(body.prglvl))) {
        fail('Choose Single or Multi level');
    }
    return {
        module,
        submodule,
        values: [
            module,
            submodule,
            string(body.prgorder, 'Order', 5, true),
            body.prglvl,
            string(body.prgnam, 'Name', 35, true),
            string(body.prgdes, 'Description', 60, true)
        ]
    };
}

// Confirm both selected IDs exist in the correct module/submodule categories.
async function checkProgramScope(module: number, submodule: number): Promise<void> {
    const result = await pool.query(
        'SELECT syssno FROM a_sysmast WHERE (syssno=$1 AND sysrtp=32) OR (syssno=$2 AND sysrtp=33)',
        [module, submodule]
    );
    if (result.rowCount !== 2) {
        fail('Choose a valid module and submodule');
    }
}

export const AdministrationController = {
    // Route-specific error handler (validation errors and unique constraint violations)
    handleError(err: unknown, _req: Request, res: Response, next: NextFunction): void {
        const e = err as { status?: number; code?: string; message?: string };
        if (e.status === 400) {
            res.status(400).json({ message: e.message });
            return;
        }
        if (e.code === '23505') {
            res.status(409).json({ message: 'This code or module/submodule/order already exists' });
            return;
        }
        next(err);
    },

    // ---------- Lookups ----------

    // Get administration lookup masters (modules, submodules, locations)
    async lookups(_req: Request, res: Response): Promise<void> {
        // Load dropdowns together; User Master also uses this existing endpoint.
        const [modules, submodules, locations] = await Promise.all([
            pool.query('SELECT syssno, sysdes FROM a_sysmast WHERE sysrtp=32 ORDER BY sysdes'),
            pool.query('SELECT syssno, sysdes FROM a_sysmast WHERE sysrtp=33 ORDER BY sysdes'),
            pool.query('SELECT locsno, locnam FROM s_locmast ORDER BY locnam')
        ]);
        res.json({ modules: modules.rows, submodules: submodules.rows, locations: locations.rows });
    },

    // Add new lookup record (module or submodule)
    async addLookup(req: Request, res: Response): Promise<void> {
        const body = bodyOf(req);
        const type = integer(body.sysrtp, 'Type');
        if (![32, 33].includes(type)) {
            fail('Only modules and submodules can be added here');
        }
        const code = string(body.sysrno, 'Code', 10, true);
        const description = string(body.sysdes, 'Description', 40, true);

        // Insert only validated values and return the new lookup ID.
        const result = await pool.query(
            'INSERT INTO a_sysmast(sysrtp, sysrno, sysdes) VALUES($1, $2, $3) RETURNING syssno',
            [type, code, description]
        );
        res.status(201).json(result.rows[0]);
    },

    // ---------- Programs ----------

    // List all programs
    async programs(_req: Request, res: Response): Promise<void> {
        // Join readable names to the program rows and keep their display order.
        const result = await pool.query(`
            SELECT p.*, m.sysdes AS module, s.sysdes AS submodule
            FROM prgmast p
            LEFT JOIN a_sysmast m ON m.syssno = p.prgmodsno
            LEFT JOIN a_sysmast s ON s.syssno = p.prgsmdsno
            ORDER BY p.prgmodsno, p.prgsmdsno, p.prgorder, p.prgsno
        `);
        res.json(result.rows);
    },

    // Create a new program
    async createProgram(req: Request, res: Response): Promise<void> {
        const { module, submodule, values } = programValues(bodyOf(req));
        await checkProgramScope(module, submodule);

        // Save the program and record the signed-in user and creation time.
        const result = await pool.query(`
            INSERT INTO prgmast(prgmodsno, prgsmdsno, prgorder, prglvl, prgnam, prgdes, prgucdnew, prgentddt, prgenttime)
            VALUES($1, $2, $3, $4, $5, $6, $7, CURRENT_DATE, LOCALTIME)
            RETURNING *
        `, [...values, req.user!.usr]);
        res.status(201).json(result.rows[0]);
    },

    // Update existing program
    async updateProgram(req: Request, res: Response): Promise<void> {
        const id = integer(req.params.id, 'Program');
        const { module, submodule, values } = programValues(bodyOf(req));
        await checkProgramScope(module, submodule);

        // Update this ID only and record who made the change.
        const result = await pool.query(`
            UPDATE prgmast
            SET prgmodsno=$1, prgsmdsno=$2, prgorder=$3, prglvl=$4, prgnam=$5, prgdes=$6,
                prgucdame=$7, prgameddt=CURRENT_DATE, prgametime=LOCALTIME
            WHERE prgsno=$8
            RETURNING *
        `, [...values, req.user!.usr, id]);
        const program = result.rows[0] ?? null;
        res.status(program ? 200 : 404).json(program ?? { message: 'Program not found' });
    },

    // Delete program and all assigned user rights
    async deleteProgram(req: Request, res: Response): Promise<void> {
        const id = integer(req.params.id, 'Program');
        const client = await pool.connect();
        let deleted: boolean;
        try {
            // Delete assigned rights and the program together, under the same lock.
            await client.query('BEGIN');
            await client.query('LOCK TABLE prgmast IN SHARE ROW EXCLUSIVE MODE');
            await client.query('DELETE FROM usrmast WHERE usrprgsno=$1', [id]);
            const result = await client.query('DELETE FROM prgmast WHERE prgsno=$1', [id]);
            await client.query('COMMIT');
            deleted = !!result.rowCount;
        } catch (error) {
            // Undo both deletions if either operation fails.
            await client.query('ROLLBACK');
            throw error;
        } finally {
            // Return the connection even when a query fails.
            client.release();
        }
        res.status(deleted ? 200 : 404).json({ message: deleted ? 'Program deleted' : 'Program not found' });
    },

    // ---------- Users ----------

    // List application users
    async users(_req: Request, res: Response): Promise<void> {
        res.json(await AdministrationModel.users());
    },

    // Create new user account
    async createUser(req: Request, res: Response): Promise<void> {
        const { data, password } = validateUser(bodyOf(req), true);
        if (data.usdcomsno && !(await AdministrationModel.locationExists(data.usdcomsno))) {
            fail('Invalid location');
        }
        if (password) data.usdpwd = hashPassword(password);

        res.status(201).json(await AdministrationModel.createUser(data, req.user!.usr));
    },

    // Update user account details
    async updateUser(req: Request, res: Response): Promise<void> {
        const id = integer(req.params.id, 'User');

        // Only an administrator may change an administrator account (stops password takeover)
        if (!res.locals.access?.admin && (await AdministrationModel.isAdministrator(id))) {
            res.status(403).json({ message: 'Only an administrator can change an administrator account' });
            return;
        }

        const { data, password } = validateUser(bodyOf(req), false);
        if (data.usdcomsno && !(await AdministrationModel.locationExists(data.usdcomsno))) {
            fail('Invalid location');
        }
        if (password) data.usdpwd = hashPassword(password);

        if (data.usdactive === 'N' && (await AdministrationModel.isAdministrator(id))) {
            fail('Administrator accounts cannot be disabled here');
        }

        const user = await AdministrationModel.updateUser(id, data, req.user!.usr);
        res.status(user ? 200 : 404).json(user ?? { message: 'User not found' });
    },

    // ---------- User rights ----------

    // Get program rights assigned to a specific user
    async rights(req: Request, res: Response): Promise<void> {
        const id = integer(req.params.id, 'User');
        res.json(await AdministrationModel.rights(id));
    },

    // Update program rights for a user
    async saveRights(req: Request, res: Response): Promise<void> {
        const id = integer(req.params.id, 'User');
        const { rows, ids, clear } = validateRights(bodyOf(req));

        await AdministrationModel.saveRights(id, rows, ids, clear, req.user!.usr);
        res.json({ message: `${rows.length} program rights updated` });
    },
};
