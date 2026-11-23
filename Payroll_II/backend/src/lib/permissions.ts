import type { RequestHandler } from 'express';
import { pool } from './db';
import { wrap } from '../middleware';

// Program names are the values stored in prgmast.prgnam. An old ".php" ending is ignored,
// so the rights keep working before and after the names in the database are cleaned.
const programName = (name: string) => name.replace(/\.php$/, '');

const EMPLOYEE_PROGRAMS = [
    'p_empenter', 
    'p_empm', 
    'p_empmastview', 
    'p_empenter1', 
    'p_empm1'
];

const EMPLOYEE_ENTRY_PROGRAMS = ['p_empenter', 'p_empenter1'];

export type EmployeePermissions = { view: boolean; add: boolean; amend: boolean; delete: boolean };
// Read whether this user is active and which employee actions they can use.
export async function accountAccess(id: number): Promise<{admin: boolean; employees: EmployeePermissions} | null> {
    const user = (await pool.query('SELECT usdactive,usdadmin FROM usdmast WHERE usdsno=$1',[id])).rows[0];
    
    // Missing or inactive accounts have no access.
    if (!user || user.usdactive !== 'Y') {
        return null;
    }

    // Administrators can view, add, amend and delete employee records.
    if (user.usdadmin){
        return {admin:true,employees:{view:true,add:true,amend:true,delete:true}};
    } 

    // Join user rights with program names to find assigned employee permissions.
    const rights = (await pool.query(`SELECT p.prgnam,r.usryn,r.usraddyn,r.usrameyn,r.usrdelyn
      FROM usrmast r JOIN prgmast p ON p.prgsno=r.usrprgsno
      WHERE r.usrusdsno=$1 AND regexp_replace(p.prgnam,'\\.php$','')=ANY($2::text[])`,
      [id,EMPLOYEE_PROGRAMS])).rows;


    // Read add, amend and delete rights from the employee entry programs.
    const action = (flag: string) => rights.some(r=>EMPLOYEE_ENTRY_PROGRAMS.includes(programName(r.prgnam)) && r[flag]==='y');
    const add=action('usraddyn'),amend=action('usrameyn'),remove=action('usrdelyn');
    
    // Allow viewing if any employee action is allowed or a view flag is set.
    return {
        admin:false,employees:{view:add||amend||remove||rights.some(r=>r.usryn==='y'),
        add,amend,delete:remove}
    };
}
// After the token check, confirm the account still has access.
export const requireActiveAccount: RequestHandler = wrap(async(req,res,next)=>{
    const access=await accountAccess(req.user!.sub);
    
    if (!access) {
        res.status(401).json({message:'Account is inactive or no longer exists'});return;
    }

    // Keep current permissions for the remaining checks in this request.
    res.locals.access=access;
    next();
});
// Return 403 when the required employee permission is missing.
export function requireEmployee(action: keyof EmployeePermissions): RequestHandler {
    return (_req,res,next)=>{
        
        if(!res.locals.access?.employees?.[action]) {
            res.status(403).json({message:`You do not have permission to ${action} employee records`});return;
        }

        next();
    };
}
