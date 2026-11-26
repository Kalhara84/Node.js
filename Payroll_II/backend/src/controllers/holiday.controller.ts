import type { NextFunction, Request, Response } from 'express';
import { pool } from '../lib/db';
import { fail } from '../lib/errors';

// Validate and parse a positive integer ID
function id(value: unknown, label: string): number {
    if (!['string', 'number'].includes(typeof value) || !/^\d+$/.test(String(value))) {
        fail(`Invalid ${label}`);
    }

    const n = Number(value);
    if (!Number.isSafeInteger(n) || n < 1 || n > 2147483647) {
        fail(`Invalid ${label}`);
    }

    return n;
}

// Validate YYYY-MM-DD holiday date
function holidayDate(value: unknown): string {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value) || value < '1900-01-01' || value > '9999-12-31') {
        fail('Choose a valid holiday date');
    }

    const parsed = new Date(`${value}T00:00:00Z`);
    if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) {
        fail('Choose a valid holiday date');
    }

    return value;
}

// Validate holiday type and overtime rate
async function details(body: Record<string, unknown>): Promise<[number, number]> {
    const type = id(body.holtypsno, 'holiday type');
    const value = body.holotrate;

    if (!['string', 'number'].includes(typeof value) || String(value).trim() === '') {
        fail('OT rate is required');
    }

    const rate = Number(value);
    if (!Number.isFinite(rate) || rate < 0 || rate > 9999.99) {
        fail('OT rate must be between 0 and 9999.99');
    }

    const lookup = await pool.query('SELECT 1 FROM a_sysmast WHERE syssno = $1 AND sysrtp = 3', [type]);
    if (!lookup.rowCount) {
        fail('Choose a valid holiday type');
    }

    return [type, rate];
}

export const HolidayController = {
    // Load available holiday types from system master
    async types(_req: Request, res: Response): Promise<void> {
        const result = await pool.query(
            'SELECT syssno, sysdes FROM a_sysmast WHERE sysrtp = 3 ORDER BY syssno DESC'
        );
        res.json(result.rows);
    },

    // List all holiday records with their type descriptions
    async list(_req: Request, res: Response): Promise<void> {
        const result = await pool.query(
            `SELECT h.*, s.sysdes
             FROM a_holmast h
             LEFT JOIN a_sysmast s ON s.syssno = h.holtypsno AND s.sysrtp = 3
             ORDER BY holddt DESC, holsno DESC`
        );
        res.json(result.rows);
    },

    // Load existing holidays within a date range for the bulk grid
    async range(req: Request, res: Response): Promise<void> {
        const from = holidayDate(req.query.from);
        const to = holidayDate(req.query.to);

        if (from > to) {
            fail('To date must be on or after From date');
        }

        const result = await pool.query(
            `SELECT h.holsno, to_char(h.holddt, 'YYYY-MM-DD') AS holddt, h.holtypsno, h.holotrate, s.sysdes
             FROM a_holmast h
             LEFT JOIN a_sysmast s ON s.syssno = h.holtypsno AND s.sysrtp = 3
             WHERE h.holddt >= $1::date AND h.holddt <= $2::date
             ORDER BY h.holddt ASC, h.holsno ASC`,
            [from, to]
        );
        res.json(result.rows);
    },

    // Bulk insert or update holidays from the date-range grid
    async bulkSave(req: Request, res: Response): Promise<void> {
        const items = Array.isArray(req.body?.items) ? req.body.items : null;
        if (!items || !items.length) {
            fail('Select at least one holiday row to save');
        }

        const parsed: Array<{ holddt: string; holtypsno: number; holotrate: number }> = [];
        for (const raw of items) {
            const item = (raw ?? {}) as Record<string, unknown>;
            const date = holidayDate(item.holddt);
            const [type, rate] = await details(item);
            parsed.push({ holddt: date, holtypsno: type, holotrate: rate });
        }

        const client = await pool.connect();
        let inserted = 0;
        let updated = 0;

        try {
            await client.query('BEGIN');

            for (const row of parsed) {
                const existing = await client.query(
                    'SELECT holsno FROM a_holmast WHERE holddt = $1 ORDER BY holsno ASC LIMIT 1',
                    [row.holddt]
                );

                if (existing.rowCount) {
                    await client.query(
                        `UPDATE a_holmast
                         SET holtypsno = $1,
                             holotrate = $2,
                             holucdame = $3,
                             holameddt = CURRENT_DATE,
                             holametime = LOCALTIME
                         WHERE holddt = $4`,
                        [row.holtypsno, row.holotrate, req.user!.usr, row.holddt]
                    );
                    updated += 1;
                } else {
                    await client.query(
                        `INSERT INTO a_holmast (holddt, holtypsno, holotrate, holucdnew, holentddt, holenttime)
                         VALUES ($1, $2, $3, $4, CURRENT_DATE, LOCALTIME)`,
                        [row.holddt, row.holtypsno, row.holotrate, req.user!.usr]
                    );
                    inserted += 1;
                }
            }

            await client.query('COMMIT');
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }

        res.json({
            inserted,
            updated,
            message: `Saved ${parsed.length} holidays (${inserted} added, ${updated} updated).`,
        });
    },

    // Create a new holiday record
    async create(req: Request, res: Response): Promise<void> {
        const body = req.body ?? {};
        const date = holidayDate(body.holddt);
        const [type, rate] = await details(body);

        // The unique date index also prevents concurrent duplicate submissions.
        const result = await pool.query(
            `INSERT INTO a_holmast (holddt, holtypsno, holotrate, holucdnew, holentddt, holenttime)
             VALUES ($1, $2, $3, $4, CURRENT_DATE, LOCALTIME)
             RETURNING *`,
            [date, type, rate, req.user!.usr]
        );
        res.status(201).json(result.rows[0]);
    },

    // Update holiday type and OT rate for an existing holiday date
    async update(req: Request, res: Response): Promise<void> {
        const record = id(req.params.id, 'holiday record');
        const body = req.body ?? {};
        const date = holidayDate(body.holddt);
        const [type, rate] = await details(body);

        // As in the PHP amendment form, the date is the key and cannot be changed.
        const result = await pool.query(
            `UPDATE a_holmast
             SET holtypsno = $1,
                 holotrate = $2,
                 holucdame = $3,
                 holameddt = CURRENT_DATE,
                 holametime = LOCALTIME
             WHERE holsno = $4 AND holddt = $5
             RETURNING *`,
            [type, rate, req.user!.usr, record, date]
        );

        if (!result.rowCount) {
            res.status(404).json({ message: 'Holiday not found for this date. Reload and try again.' });
            return;
        }

        res.status(200).json(result.rows[0]);
    },

    // Delete a holiday record
    async remove(req: Request, res: Response): Promise<void> {
        const record = id(req.params.id, 'holiday record');
        const result = await pool.query('DELETE FROM a_holmast WHERE holsno = $1 RETURNING holsno', [record]);

        if (!result.rowCount) {
            res.status(404).json({ message: 'Holiday not found' });
            return;
        }

        res.status(200).json({ message: 'Holiday deleted' });
    },

    // Map validation and duplicate date errors to HTTP responses
    handleError(error: unknown, _req: Request, res: Response, next: NextFunction): void {
        const e = error as { status?: number; code?: string; message?: string };

        if (e.status === 400) {
            res.status(400).json({ message: e.message });
            return;
        }

        if (e.code === '23505') {
            res.status(409).json({ message: 'A holiday already exists for this date.' });
            return;
        }

        next(error);
    },
};
