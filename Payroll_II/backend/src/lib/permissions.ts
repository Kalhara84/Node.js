import type { RequestHandler } from 'express';
import { pool } from './db';
import { wrap } from '../middleware';

export type EmployeePermissions = { view: boolean; add: boolean; amend: boolean; delete: boolean };
export async function accountAccess(id: number): Promise<{admin: boolean; employees: EmployeePermissions} | null> {
    const user = (await pool.query('SELECT usdactive,usdadmin FROM usdmast WHERE usdsno=$1',[id])).rows[0];
    if (!user || user.usdactive !== 'Y') return null;
    if (user.usdadmin) return {admin:true,employees:{view:true,add:true,amend:true,delete:true}};
    const rights = (await pool.query(`SELECT p.prgnam,r.usryn,r.usraddyn,r.usrameyn,r.usrdelyn
      FROM usrmast r JOIN prgmast p ON p.prgsno=r.usrprgsno
      WHERE r.usrusdsno=$1 AND p.prgnam=ANY($2::text[])`,
      [id,['p_empenter.php','p_empm.php','p_empmastview.php','p_empenter1.php','p_empm1.php']])).rows;
    const action = (flag: string) => rights.some(r=>['p_empenter.php','p_empenter1.php'].includes(r.prgnam) && r[flag]==='y');
    const add=action('usraddyn'),amend=action('usrameyn'),remove=action('usrdelyn');
    return {admin:false,employees:{view:add||amend||remove||rights.some(r=>r.usryn==='y'),add,amend,delete:remove}};
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
