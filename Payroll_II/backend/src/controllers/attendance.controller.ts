import type { NextFunction, Request, Response } from 'express';
import { pool } from '../lib/db';
import { fail } from '../lib/errors';

function number(value: unknown, label: string, max = 2147483647, min = 0, integer = true): number {
    if (!['string', 'number'].includes(typeof value) || String(value).trim() === '') fail(`${label} is required`);
    const n = Number(value);
    if (!Number.isFinite(n) || n < min || n > max || (integer && !Number.isInteger(n))) fail(`Invalid ${label}`);
    return n;
}

function date(value: unknown): string {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value) || value < '1900-01-01' || value > '9999-12-31') fail('Invalid attendance date');
    const parsed = new Date(`${value}T00:00:00Z`);
    if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) fail('Invalid attendance date');
    return value;
}

const fields = ['denddt', 'dlyactinhh', 'dlyactinmm', 'dlyactouthh', 'dlyactoutmm', 'denot1', 'denot2', 'denlatemin', 'dennoot', 'nolatflg'];
function values(body: Record<string, unknown>): unknown[] {
    const times = ['dlyactinhh', 'dlyactinmm', 'dlyactouthh', 'dlyactoutmm'].map((key, i) => number(body[key], key, i % 2 ? 59 : 23));
    if (times[0] * 60 + times[1] >= times[2] * 60 + times[3]) fail('Out time must be later than in time');
    const flags = ['dennoot', 'nolatflg'].map(key => {
        if (!['', 'Y', 'N', 'y', 'n'].includes(String(body[key]))) fail(`Invalid ${key}`);
        return String(body[key]);
    });
    return [date(body.denddt), ...times, number(body.denot1, 'OT1', 999999, 0, false), number(body.denot2, 'OT2', 999999, 0, false), number(body.denlatemin, 'Late minutes'), ...flags];
}

export const AttendanceController = {
    async employees(_req: Request, res: Response): Promise<void> {
        const result = await pool.query(`SELECT empsno, empmapcode, empepfno, empnam, locnam
            FROM p_empmast LEFT JOIN s_locmast ON emplocsno=locsno
            WHERE empactflg='Y' ORDER BY locnam, empepfno, empsno`);
        res.json(result.rows);
    },

    async list(req: Request, res: Response): Promise<void> {
        const employee = number(req.query.employee, 'Employee', 2147483647, 1);
        const year = number(req.query.year, 'Year', 9998, 1900);
        const month = number(req.query.month, 'Month', 12, 1);
        const start = `${year}-${String(month).padStart(2, '0')}-01`;
        // Match the original inquiry by mapping code, including legacy rows whose employee ID is zero.
        const result = await pool.query(`SELECT d.* FROM a_denmast d
            WHERE denempmapcode=(SELECT empmapcode::text FROM p_empmast WHERE empsno=$1)
            AND denddt >= $2::date AND denddt < ($2::date + INTERVAL '1 month')
            ORDER BY denddt, densno`, [employee, start]);
        res.json(result.rows);
    },

    async create(req: Request, res: Response): Promise<void> {
        const data = values(req.body ?? {});
        const employee = number(req.body?.employee, 'Employee', 2147483647, 1);
        const result = await pool.query(`INSERT INTO a_denmast (${fields.join(',')}, denempsno, denempmapcode,
            denlocsno, denaresno, dendepsno, denotdepsno, denucdnew, denentddt, denenttime)
            SELECT ${data.map((_, i) => `$${i + 1}`).join(',')}, empsno, empmapcode::text,
                COALESCE(emplocsno,0), COALESCE(emparesno,0), COALESCE(empdepsno,0), COALESCE(empdepsno,0),
                $11, CURRENT_DATE, to_char(LOCALTIME,'HH24:MI:SS')
            FROM p_empmast WHERE empsno=$12 AND empactflg='Y' AND empmapcode IS NOT NULL AND empmapcode<>0
            RETURNING *`, [...data, req.user!.usr, employee]);
        if (!result.rowCount) fail('Choose an active employee with a mapping code');
        res.status(201).json(result.rows[0]);
    },

    async update(req: Request, res: Response): Promise<void> {
        const id = number(req.params.id, 'Record', 2147483647, 1);
        const data = values(req.body ?? {});
        // Keep the original entry audit and record amendments separately.
        const result = await pool.query(`UPDATE a_denmast SET ${fields.map((key, i) => `${key}=$${i + 1}`).join(',')},
            denucdame=$11, denameddt=CURRENT_DATE, denametime=LOCALTIME WHERE densno=$12 RETURNING *`, [...data, req.user!.usr, id]);
        res.status(result.rowCount ? 200 : 404).json(result.rows[0] ?? { message: 'Attendance record not found' });
    },

    async remove(req: Request, res: Response): Promise<void> {
        const id = number(req.params.id, 'Record', 2147483647, 1);
        const result = await pool.query('DELETE FROM a_denmast WHERE densno=$1 RETURNING densno', [id]);
        res.status(result.rowCount ? 200 : 404).json({ message: result.rowCount ? 'Attendance record deleted' : 'Attendance record not found' });
    },

    handleError(error: unknown, _req: Request, res: Response, next: NextFunction): void {
        const e = error as { status?: number; message?: string; code?: string };
        if (e.status === 400) { 
            res.status(400).json({ message: e.message }); 
            return; 
        }
        if (e.code === '23505') { 
            res.status(409).json(
                { message: 'Attendance record already exists' }
            ); 
            return;
         }
        next(error);
    }
};
