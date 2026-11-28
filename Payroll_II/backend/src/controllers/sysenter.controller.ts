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

// Validate Record Type (sysrtp: integer 1..999999)
function recordType(value: unknown): number {
    const raw = String(value ?? '').trim();
    if (!raw || !/^\d+$/.test(raw)) {
        fail('Record Type must be a number between 1 and 999999');
    }

    const n = Number(raw);
    if (!Number.isSafeInteger(n) || n < 1 || n > 999999) {
        fail('Record Type must be a number between 1 and 999999');
    }

    return n;
}

// Validate Record No (sysrno: uppercase, max 10 chars)
function recordNo(value: unknown): string {
    if (typeof value !== 'string') {
        fail('Record No is required');
    }

    const code = value.trim().toUpperCase();
    if (!code) {
        fail('Record No is required');
    }
    if (code.length > 10) {
        fail('Record No must be 10 characters or fewer');
    }

    return code;
}

// Validate required or optional text field with max length
function textField(value: unknown, label: string, maxLen: number, required: boolean): string {
    const text = typeof value === 'string' ? value.trim() : String(value ?? '').trim();
    if (required && !text) {
        fail(`${label} is required`);
    }
    if (text.length > maxLen) {
        fail(`${label} must be ${maxLen} characters or fewer`);
    }
    return text;
}

const SELECT_COLUMNS = `
    syssno, sysrtp, sysrno, sysdes, sysdes1, sysdes2, syscomsno,
    sysucdnew, to_char(sysentddt, 'YYYY-MM-DD') AS sysentddt, sysenttime,
    sysucdame, to_char(sysameddt, 'YYYY-MM-DD') AS sysameddt, sysametime
`;

export const SysenterController = {
    // List all system master records ordered by sysrtp, sysrno
    async list(_req: Request, res: Response): Promise<void> {
        const result = await pool.query(
            `SELECT ${SELECT_COLUMNS}
             FROM p_sysmast
             ORDER BY sysrtp ASC, sysrno ASC`
        );
        res.json(result.rows);
    },

    // Create a new system master record
    async create(req: Request, res: Response): Promise<void> {
        const body = req.body ?? {};
        const sysrtp = recordType(body.sysrtp);
        const sysrno = recordNo(body.sysrno);
        const sysdes = textField(body.sysdes, 'Description', 40, true);
        const sysdes1 = textField(body.sysdes1, 'Description 1', 40, false);
        const sysdes2 = textField(body.sysdes2, 'Description 2', 30, false);

        const existing = await pool.query(
            'SELECT 1 FROM p_sysmast WHERE sysrtp = $1 AND UPPER(sysrno) = $2',
            [sysrtp, sysrno]
        );
        if (existing.rowCount) {
            res.status(409).json({ message: 'Record already exists' });
            return;
        }

        const result = await pool.query(
            `INSERT INTO p_sysmast (
                sysrtp, sysrno, sysdes, sysdes1, sysdes2,
                sysucdnew, sysentddt, sysenttime
             )
             VALUES ($1, $2, $3, $4, $5, $6, CURRENT_DATE, LOCALTIME)
             RETURNING ${SELECT_COLUMNS}`,
            [sysrtp, sysrno, sysdes, sysdes1 || null, sysdes2 || null, req.user!.usr]
        );
        res.status(201).json(result.rows[0]);
    },

    // Update descriptions for an existing system master record
    async update(req: Request, res: Response): Promise<void> {
        const sno = id(req.params.id, 'system master record');
        const body = req.body ?? {};
        const sysdes = textField(body.sysdes, 'Description', 40, true);
        const sysdes1 = textField(body.sysdes1, 'Description 1', 40, false);
        const sysdes2 = textField(body.sysdes2, 'Description 2', 30, false);

        const result = await pool.query(
            `UPDATE p_sysmast
             SET sysdes = $1,
                 sysdes1 = $2,
                 sysdes2 = $3,
                 sysucdame = $4,
                 sysameddt = CURRENT_DATE,
                 sysametime = LOCALTIME
             WHERE syssno = $5
             RETURNING ${SELECT_COLUMNS}`,
            [sysdes, sysdes1 || null, sysdes2 || null, req.user!.usr, sno]
        );

        if (!result.rowCount) {
            res.status(404).json({ message: 'Record not found' });
            return;
        }

        res.status(200).json(result.rows[0]);
    },

    // Delete a system master record
    async remove(req: Request, res: Response): Promise<void> {
        const sno = id(req.params.id, 'system master record');
        const result = await pool.query(
            'DELETE FROM p_sysmast WHERE syssno = $1 RETURNING syssno',
            [sno]
        );

        if (!result.rowCount) {
            res.status(404).json({ message: 'Record not found' });
            return;
        }

        res.status(200).json({ deleted: sno });
    },

    // Map validation and constraint errors to HTTP responses
    handleError(error: unknown, _req: Request, res: Response, next: NextFunction): void {
        const e = error as { status?: number; message?: string; code?: string };
        if (e.status === 400) {
            res.status(400).json({ message: e.message });
            return;
        }
        if (e.code === '23505') {
            res.status(409).json({ message: 'Record already exists' });
            return;
        }
        if (e.code === '23503') {
            res.status(409).json({ message: 'Cannot delete record because it is in use' });
            return;
        }
        next(error);
    },
};
