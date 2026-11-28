import type { NextFunction, Request, Response } from 'express';
import { pool } from '../lib/db';
import { fail } from '../lib/errors';

export interface PaySlipItem {
    trntyp: string;
    sysdes: string;
    trnamt: number;
}

export interface PaySlipSection {
    category: 'EARNINGS' | 'DEDUCTIONS' | 'OTHERS';
    items: PaySlipItem[];
    total: number | null;
}

// Validate and parse a positive integer ID (returns null when omitted)
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

// Validate and parse a required positive integer ID
function requiredId(value: unknown, label: string): number {
    const n = optionalId(value, label);
    if (n === null) {
        fail(`${label} is required`);
    }
    return n;
}

// Categorize transaction type code into EARNINGS, DEDUCTIONS, or OTHERS
function categoryFor(trntyp: string): PaySlipSection['category'] {
    if (trntyp >= '001' && trntyp <= '050') return 'EARNINGS';
    if (trntyp >= '051' && trntyp <= '089') return 'DEDUCTIONS';
    return 'OTHERS';
}

// Check whether the transaction type should appear on the pay slip
function isPaySlipType(trntyp: string): boolean {
    return (trntyp >= '001' && trntyp <= '089')
        || trntyp === '090'
        || trntyp === '091'
        || trntyp === '092';
}

export const DisppaysController = {
    // Load initial departments, active employees, payroll period, and company name
    async options(_req: Request, res: Response): Promise<void> {
        const [departments, employees, period, company] = await Promise.all([
            pool.query(
                `SELECT depsno, depdes
                 FROM p_depmast
                 ORDER BY depdes`
            ),
            pool.query(
                `SELECT empsno, empeno, empnam, empdepsno
                 FROM p_empmast
                 WHERE empactflg = 'Y'
                 ORDER BY empeno`
            ),
            pool.query(
                `SELECT sysdes
                 FROM p_sysmast
                 WHERE sysrtp = 7 AND sysrno = '001'
                 LIMIT 1`
            ),
            pool.query(
                `SELECT locnam
                 FROM s_locmast
                 ORDER BY locnam
                 LIMIT 1`
            ),
        ]);

        res.json({
            departments: departments.rows,
            employees: employees.rows,
            period: period.rows[0]?.sysdes ?? null,
            companyName: company.rows[0]?.locnam ?? '',
        });
    },

    // Load active employees filtered by optional department (replaces sajax load_emp1)
    async employees(req: Request, res: Response): Promise<void> {
        const depsno = optionalId(req.query.depsno, 'department');
        const params: unknown[] = [];
        const conditions = ["empactflg = 'Y'"];

        if (depsno !== null) {
            params.push(depsno);
            conditions.push(`empdepsno = $${params.length}`);
        }

        const result = await pool.query(
            `SELECT empsno, empeno, empnam, empdepsno
             FROM p_empmast
             WHERE ${conditions.join(' AND ')}
             ORDER BY empeno`,
            params
        );

        res.json({ employees: result.rows });
    },

    // Load pay slip transactions grouped by category for the selected employee
    async display(req: Request, res: Response): Promise<void> {
        const empsno = requiredId(req.query.empsno, 'Employee');
        const depsno = optionalId(req.query.depsno, 'department');

        const params: unknown[] = [empsno];
        const conditions = ['t.trnempsno = $1', 's.sysrtp = 4'];

        if (depsno !== null) {
            params.push(depsno);
            conditions.push(`e.empdepsno = $${params.length}`);
        }

        const [trnRes, empRes, periodRes, companyRes] = await Promise.all([
            pool.query(
                `SELECT t.trntyp, t.trnamt, s.sysdes
                 FROM p_trnmast t
                 LEFT JOIN p_empmast e ON t.trnempsno = e.empsno
                 LEFT JOIN p_sysmast s ON t.trntyp = s.sysrno
                 WHERE ${conditions.join(' AND ')}
                 ORDER BY s.sysrno`,
                params
            ),
            pool.query(
                `SELECT empsno, empeno, empnam
                 FROM p_empmast
                 WHERE empsno = $1
                 LIMIT 1`,
                [empsno]
            ),
            pool.query(
                `SELECT sysdes
                 FROM p_sysmast
                 WHERE sysrtp = 7 AND sysrno = '001'
                 LIMIT 1`
            ),
            pool.query(
                `SELECT locnam
                 FROM s_locmast
                 ORDER BY locnam
                 LIMIT 1`
            ),
        ]);

        const sections: PaySlipSection[] = [];
        let current: PaySlipSection | null = null;

        for (const row of trnRes.rows) {
            const trntyp = String(row.trntyp ?? '').trim();
            if (!isPaySlipType(trntyp)) continue;

            const category = categoryFor(trntyp);
            if (!current || current.category !== category) {
                current = {
                    category,
                    items: [],
                    total: category === 'OTHERS' ? null : 0,
                };
                sections.push(current);
            }

            const trnamt = Number(row.trnamt ?? 0);
            current.items.push({
                trntyp,
                sysdes: String(row.sysdes ?? ''),
                trnamt,
            });

            if (trntyp >= '001' && trntyp <= '089' && current.total !== null) {
                current.total += trnamt;
            }
        }

        const emp = empRes.rows[0];

        res.json({
            companyName: companyRes.rows[0]?.locnam ?? '',
            period: periodRes.rows[0]?.sysdes ?? null,
            employee: emp
                ? {
                    empsno: emp.empsno,
                    empeno: emp.empeno,
                    empnam: emp.empnam,
                    label: `${emp.empeno} - ${emp.empnam}`,
                }
                : null,
            sections,
            user: req.user?.usr ?? '',
        });
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
