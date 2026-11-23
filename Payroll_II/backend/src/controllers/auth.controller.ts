// Check login details, return user sessions and handle password changes.
import type { Request, Response } from 'express';
import { signToken, verifyPassword, hashPassword } from '../lib/auth';
import { pool } from '../lib/db';
import { accountAccess } from '../lib/permissions';
import { UserModel } from '../models/user.model';
import type { AuthUser } from '../types';

export const AuthController = {
    // Check login details and return a signed token with the user profile.
    async login(req: Request, res: Response): Promise<void> {
        // Read the request body safely and accept text values for the two fields.
        const body = (req.body && typeof req.body === 'object') ? (req.body as Record<string, unknown>) : {};
        const username = typeof body.username === 'string' ? body.username.trim() : '';
        const password = typeof body.password === 'string' ? body.password : '';

        // Repeat the empty-field check on the server; return 400 for missing details.
        if (!username || !password) {
            res.status(400).json({ message: 'Username and password are required' });
            return;
        }

        // Ask models/user.model.ts to find this username in the database.
        const user = await UserModel.findByUsername(username);
        // Reject missing users, inactive accounts or wrong passwords with one message.
        if (!user || user.usdactive !== 'Y' || !verifyPassword(password, user.usdpwd)) {
            res.status(401).json({ message: 'Invalid username or password' });
            return;
        }

        // Use the display name, or the username when no display name is set.
        const name = user.usdnam || user.usdusd;

        // After a successful legacy password check, replace the old hash with scrypt.
        if (!user.usdpwd.startsWith('scrypt$')) {
            await pool.query(
                'UPDATE usdmast SET usdpwd=$1 WHERE usdsno=$2 AND usdpwd=$3',
                [hashPassword(password), user.usdsno, user.usdpwd]
            );
        }

        // Create an 8-hour signed token to identify this user on later requests.
        const token = signToken({ sub: user.usdsno, usr: user.usdusd, name });
        // Build public user details without including the password hash.
        const out: AuthUser = { id: user.usdsno, username: user.usdusd, name, role: user.usddes || '' };

        // Return the token, user details and database permissions to the frontend.
        res.json({
            token,
            user: { ...out, access: await accountAccess(user.usdsno) }
        });
    },

    // Return authenticated user profile and permissions
    me(req: Request, res: Response): void {
        // The token and account checks already ran; return the confirmed profile.
        const u = req.user!;
        res.json({
            id: u.sub,
            username: u.usr,
            name: u.name,
            access: res.locals.access
        });
    },

    // Change authenticated user password
    async changePassword(req: Request, res: Response): Promise<void> {
        // Read the old password and both new-password values.
        const { currentPassword, newPassword, confirmPassword } = req.body ?? {};

        if (
            typeof currentPassword !== 'string' ||
            typeof newPassword !== 'string' ||
            !newPassword ||
            newPassword.length > 256 ||
            newPassword !== confirmPassword
        ) {
            res.status(400).json({ message: 'Enter your current password and matching new passwords (maximum 256 characters)' });
            return;
        }

        // Read the signed-in user's stored hash, not an ID supplied by the form.
        const row = (await pool.query('SELECT usdpwd FROM usdmast WHERE usdsno=$1', [req.user!.sub])).rows[0];
        // Stop if the current password does not match the stored hash.
        if (!row || !verifyPassword(currentPassword, row.usdpwd)) {
            res.status(400).json({ message: 'Current password is incorrect' });
            return;
        }

        // Save the new hash only if the old hash has not changed during this request.
        const r = await pool.query(
            `UPDATE usdmast SET usdpwd=$1, usducdame=$2, usdameddt=CURRENT_DATE, usdametime=LOCALTIME
             WHERE usdsno=$3 AND usdpwd=$4`,
            [hashPassword(newPassword), req.user!.usr, req.user!.sub, row.usdpwd]
        );

        // Return a conflict if another request changed the password first.
        if (!r.rowCount) {
            res.status(409).json({ message: 'Password was changed elsewhere. Sign in again.' });
            return;
        }

        res.json({ message: 'Password changed successfully' });
    },
};
