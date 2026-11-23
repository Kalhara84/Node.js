import { pool } from '../lib/db';
import { fail } from '../lib/errors';
import type { UsrScope } from '../validators/usrenter.validator';

// Programs of the selected module/submodule together with the rights of one user
const programQuery = `SELECT p.*,m.sysdes AS module,s.sysdes AS submodule,
    CASE WHEN r.usrsno IS NULL AND u.usdadmin THEN 'y' ELSE COALESCE(r.usryn,'n') END AS usryn,
    CASE WHEN r.usrsno IS NULL AND u.usdadmin THEN 'y' ELSE COALESCE(r.usraddyn,'n') END AS usraddyn,
    CASE WHEN r.usrsno IS NULL AND u.usdadmin THEN 'y' ELSE COALESCE(r.usrameyn,'n') END AS usrameyn,
    CASE WHEN r.usrsno IS NULL AND u.usdadmin THEN 'y' ELSE COALESCE(r.usrdelyn,'n') END AS usrdelyn
    FROM prgmast p LEFT JOIN a_sysmast m ON m.syssno=p.prgmodsno LEFT JOIN a_sysmast s ON s.syssno=p.prgsmdsno
    LEFT JOIN usdmast u ON u.usdsno=$1
    LEFT JOIN usrmast r ON r.usrprgsno=p.prgsno AND r.usrusdsno=$1
    WHERE p.prgapp='payroll-web' AND ($2::int IS NULL OR p.prgmodsno=$2) AND ($3::int IS NULL OR p.prgsmdsno=$3)
    ORDER BY m.sysdes,s.sysdes,p.prgorder,p.prgsno`;

export const UsrEnterModel = {
    async findUser(id: number) {
        const r = await pool.query('SELECT usdsno,usdusd,usdnam,usdadmin FROM usdmast WHERE usdsno=$1', [id]);
        return r.rows[0] ?? null;
    },

    async programs(scope: UsrScope) {
        const r = await pool.query(programQuery, [scope.usrusdsno, scope.modsno, scope.submodsno]);
        return r.rows;
    },

    // SAVE or DELETE the rights of the selected programs in a single transaction
    async apply(scope: UsrScope, rows: { prgsno: number; values: string[] }[], action: 'save' | 'delete', by: string) {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            await client.query('LOCK TABLE prgmast IN SHARE MODE');

            const target = await client.query('SELECT usdadmin FROM usdmast WHERE usdsno=$1 FOR UPDATE', [scope.usrusdsno]);
            if (!target.rowCount) {
                fail('User not found');
            }

            // The program list on the screen must still match the database
            const programs = (await client.query(programQuery, [scope.usrusdsno, scope.modsno, scope.submodsno])).rows;
            const catalog = new Map<number, string>(programs.map((p) => [p.prgsno, p.prglvl]));
            if (catalog.size !== rows.length || rows.some((row) => !catalog.has(row.prgsno))) {
                fail('Program selection changed; CHECK again');
            }

            if (action === 'delete' && !target.rows[0].usdadmin) {
                await client.query(`DELETE FROM usrmast r WHERE r.usrusdsno=$1 AND EXISTS
                    (SELECT 1 FROM prgmast p WHERE p.prgsno=r.usrprgsno
                    AND p.prgapp='payroll-web' AND ($2::int IS NULL OR p.prgmodsno=$2) AND ($3::int IS NULL OR p.prgsmdsno=$3))`,
                    [scope.usrusdsno, scope.modsno, scope.submodsno]);
            } else {
                for (const row of rows) {
                    // Single programs use View only; Multi programs support all four ticks.
                    const level = catalog.get(row.prgsno);
                    // Removing admin access must save explicit No flags, not restore default full access.
                    const values = row.values.map((value, index) => action !== 'delete' && (level === 'M' || (level === 'S' && index === 0)) ? value : 'n');
                    await client.query(`INSERT INTO usrmast(usrusdsno,usrprgsno,usryn,usraddyn,usrameyn,usrdelyn,usrucdnew,usrentddt,usrenttime)
                        VALUES($1,$2,$3,$4,$5,$6,$7,CURRENT_DATE,LOCALTIME)
                        ON CONFLICT(usrusdsno,usrprgsno) DO UPDATE SET usryn=$3,usraddyn=$4,usrameyn=$5,usrdelyn=$6,
                        usrucdame=$7,usrameddt=CURRENT_DATE,usrametime=LOCALTIME`,
                        [scope.usrusdsno, row.prgsno, ...values, by]);
                }
            }

            await client.query('COMMIT');
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    },
};
