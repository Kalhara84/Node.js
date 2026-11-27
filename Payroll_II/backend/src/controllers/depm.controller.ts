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

// Validate department code (uppercase, max 6 chars)
function depCode(value: unknown): string {
    if (typeof value !== 'string') {
        fail('Department code is required');
    }

    const code = value.trim().toUpperCase();
    if (!code) {
        fail('Department code is required');
    }
    if (code.length > 6) {
        fail('Department code must be 6 characters or fewer');
    }

    return code;
}

// Validate department description (max 30 chars)
function depDesc(value: unknown): string {
    if (typeof value !== 'string') {
        fail('Description is required');
    }

    const desc = value.trim();
    if (!desc) {
        fail('Description is required');
    }
    if (desc.length > 30) {
        fail('Description must be 30 characters or fewer');
    }

    return desc;
}

export const DepmController = {
    // List all department records
    async list(_req: Request, res: Response): Promise<void> {
        const result = await pool.query(
            `SELECT depsno, depdep, depdes, depoutbilyn, depscgpcn, depvatpcn, deprsvpcn,
                    depucdnew, to_char(depentddt, 'YYYY-MM-DD') AS depentddt, depenttime,
                    depucdame, to_char(depameddt, 'YYYY-MM-DD') AS depameddt, depametime
             FROM p_depmast
             ORDER BY depdep ASC`
        );
        res.json(result.rows);
    },

    // Create a new department record
    async create(req: Request, res: Response): Promise<void> {
        const body = req.body ?? {};
        const code = depCode(body.depdep);
        const desc = depDesc(body.depdes);

        const existing = await pool.query(
            'SELECT 1 FROM p_depmast WHERE UPPER(depdep) = $1',
            [code]
        );
        if (existing.rowCount) {
            res.status(409).json({ message: 'Record already exists' });
            return;
        }

        const result = await pool.query(
            `INSERT INTO p_depmast (depdep, depdes, depucdnew, depentddt, depenttime)
             VALUES ($1, $2, $3, CURRENT_DATE, LOCALTIME)
             RETURNING depsno, depdep, depdes, depoutbilyn, depscgpcn, depvatpcn, deprsvpcn,
                       depucdnew, to_char(depentddt, 'YYYY-MM-DD') AS depentddt, depenttime,
                       depucdame, to_char(depameddt, 'YYYY-MM-DD') AS depameddt, depametime`,
            [code, desc, req.user!.usr]
        );
        res.status(201).json(result.rows[0]);
    },

    // Update description for an existing department
    async update(req: Request, res: Response): Promise<void> {
        const record = id(req.params.id, 'department record');
        const body = req.body ?? {};
        const desc = depDesc(body.depdes);

        const result = await pool.query(
            `UPDATE p_depmast
             SET depdes = $1,
                 depucdame = $2,
                 depameddt = CURRENT_DATE,
                 depametime = LOCALTIME
             WHERE depsno = $3
             RETURNING depsno, depdep, depdes, depoutbilyn, depscgpcn, depvatpcn, deprsvpcn,
                       depucdnew, to_char(depentddt, 'YYYY-MM-DD') AS depentddt, depenttime,
                       depucdame, to_char(depameddt, 'YYYY-MM-DD') AS depameddt, depametime`,
            [desc, req.user!.usr, record]
        );

        if (!result.rowCount) {
            res.status(404).json({ message: 'Record not found' });
            return;
        }

        res.status(200).json(result.rows[0]);
    },

    // Delete a department record
    async remove(req: Request, res: Response): Promise<void> {
        const record = id(req.params.id, 'department record');
        const result = await pool.query(
            'DELETE FROM p_depmast WHERE depsno = $1 RETURNING depsno',
            [record]
        );

        if (!result.rowCount) {
            res.status(404).json({ message: 'Record not found' });
            return;
        }

        res.status(200).json({ message: 'Department deleted' });
    },

    // Map validation and constraint errors to HTTP responses
    handleError(error: unknown, _req: Request, res: Response, next: NextFunction): void {
        const e = error as { status?: number; code?: string; message?: string };

        if (e.status === 400) {
            res.status(400).json({ message: e.message });
            return;
        }

        if (e.code === '23505') {
            res.status(409).json({ message: 'Record already exists' });
            return;
        }

        if (e.code === '23503') {
            res.status(409).json({ message: 'Cannot delete department because it is in use' });
            return;
        }

        next(error);
    },
};

