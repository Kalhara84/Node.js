import type { Request, Response } from 'express';
import { signToken, verifyPassword, hashPassword } from '../lib/auth';
import { pool } from '../lib/db';
import { accountAccess } from '../lib/permissions';
import { UserModel } from '../models/user.model';
import type { AuthUser } from '../types';
export const AuthController = {
    /** POST /api/auth/login   body: { username, password } */
    async login(req: Request, res: Response): Promise<void> {
        let body;
        if (req.body && typeof req.body === 'object') {
            body = (req.body as Record<string, unknown>);
        }
        else {
            body = {};
        }
        let username;
        if (typeof body.username === 'string') {
            username = body.username.trim();
        }
        else {
            username = '';
        }
        let password;
        if (typeof body.password === 'string') {
            password = body.password;
        }
        else {
            password = '';
        }
        if (!username || !password) {
            res.status(400).json({ message: 'Username and password are required' });
            return;
        }
        const user = await UserModel.findByUsername(username);
        if (!user || user.usdactive !== 'Y' || !verifyPassword(password, user.usdpwd)) {
            res.status(401).json({ message: 'Invalid username or password' });
            return;
        }
        const name = user.usdnam || user.usdusd;
        if (!user.usdpwd.startsWith('scrypt$')) {
            await pool.query('UPDATE usdmast SET usdpwd=$1 WHERE usdsno=$2 AND usdpwd=$3',[hashPassword(password),user.usdsno,user.usdpwd]);
        }
        const token = signToken({ sub: user.usdsno, usr: user.usdusd, name });
        const out: AuthUser = { id: user.usdsno, username: user.usdusd, name, role: user.usddes || '' };
        res.json({ token, user: { ...out, access: await accountAccess(user.usdsno) } });
    },
    /** GET /api/auth/me */
    me(req: Request, res: Response): void {
        const u = req.user!;
        res.json({ id: u.sub, username: u.usr, name: u.name, access:res.locals.access });
    },
    async changePassword(req: Request,res: Response): Promise<void> {
        const {currentPassword,newPassword,confirmPassword}=req.body ?? {};
        if (typeof currentPassword!=='string'||typeof newPassword!=='string'||!newPassword||newPassword.length>256||newPassword!==confirmPassword) {
            res.status(400).json({message:'Enter your current password and matching new passwords (maximum 256 characters)'});return;
        }
        const row=(await pool.query('SELECT usdpwd FROM usdmast WHERE usdsno=$1',[req.user!.sub])).rows[0];
        if (!row||!verifyPassword(currentPassword,row.usdpwd)) {res.status(400).json({message:'Current password is incorrect'});return;}
        const r=await pool.query(`UPDATE usdmast SET usdpwd=$1,usducdame=$2,usdameddt=CURRENT_DATE,usdametime=LOCALTIME
          WHERE usdsno=$3 AND usdpwd=$4`,[hashPassword(newPassword),req.user!.usr,req.user!.sub,row.usdpwd]);
        if(!r.rowCount){res.status(409).json({message:'Password was changed elsewhere. Sign in again.'});return;}
        res.json({message:'Password changed successfully'});
    },
};
