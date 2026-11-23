import { fail } from '../lib/errors';

export const rightFlags = ['usryn', 'usraddyn', 'usrameyn', 'usrdelyn'] as const;

// Field max lengths for user table validation
const userFields: Record<string, number> = {
    usdusd: 8,
    usdnam: 50,
    usdad1: 50,
    usdad2: 50,
    usdad3: 50,
    usdtel: 25,
    usdfax: 25,
    usdmail: 25,
    usdnic: 10,
    usddes: 25
};

// Integer validation helper
export function integer(v: unknown, label: string, min = 1): number {
    if ((typeof v !== 'string' && typeof v !== 'number') || String(v).trim() === '') {
        fail(`${label} is required`);
    }
    const n = Number(v);
    if (!Number.isSafeInteger(n) || n < min || n > 2147483647) {
        fail(`${label} is invalid`);
    }
    return n;
}

// String validation helper
export function string(v: unknown, label: string, max: number, required = false): string {
    if (v != null && typeof v !== 'string') {
        fail(`${label} must be text`);
    }
    const s = String(v ?? '').trim();
    if ((required && !s) || s.length > max) {
        fail(`${label} is required and must be at most ${max} characters`);
    }
    return s;
}

// Validate user profile input (password is returned as plain text; the controller hashes it)
export function validateUser(body: Record<string, unknown>, create: boolean) {
    const data: Record<string, unknown> = {};

    for (const [key, max] of Object.entries(userFields)) {
        if (key === 'usdusd' && !create) continue;
        data[key] = string(body[key], key, max, key === 'usdusd');
    }

    data.usduno = body.usduno === '' || body.usduno == null ? null : integer(body.usduno, 'User number', 0);
    data.usdcomsno = body.usdcomsno === '' || body.usdcomsno == null ? 0 : integer(body.usdcomsno, 'Location');

    if (!['Y', 'N'].includes(String(body.usdactive ?? 'Y'))) {
        fail('Invalid active status');
    }
    data.usdactive = body.usdactive ?? 'Y';

    let password: string | null = null;
    if (create || body.usdpwd) {
        if (typeof body.usdpwd !== 'string' || !body.usdpwd.length || body.usdpwd.length > 256) {
            fail('Password is required (maximum 256 characters)');
        }
        password = body.usdpwd;
    }

    return { data, password };
}

// Validate the rights list sent from the user rights screen
export function validateRights(body: Record<string, unknown>) {
    const rows = body.rows;

    if (!Array.isArray(rows) || rows.length > 10000) {
        fail('Invalid rights list');
    }

    const ids = rows.map((r) => integer(r?.prgsno, 'Program'));
    if (new Set(ids).size !== ids.length) {
        fail('Duplicate programs');
    }

    for (const row of rows) {
        for (const flag of rightFlags) {
            if (!['y', 'n'].includes(row[flag])) {
                fail('Rights must be y or n');
            }
        }
    }

    return { rows, ids, clear: body.clear === true };
}
