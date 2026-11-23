import { Router } from 'express';
import { pool } from '../lib/db';
import { wrap } from '../middleware';

export const usrFlags = ['usryn', 'usraddyn', 'usrameyn', 'usrdelyn'] as const;
type UsrInput = Record<string, unknown>;
export type UsrScope = { usrusdsno: number; modopt: 'A' | 'S'; smodopt: 'A' | 'S'; modsno: number | null; submodsno: number | null };

function invalid(message: string): never {
    throw Object.assign(new Error(message), { status: 400 });
}
function identifier(value: unknown, label: string): number {
    if (!['string', 'number'].includes(typeof value) || !String(value).trim()) invalid(`${label} is required`);
    const number = Number(value);
    if (!Number.isSafeInteger(number) || number < 1 || number > 2147483647) invalid(`${label} is invalid`);
    return number;
}
export function usrScope(input: UsrInput): UsrScope {
    const { modopt, smodopt } = input;
    if ((modopt !== 'A' && modopt !== 'S') || (smodopt !== 'A' && smodopt !== 'S')) invalid('Choose All or Select for module and submodule');
    return {
        usrusdsno: identifier(input.usrusdsno, 'User'), modopt, smodopt,
        modsno: modopt === 'S' ? identifier(input.modsno, 'Module') : null,
        submodsno: smodopt === 'S' ? identifier(input.submodsno, 'Submodule') : null,
    };
}
export function usrRows(input: UsrInput): { prgsno: number; values: string[] }[] {
    if (!Array.isArray(input.prgsno) || input.prgsno.length > 10000) invalid('Invalid program list');
    const te_prgsno = input.prgsno.map(value => identifier(value, 'Program'));
    if (new Set(te_prgsno).size !== te_prgsno.length) invalid('Duplicate programs');
    if (input.hcount !== te_prgsno.length) invalid('Program count changed; CHECK again');
    for (const flag of usrFlags) {
        const values = input[flag];
        if (!Array.isArray(values) || values.length !== te_prgsno.length || values.some(value => value !== 'y' && value !== 'n')) invalid('Rights must be y or n for each program');
    }
    return te_prgsno.map((prgsno, index) => ({ prgsno, values: usrFlags.map(flag => (input[flag] as string[])[index]) }));
}
const programQuery = `SELECT p.*,m.sysdes AS module,s.sysdes AS submodule,r.usryn,r.usraddyn,r.usrameyn,r.usrdelyn
    FROM prgmast p LEFT JOIN a_sysmast m ON m.syssno=p.prgmodsno LEFT JOIN a_sysmast s ON s.syssno=p.prgsmdsno
    LEFT JOIN usrmast r ON r.usrprgsno=p.prgsno AND r.usrusdsno=$1
    WHERE ($2::int IS NULL OR p.prgmodsno=$2) AND ($3::int IS NULL OR p.prgsmdsno=$3)
    ORDER BY m.sysdes,s.sysdes,p.prgorder,p.prgsno`;
const router = Router();
router.get('/', wrap(async (req, res) => {
    const te_scope = usrScope(req.query);
    const te_user = (await pool.query('SELECT usdsno,usdusd,usdnam,usdadmin FROM usdmast WHERE usdsno=$1', [te_scope.usrusdsno])).rows[0];
    if (!te_user) invalid('User not found');
    const te_rows = (await pool.query(programQuery, [te_scope.usrusdsno, te_scope.modsno, te_scope.submodsno])).rows;
    res.json({ ...te_scope, usrusdsnoauto: te_user.usdusd, usdnam: te_user.usdnam, usdadmin: te_user.usdadmin, rows: te_rows });
}));
router.post('/', wrap(async (req, res) => {
    const input: UsrInput = req.body ?? {};
    const te_scope = usrScope(input);
    if ((input.save === true) === (input.delete === true)) invalid('Choose SAVE or DELETE');
    const te_rows = usrRows(input);
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        await client.query('LOCK TABLE prgmast IN SHARE MODE');
        if (!(await client.query('SELECT 1 FROM usdmast WHERE usdsno=$1 FOR UPDATE', [te_scope.usrusdsno])).rowCount) invalid('User not found');
        const programs = (await client.query(programQuery, [te_scope.usrusdsno, te_scope.modsno, te_scope.submodsno])).rows;
        const catalog = new Map(programs.map(program => [program.prgsno, program.prglvl]));
        if (catalog.size !== te_rows.length || te_rows.some(row => !catalog.has(row.prgsno))) invalid('Program selection changed; CHECK again');
        if (input.delete === true) {
            await client.query(`DELETE FROM usrmast r WHERE r.usrusdsno=$1 AND EXISTS
                (SELECT 1 FROM prgmast p WHERE p.prgsno=r.usrprgsno
                AND ($2::int IS NULL OR p.prgmodsno=$2) AND ($3::int IS NULL OR p.prgsmdsno=$3))`,
                [te_scope.usrusdsno, te_scope.modsno, te_scope.submodsno]);
        } else {
            for (const row of te_rows) {
                const te_prglvl = catalog.get(row.prgsno);
                const values = row.values.map((value, index) => te_prglvl === 'S' ? (index === 0 ? value : 'n') : te_prglvl === 'M' && index > 0 ? value : 'n');
                await client.query(`INSERT INTO usrmast(usrusdsno,usrprgsno,usryn,usraddyn,usrameyn,usrdelyn,usrucdnew,usrentddt,usrenttime)
                    VALUES($1,$2,$3,$4,$5,$6,$7,CURRENT_DATE,LOCALTIME)
                    ON CONFLICT(usrusdsno,usrprgsno) DO UPDATE SET usryn=$3,usraddyn=$4,usrameyn=$5,usrdelyn=$6,
                    usrucdame=$7,usrameddt=CURRENT_DATE,usrametime=LOCALTIME`,
                    [te_scope.usrusdsno, row.prgsno, ...values, req.user!.usr]);
            }
        }
        await client.query('COMMIT');
        res.json({ message: `${te_rows.length} program rights ${input.delete === true ? 'deleted' : 'saved'}` });
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
}));
export default router;
