import { pool } from '../lib/db';
import { fail } from '../lib/errors';
import type { UsrScope } from '../validators/usrenter.validator';

// Programs of the selected module/submodule together with the rights of one user
const programQuery = `SELECT p.*,m.sysdes AS module,s.sysdes AS submodule,r.usryn,r.usraddyn,r.usrameyn,r.usrdelyn
    FROM prgmast p LEFT JOIN a_sysmast m ON m.syssno=p.prgmodsno LEFT JOIN a_sysmast s ON s.syssno=p.prgsmdsno
    LEFT JOIN usrmast r ON r.usrprgsno=p.prgsno AND r.usrusdsno=$1
    WHERE ($2::int IS NULL OR p.prgmodsno=$2) AND ($3::int IS NULL OR p.prgsmdsno=$3)
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

            if (!(await client.query('SELECT 1 FROM usdmast WHERE usdsno=$1 FOR UPDATE', [scope.usrusdsno])).rowCount) {
                fail('User not found');
            }

            // The program list on the screen must still match the database
            const programs = (await client.query(programQuery, [scope.usrusdsno, scope.modsno, scope.submodsno])).rows;
            const catalog = new Map<number, string>(programs.map((p) => [p.prgsno, p.prglvl]));
            if (catalog.size !== rows.length || rows.some((row) => !catalog.has(row.prgsno))) {
                fail('Program selection changed; CHECK again');
            }

            if (action === 'delete') {
                await client.query(`DELETE FROM usrmast r WHERE r.usrusdsno=$1 AND EXISTS
                    (SELECT 1 FROM prgmast p WHERE p.prgsno=r.usrprgsno
                    AND ($2::int IS NULL OR p.prgmodsno=$2) AND ($3::int IS NULL OR p.prgsmdsno=$3))`,
                    [scope.usrusdsno, scope.modsno, scope.submodsno]);
            } else {
                for (const row of rows) {
                    // Single level program: only "view" flag, Multi level program: only add/amend/delete flags
                    const level = catalog.get(row.prgsno);
                    const values = row.values.map((value, index) => level === 'S' ? (index === 0 ? value : 'n') : level === 'M' && index > 0 ? value : 'n');
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
