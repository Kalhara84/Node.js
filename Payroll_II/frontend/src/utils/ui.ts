// Escape HTML special characters (used for the print window HTML)
export const esc = (s: unknown): string => {
    return String(s ?? '').replace(/[&<>"']/g, (c) => {
        return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string);
    });
};

// Format currency and numbers (LKR format)
export const money = (n: number | string | null | undefined, d = 0): string => {
    return Number(n ?? 0).toLocaleString('en-LK', {
        minimumFractionDigits: d,
        maximumFractionDigits: d
    });
};

// Employee category lookup mapping
export const CATEGORY: Record<string, string> = {
    W: 'Wages',
    E: 'Executive',
    S: 'Staff'
};

// Gender code lookup mapping
export const GENDER: Record<string, string> = {
    M: 'Male',
    F: 'Female'
};

// Convert Y/N database values to readable Yes/No text
export const yn = (v: string | null | undefined): string => {
    if (v === 'Y') {
        return 'Yes';
    }
    if (v === 'N') {
        return 'No';
    }
    return v || '-';
};

// Extract readable error message from caught exception
export const errMsg = (e: unknown): string => {
    return e instanceof Error ? e.message : String(e);
};
