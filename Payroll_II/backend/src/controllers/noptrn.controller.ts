import type { NextFunction, Request, Response } from 'express';
import { pool } from '../lib/db';
import { fail } from '../lib/errors';

const ALLOWED_TYPES = [
    '007', '008', '009', '010', '011', '012', '013', '014', '015', '016',
    '017', '018', '019', '020', '056', '060', '062', '063', '064', '066',
    '065', '070', '110', '111', '112', '055', '115', '444', '045',
];

// Validate and parse a positive integer ID
function optionalId(value: unknown, label: string): number | null {
    if (value === undefined || value === null || String(value).trim() === '') {
        return null;
    }

    if (!['string', 'number'].includes(typeof value) || !/^\d+$/.test(String(value))) {
        fail(`Invalid ${label}`);
    }

    const n = Number(value);
    if (!Number.isSafeInteger(n) || n < 1 || n > 2147483647) {
        fail(`Invalid ${label}`);
    }

    return n;
}

// Validate transaction type code
function trnType(value: unknown): string {
    if (typeof value !== 'string' || !value.trim()) {
        fail('Transaction type is required');
    }
    return value.trim();
}

// Parse transaction amount (commas allowed, empty string treated as 0)
function parseAmount(value: unknown): number {
    if (value === undefined || value === null || String(value).trim() === '') {
        return 0;
    }

    const cleaned = String(value).replace(/,/g, '').trim();
    const num = Number(cleaned);
    if (!Number.isFinite(num) || num < 0 || num > 9999999999.99) {
        fail('Amount must be between 0 and 9999999999.99');
    }

    return num;
}

export const NoptrnController = {
    // Load dropdown options for Type, Location, Department, Section, Area and Payroll period
    async options(_req: Request, res: Response): Promise<void> {
        const [types, locations, departments, sections, areas, period] = await Promise.all([
            pool.query(
                `SELECT sysrno, sysdes
                 FROM p_sysmast
                 WHERE sysrtp = 4 AND sysrno = ANY($1::text[])
                 ORDER BY sysdes`,
                [ALLOWED_TYPES]
            ),
            pool.query(
                `SELECT DISTINCT l.locsno, l.locnam
                 FROM p_empmast e
                 LEFT JOIN s_locmast l ON e.emplocsno = l.locsno
                 WHERE l.locsno IS NOT NULL
                 ORDER BY l.locnam`
            ),
            pool.query(
                `SELECT DISTINCT d.depsno, d.depdes
                 FROM p_empmast e
                 LEFT JOIN p_depmast d ON e.empdepsno = d.depsno
                 WHERE d.depsno IS NOT NULL
                 ORDER BY d.depdes`
            ),
            pool.query(
                `SELECT syssno, sysdes
                 FROM p_sysmast
                 WHERE sysrtp = 261
                 ORDER BY sysrno`
            ),
            pool.query(
                `SELECT syssno, sysdes
                 FROM a_sysmast
                 WHERE sysrtp = 202
                 ORDER BY sysrno`
            ),
            pool.query(
                `SELECT sysdes
                 FROM p_sysmast
                 WHERE sysrtp = 7 AND sysrno = '001'
                 LIMIT 1`
            ),
        ]);

        res.json({
            types: types.rows,
            locations: locations.rows,
            departments: departments.rows,
            sections: sections.rows,
            areas: areas.rows,
            period: period.rows[0]?.sysdes ?? null,
        });
    },

    // Load active employees and their existing transaction amounts for the selected type and filters
    async display(req: Request, res: Response): Promise<void> {
        const sysrno = trnType(req.query.sysrno);
        const locsno = optionalId(req.query.locsno, 'location');
        const depsno = optionalId(req.query.depsno, 'department');
        const secsno = optionalId(req.query.secsno, 'section');
        const aresno = optionalId(req.query.aresno, 'area');

        const conditions = ["e.empactflg = 'Y'"];
        const params: unknown[] = [sysrno];

        if (locsno !== null) {
            params.push(locsno);
            conditions.push(`e.emplocsno = $${params.length}`);
        }
        if (depsno !== null) {
            params.push(depsno);
            conditions.push(`e.empdepsno = $${params.length}`);
        }
        if (secsno !== null) {
            params.push(secsno);
            conditions.push(`e.empsecsno = $${params.length}`);
        }
        if (aresno !== null) {
            params.push(aresno);
            conditions.push(`e.emparesno = $${params.length}`);
        }

        const result = await pool.query(
            `SELECT e.empsno, e.empeno, e.empnam, e.empepfno, t.trnamt
             FROM p_empmast e
             LEFT JOIN s_locmast l ON e.emplocsno = l.locsno
             LEFT JOIN p_trnmast t ON t.trnempsno = e.empsno AND t.trntyp = $1
             WHERE ${conditions.join(' AND ')}
             ORDER BY l.locsno ASC NULLS LAST,
                      NULLIF(regexp_replace(COALESCE(e.empepfno::text, ''), '[^0-9]', '', 'g'), '')::int ASC NULLS LAST,
                      e.empepfno ASC`,
            params
        );

        res.json(result.rows);
    },

    // Save direct transaction amounts for all displayed employees
    async save(req: Request, res: Response): Promise<void> {
        const body = req.body ?? {};
        const sysrno = trnType(body.sysrno);
        const rows = Array.isArray(body.rows) ? body.rows : null;

        if (!rows || !rows.length) {
            fail('No employee rows to save');
        }

        const parsed: Array<{ empsno: number; trnamt: number }> = [];
        for (const raw of rows) {
            const r = (raw ?? {}) as Record<string, unknown>;
            const empsno = optionalId(r.empsno, 'employee');
            if (empsno === null) {
                fail('Invalid employee');
            }
            const trnamt = parseAmount(r.trnamt);
            parsed.push({ empsno, trnamt });
        }

        const client = await pool.connect();
        let count = 0;

        try {
            await client.query('BEGIN');

            for (const row of parsed) {
                await client.query(
                    'DELETE FROM p_trnmast WHERE trnempsno = $1 AND trntyp = $2',
                    [row.empsno, sysrno]
                );

                if (sysrno === '444') {
                    await client.query(
                        "DELETE FROM p_trnmast WHERE trnempsno = $1 AND trntyp = '045'",
                        [row.empsno]
                    );

                    const [salRes, incRes, budRes] = await Promise.all([
                        client.query('SELECT empsal FROM p_empmast WHERE empsno = $1', [row.empsno]),
                        client.query("SELECT ptramt FROM p_ptrmast WHERE ptrtyp = '016' AND ptrempsno = $1", [row.empsno]),
                        client.query("SELECT ptramt FROM p_ptrmast WHERE ptrtyp = '002' AND ptrempsno = $1", [row.empsno]),
                    ]);

                    const empsal = Number(salRes.rows[0]?.empsal ?? 0);
                    const inc016 = Number(incRes.rows[0]?.ptramt ?? 0);
                    const bud002 = Number(budRes.rows[0]?.ptramt ?? 0);
                    const salsal = empsal + inc016 + bud002;
                    const trnamtg = ((salsal / 25) / 8) * row.trnamt;

                    await client.query(
                        `INSERT INTO p_trnmast (trnempsno, trntyp, trnamt, trnucdnew, trnentddt, trnenttime)
                         VALUES ($1, '045', $2, $3, CURRENT_DATE, LOCALTIME)`,
                        [row.empsno, trnamtg, req.user!.usr]
                    );
                    count += 1;
                }

                await client.query(
                    `INSERT INTO p_trnmast (trnempsno, trntyp, trnamt, trnucdnew, trnentddt, trnenttime)
                     VALUES ($1, $2, $3, $4, CURRENT_DATE, LOCALTIME)`,
                    [row.empsno, sysrno, row.trnamt, req.user!.usr]
                );
                count += 1;
            }

            await client.query('COMMIT');
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }

        res.status(200).json({ count, message: `${count} Records Inserted` });
    },

    // Map validation errors to HTTP 400
    handleError(error: unknown, _req: Request, res: Response, next: NextFunction): void {
        const e = error as { status?: number; message?: string };
        if (e.status === 400) {
            res.status(400).json({ message: e.message });
            return;
        }
        next(error);
    },
};

