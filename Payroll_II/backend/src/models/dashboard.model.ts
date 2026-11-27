import { pool } from '../lib/db';
import type { DashboardData } from '../types';
export const DashboardModel = {
    async summary(): Promise<DashboardData> {
       
        const client = await pool.connect();
        
        try {
            await client.query('BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY');
            const [totals, category, gender, department, location, payrollDept, joins, recent] = [
                await client.query(`
            SELECT COUNT(*)::int AS total,
                   COUNT(*) FILTER (WHERE empactflg = 'Y')::int AS active,
                   COUNT(*) FILTER (WHERE empactflg = 'N')::int AS inactive,
                   COUNT(*) FILTER (WHERE empactflg IS NULL OR empactflg NOT IN ('Y', 'N'))::int AS unknown_status,
                   CURRENT_TIMESTAMP AS as_of,
                   COALESCE(SUM(empsal::numeric) FILTER (WHERE empactflg = 'Y'), 0) AS payroll,
                   COALESCE(AVG(empsal::numeric) FILTER (WHERE empactflg = 'Y'), 0) AS avg_salary,
                   COUNT(*) FILTER (WHERE empjoin >= date_trunc('year', CURRENT_DATE)::date AND empjoin <= CURRENT_DATE)::int AS joined_this_year
            FROM p_empmast`),

                await client.query(`SELECT COALESCE(NULLIF(BTRIM(empcat), ''), 'Not specified') AS label, COUNT(*)::int AS value FROM p_empmast
                      WHERE empactflg = 'Y' GROUP BY 1 ORDER BY 1`),

                await client.query(`SELECT COALESCE(NULLIF(BTRIM(empmof), ''), 'Not specified') AS label, COUNT(*)::int AS value FROM p_empmast
                      WHERE empactflg = 'Y' GROUP BY 1 ORDER BY 1`),

                await client.query(`SELECT COALESCE(NULLIF(BTRIM(d.depdes), ''), 'Unassigned') AS label, COUNT(*)::int AS value
                      FROM p_empmast e LEFT JOIN p_depmast d ON d.depsno = e.empdepsno
                      WHERE e.empactflg = 'Y' GROUP BY 1 ORDER BY 2 DESC, 1`),

                await client.query(`SELECT COALESCE(NULLIF(BTRIM(l.locnam), ''), 'Unassigned') AS label, COUNT(*)::int AS value
                      FROM p_empmast e LEFT JOIN s_locmast l ON l.locsno = e.emplocsno
                      WHERE e.empactflg = 'Y' GROUP BY 1 ORDER BY 2 DESC, 1`),

                await client.query(`SELECT COALESCE(NULLIF(BTRIM(d.depdes), ''), 'Unassigned') AS label, COALESCE(SUM(e.empsal::numeric), 0) AS value
                      FROM p_empmast e LEFT JOIN p_depmast d ON d.depsno = e.empdepsno
                      WHERE e.empactflg = 'Y' GROUP BY 1 ORDER BY 2 DESC, 1`),

                await client.query(`SELECT EXTRACT(YEAR FROM empjoin)::int AS label, COUNT(*)::int AS value
                      FROM p_empmast WHERE empjoin <= CURRENT_DATE GROUP BY 1 ORDER BY 1`),
                  
                await client.query(`SELECT e.empsno, e.empeno, e.empnam, e.empdesig, COALESCE(NULLIF(BTRIM(d.depdes), ''), 'Unassigned') AS department_name, e.empjoin
                      FROM p_empmast e LEFT JOIN p_depmast d ON d.depsno = e.empdepsno
                      ORDER BY e.empentddt DESC NULLS LAST, e.empenttime DESC NULLS LAST, e.empsno DESC LIMIT 6`),
            ];

            await client.query('COMMIT');
            const t = totals.rows[0];
            return {
                asOf: t.as_of.toISOString(),
                totals: {
                    total: t.total,
                    active: t.active,
                    inactive: t.inactive,
                    unknownStatus: t.unknown_status,
                    payroll: Number(t.payroll),
                    avgSalary: Number(t.avg_salary),
                    joinedThisYear: t.joined_this_year,
                },
                byCategory: category.rows,
                byGender: gender.rows,
                byDepartment: department.rows,
                byLocation: location.rows,
                payrollByDepartment: payrollDept.rows.map((r) => {
                    return ({ label: r.label, value: Number(r.value) });
                }),
                joinsByYear: joins.rows,
                recent: recent.rows,
            };
            
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    },
};
