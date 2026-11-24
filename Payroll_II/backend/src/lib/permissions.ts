import type { RequestHandler } from 'express';
import { pool } from './db';
import { wrap } from '../middleware';

export type Rights = { 
    view: boolean; 
    add: boolean; 
    amend: boolean; 
    delete: boolean 
};
export type EmployeePermissions = Rights;

// New pages can use their own registered program key without changing a fixed type list.
export type Screen = string;
export type Access = { admin: boolean } & Record<Screen, Rights>;

// Keep defaults for existing routes; additional page keys come from the database.
const BUILTIN_SCREENS = [
    'dashboard', 
    'employees', 
    'programs', 
    'users', 
    'rights'
];

const allRights: Rights = {
    view: true, 
    add: true, 
    amend: true, 
    delete: true 
};

export async function accountAccess(id: number): Promise<Access | null> {
    const user = (await pool.query(
        'SELECT usdactive,usdadmin FROM usdmast WHERE usdsno=$1', 
        [id])).rows[0];
    if (!user || user.usdactive !== 'Y') {
        return null;
    }

    // Load every registered page, including new pages with no assigned rights yet.
    const rights = (await pool.query(`SELECT p.prgnam,p.prglvl,
      CASE WHEN r.usrsno IS NULL AND $2::boolean THEN 'y' ELSE COALESCE(r.usryn,'n') END AS usryn,
      CASE WHEN r.usrsno IS NULL AND $2::boolean THEN 'y' ELSE COALESCE(r.usraddyn,'n') END AS usraddyn,
      CASE WHEN r.usrsno IS NULL AND $2::boolean THEN 'y' ELSE COALESCE(r.usrameyn,'n') END AS usrameyn,
      CASE WHEN r.usrsno IS NULL AND $2::boolean THEN 'y' ELSE COALESCE(r.usrdelyn,'n') END AS usrdelyn
      FROM prgmast p LEFT JOIN usrmast r ON r.usrprgsno=p.prgsno AND r.usrusdsno=$1
      WHERE p.prgapp='payroll-web'`, [id, !!user.usdadmin])).rows;

    const access = { admin: !!user.usdadmin } as Access;
   
    const names = new Set([...BUILTIN_SCREENS, ...rights.map(row => row.prgnam)]);
    
    for (const s of names) {
        // Never treat special object fields as page permissions.
        if (typeof s !== 'string' || ['admin', '__proto__', 'constructor', 'prototype'].includes(s)) {
            continue;
        }

        const mine = rights.filter((r) => r.prgnam === s);
        // Admins start with all rights, but saved page restrictions override that default.

        if (user.usdadmin && mine.length === 0) {
            access[s] = { ...allRights };
            continue;
        }

        const entry = mine.filter((r) => r.prglvl === 'M');
        const action = (flag: string) => entry.some((r) => r[flag] === 'y');
        const add = action('usraddyn'), amend = action('usrameyn'), remove = action('usrdelyn');
        access[s] = { view: add || amend || remove || mine.some((r) => r.usryn === 'y'), add, amend, delete: remove };
    }
    return access;
}

export const requireActiveAccount: RequestHandler = wrap(async (req, res, next) => {
    
    const access = await accountAccess(req.user!.sub);
    
    if (!access) {
        res.status(401).json({ message: 'Account is inactive or no longer exists' });
        return;
    }

    res.locals.access = access;
    next();

});

export function requireEmployee(action: keyof EmployeePermissions): RequestHandler {
    return (_req, res, next) => {
        if (!res.locals.access?.employees?.[action]) {
            res.status(403).json({ message: `You do not have permission to ${action} employee records` });
            return;
        }
        next();
    };
}

// Allow the request only when the user has the right on the screen (or on any of the given screens)
export function requireScreen(screen: Screen | Screen[], action: keyof Rights = 'view'): RequestHandler {
    const screens = Array.isArray(screen) ? screen : [screen];
    
    return wrap(async (req, res, next) => {
        const access: Access | null = res.locals.access ?? (res.locals.access = await accountAccess(req.user!.sub));
       
        if (!access) {
            res.status(401).json(
                { message: 'Account is inactive or no longer exists' }
            );
            return;
        }

        if (!screens.some((s) => access[s]?.[action])) {
            res.status(403).json(
                { message: `You do not have permission to ${action} ${screens.join('/')}` }
            );
            return;
        }
        
        next();
    });

}
