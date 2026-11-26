import type { NextFunction, Request, Response } from 'express';
import { pool } from '../lib/db';
import { fail } from '../lib/errors';

function id(value: unknown, label: string): number {
    if (!['string', 'number'].includes(typeof value) || !/^\d+$/.test(String(value))) fail(`Invalid ${label}`);
    const n = Number(value);
    if (!Number.isSafeInteger(n) || n < 1 || n > 2147483647) fail(`Invalid ${label}`);
    return n;
}

function holidayDate(value: unknown): string {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value) || value < '1900-01-01' || value > '9999-12-31') fail('Choose a valid holiday date');
    const parsed = new Date(`${value}T00:00:00Z`);
    if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) fail('Choose a valid holiday date');
    return value;
}

async function details(body: Record<string, unknown>): Promise<[number, number]> {
    const type = id(body.holtypsno, 'holiday type');
    const value = body.holotrate;
    if (!['string', 'number'].includes(typeof value) || String(value).trim() === '') fail('OT rate is required');
    const rate = Number(value);
    if (!Number.isFinite(rate) || rate < 0 || rate > 9999.99) fail('OT rate must be between 0 and 9999.99');
    const lookup = await pool.query('SELECT 1 FROM a_sysmast WHERE syssno=$1 AND sysrtp=3', [type]);
    if (!lookup.rowCount) fail('Choose a valid holiday type');
    return [type, rate];
}

export const HolidayController = {
    async types(_req: Request, res: Response): Promise<void> {
        res.json((await pool.query('SELECT syssno, sysdes FROM a_sysmast WHERE sysrtp=3 ORDER BY syssno DESC')).rows);
    },

    async list(_req: Request, res: Response): Promise<void> {
        res.json((await pool.query(`SELECT h.*, s.sysdes FROM a_holmast h
            LEFT JOIN a_sysmast s ON s.syssno=h.holtypsno AND s.sysrtp=3 ORDER BY holddt DESC, holsno DESC`)).rows);
    },

    async create(req: Request, res: Response): Promise<void> {
        const body = req.body ?? {};
        const date = holidayDate(body.holddt);
        const [type, rate] = await details(body);
        // The unique date index also prevents concurrent duplicate submissions.
        const result = await pool.query(`INSERT INTO a_holmast
            (holddt,holtypsno,holotrate,holucdnew,holentddt,holenttime)
            VALUES($1,$2,$3,$4,CURRENT_DATE,LOCALTIME) RETURNING *`, [date, type, rate, req.user!.usr]);
        res.status(201).json(result.rows[0]);
    },

    async update(req: Request, res: Response): Promise<void> {
        const record = id(req.params.id, 'holiday record');
        const body = req.body ?? {};
        const date = holidayDate(body.holddt);
        const [type, rate] = await details(body);
        // As in the PHP amendment form, the date is the key and cannot be changed.
        const result = await pool.query(`UPDATE a_holmast SET holtypsno=$1,holotrate=$2,
            holucdame=$3,holameddt=CURRENT_DATE,holametime=LOCALTIME
            WHERE holsno=$4 AND holddt=$5 RETURNING *`, [type, rate, req.user!.usr, record, date]);
        res.status(result.rowCount ? 200 : 404).json(result.rows[0] ?? { message: 'Holiday not found for this date. Reload and try again.' });
    },

    async remove(req: Request, res: Response): Promise<void> {
        const record = id(req.params.id, 'holiday record');
        const result = await pool.query('DELETE FROM a_holmast WHERE holsno=$1 RETURNING holsno', [record]);
        res.status(result.rowCount ? 200 : 404).json({ message: result.rowCount ? 'Holiday deleted' : 'Holiday not found' });
    },

    handleError(error: unknown, _req: Request, res: Response, next: NextFunction): void {
        const e = error as { status?: number; code?: string; message?: string };
        if (e.status === 400) { res.status(400).json({ message: e.message }); return; }
        if (e.code === '23505') { res.status(409).json({ message: 'A holiday already exists for this date.' }); return; }
        next(error);
    }
};
