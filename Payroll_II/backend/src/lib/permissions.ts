import type { RequestHandler } from 'express';
import { pool } from './db';
import { wrap } from '../middleware';

export type Rights = { view: boolean; add: boolean; amend: boolean; delete: boolean };
export type EmployeePermissions = Rights;
export type Screen = 'dashboard' | 'employees' | 'programs' | 'users' | 'rights';
export type Access = { admin: boolean } & Record<Screen, Rights>;

// Program keys match actual pages. Register the same key in Program Master before assigning rights.
// "programs": any right on these programs lets the user open the screen.
// "entry":    the add / amend / delete flags are read from these programs only.
// To control a new screen: add it here, add its program to prgmast (see the prgmast rows in db/payroll_db.sql).
export const SCREENS: Record<Screen, { programs: string[]; entry: string[] }> = {
    dashboard: { programs: ['dashboard'], entry: [] },
    employees: {
        programs: ['employees'],
        entry: ['employees'],
    },
    programs: { programs: ['programs'], entry: ['programs'] },
    users: { programs: ['users'], entry: ['users'] },
    rights: { programs: ['rights'], entry: ['rights'] },
};
const SCREEN_NAMES = Object.keys(SCREENS) as Screen[];
const ALL_PROGRAMS = [...new Set(SCREEN_NAMES.flatMap((s) => SCREENS[s].programs))];

const allRights: Rights = { view: true, add: true, amend: true, delete: true };

export async function accountAccess(id: number): Promise<Access | null> {
    const user = (await pool.query('SELECT usdactive,usdadmin FROM usdmast WHERE usdsno=$1',[id])).rows[0];
    if (!user || user.usdactive !== 'Y') return null;

    const rights = (await pool.query(`SELECT p.prgnam,p.prglvl,r.usryn,r.usraddyn,r.usrameyn,r.usrdelyn
      FROM usrmast r JOIN prgmast p ON p.prgsno=r.usrprgsno
      WHERE r.usrusdsno=$1 AND p.prgapp='payroll-web' AND p.prgnam=ANY($2::text[])`,
      [id,ALL_PROGRAMS])).rows;

    const access = { admin: !!user.usdadmin } as Access;
    for (const s of SCREEN_NAMES) {
        const screen = SCREENS[s];
        const mine = rights.filter((r) => screen.programs.includes(r.prgnam));
        // Admins start with all rights, but saved page restrictions override that default.
        if (user.usdadmin && mine.length === 0) {
            access[s] = { ...allRights };
            continue;
        }
        const entry = mine.filter((r) => screen.entry.includes(r.prgnam) && r.prglvl === 'M');
        const action = (flag: string) => entry.some((r) => r[flag] === 'y');
        const add = action('usraddyn'), amend = action('usrameyn'), remove = action('usrdelyn');
        access[s] = { view: add || amend || remove || mine.some((r) => r.usryn === 'y'), add, amend, delete: remove };
    }
    return access;
}

export const requireActiveAccount: RequestHandler = wrap(async(req,res,next)=>{
    const access=await accountAccess(req.user!.sub);
    if (!access) {res.status(401).json({message:'Account is inactive or no longer exists'});return;}
    res.locals.access=access;
    next();
});

export function requireEmployee(action: keyof EmployeePermissions): RequestHandler {
    return (_req,res,next)=>{
        if(!res.locals.access?.employees?.[action]) {res.status(403).json({message:`You do not have permission to ${action} employee records`});return;}
        next();
    };
}

// Allow the request only when the user has the right on the screen (or on any of the given screens)
export function requireScreen(screen: Screen | Screen[], action: keyof Rights = 'view'): RequestHandler {
    const screens = Array.isArray(screen) ? screen : [screen];
    return wrap(async (req, res, next) => {
        const access: Access | null = res.locals.access ?? (res.locals.access = await accountAccess(req.user!.sub));
        if (!access) {
            res.status(401).json({ message: 'Account is inactive or no longer exists' });
            return;
        }
        if (!screens.some((s) => access[s][action])) {
            res.status(403).json({ message: `You do not have permission to ${action} ${screens.join('/')}` });
            return;
        }
        next();
    });
}
