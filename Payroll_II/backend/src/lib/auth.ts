import crypto from 'crypto';
import unixCrypt from 'unix-crypt-td-js';
import type { TokenPayload } from '../types';
/** Token + password helpers using only Node's built-in crypto. */
const TOKEN_HOURS = 8;

const secret = (): string => {
    const value = process.env.AUTH_SECRET;
    if (!value) {
        throw new Error('AUTH_SECRET is required');
    }
    return value;
};

const b64 = (v: string): string => {
    return Buffer.from(v).toString('base64url');
};

export function signToken(user: {
    sub: number;
    usr: string;
    name: string;
}): string {
    const payload: TokenPayload = { ...user, exp: Math.floor(Date.now() / 1000) + TOKEN_HOURS * 3600 };
    const body = b64(JSON.stringify(payload));
    const sig = crypto.createHmac('sha256', secret()).update(body).digest('base64url');
    return `${body}.${sig}`;
}

export function verifyToken(token: string): TokenPayload | null {
    const [body, sig] = String(token).split('.');

    if (!body || !sig) {
        return null;
    }

    const expected = crypto.createHmac('sha256', secret()).update(body).digest('base64url');
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);

    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
        return null;
    }

    try {
        const payload = JSON.parse(Buffer.from(body, 'base64url').toString()) as TokenPayload;
        if (payload.exp > Math.floor(Date.now() / 1000)) {
            return payload;
        }
        else {
            return null;
        }
    }
    catch {
        return null;
    }

}

/** stored format:  scrypt$<salt>$<hash> */
export function hashPassword(password: string): string {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.scryptSync(password, salt, 64).toString('hex');
    return `scrypt$${salt}$${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
    // PHP crypt(password, 'pw') uses traditional DES. Only verify imported hashes;
    // successful legacy logins are upgraded to scrypt by the controller.
    if (/^[./0-9A-Za-z]{13}$/.test(String(stored))) {
        const actual = Buffer.from(unixCrypt(password, stored.slice(0, 2)));
        const expected = Buffer.from(stored);
        return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
    }
    const [scheme, salt, hash] = String(stored).split('$');
    if (scheme !== 'scrypt' || !salt || !hash) {
        return false;
    }
    const test = crypto.scryptSync(password, salt, 64);
    const real = Buffer.from(hash, 'hex');
    return test.length === real.length && crypto.timingSafeEqual(test, real);
}
