// Hash passwords and create or check signed login tokens.
import crypto from 'crypto';
import unixCrypt from 'unix-crypt-td-js';
import type { TokenPayload } from '../types';
/** Sign login tokens and check current or imported legacy password hashes. */
// A login token remains valid for 8 hours.
const TOKEN_HOURS = 8;
// Read the server secret used to sign and check tokens.
const secret = (): string => {
    return process.env.AUTH_SECRET;
};

// Encode text so it can be placed inside the token.
const b64 = (v: string): string => {
    return Buffer.from(v).toString('base64url');
};

// Create a custom body.signature token with user details and an expiry time.
export function signToken(user: {
    sub: number;
    usr: string;
    name: string;
}): string {
    // Set the expiry, then sign the encoded user details with the server secret.
    const payload: TokenPayload = { ...user, exp: Math.floor(Date.now() / 1000) + TOKEN_HOURS * 3600 };
    const body = b64(JSON.stringify(payload));
    const sig = crypto.createHmac('sha256', secret()).update(body).digest('base64url');
    return `${body}.${sig}`;
}

// Return user details only when the token signature and expiry are valid.
export function verifyToken(token: string): TokenPayload | null {
    
    const [body, sig] = String(token).split('.');
    
    // Reject tokens missing either the user-data part or signature.
    if (!body || !sig) {
        return null;
    }
    
    // Rebuild the signature and compare it safely to detect changed tokens.
    const expected = crypto.createHmac('sha256', secret()).update(body).digest('base64url');
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
        return null;
    }

    try {
        // Decode the token data only after its signature has passed the check.
        const payload = JSON.parse(Buffer.from(body, 'base64url').toString()) as TokenPayload;
        
        // Accept the token only if its expiry time is still in the future.
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
// Create a random salt and a one-way password hash for database storage.
export function hashPassword(password: string): string {
   
    // Use a fresh salt so the same password can have different stored hashes.
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

    // Split the stored scrypt value into its format, salt and password hash.
    const [scheme, salt, hash] = String(stored).split('$');
   
    // Reject stored values that are not in the expected scrypt format.
    if (scheme !== 'scrypt' || !salt || !hash) {
        return false;
    }

    // Hash the entered password with the saved salt and compare the hashes.
    const test = crypto.scryptSync(password, salt, 64);
    const real = Buffer.from(hash, 'hex');
    return test.length === real.length && crypto.timingSafeEqual(test, real);
}
