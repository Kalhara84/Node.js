import type { Request, Response } from 'express';
import { signToken, verifyPassword } from '../lib/auth';
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
        const token = signToken({ sub: user.usdsno, usr: user.usdusd, name });
        const out: AuthUser = { id: user.usdsno, username: user.usdusd, name, role: user.usddes || '' };
        res.json({ token, user: out });
    },
    /** GET /api/auth/me */
    me(req: Request, res: Response): void {
        const u = req.user!;
        res.json({ id: u.sub, username: u.usr, name: u.name });
    },
};
