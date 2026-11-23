// Allow known employee fields only and check their types and values.
import type { EmployeeInput } from '../types';

// Name checks for whole numbers, optional numbers, dates, flags and text.
type Kind = 'int' | 'intn' | 'float' | 'date' | 'yn' | 'cat' | 'mf' | 'str';
// Describe one allowed field: name, check type and optional text limit.
type Spec = [
    name: keyof EmployeeInput & string,
    kind: Kind,
    max?: number
];
// List accepted employee fields; unlisted input fields are not copied.
const SPEC: Spec[] = [
    ['empinital', 'str', 20],
    ['empnam', 'str', 80],
    ['empcat', 'cat'],
    ['empactflg', 'yn'],
    ['empsts', 'str', 1],
    ['empmapcode', 'intn'],
    ['emplocsno', 'intn'],
    ['empdepsno', 'intn'],
    ['empsecsno', 'intn'],
    ['emparesno', 'intn'],
    ['empcossno', 'intn'],
    ['empbasisno', 'intn'],
    ['empsal', 'float'],
    ['empscgpcn', 'float'],
    ['empepfyn', 'yn'],
    ['empepfno', 'int'],
    ['emppayeyn', 'yn'],
    ['emptno', 'int'],
    ['empprl', 'float'],
    ['emptax', 'float'],
    ['empgin', 'float'],
    ['emptin', 'str', 18],
    ['empcob', 'float'],
    ['empmof', 'mf'],
    ['empidno', 'str', 20],
    ['emppasportno', 'str', 15],
    ['empdob', 'date'],
    ['empmrdtst', 'str', 1],
    ['empdesig', 'str', 60],
    ['empjoin', 'date'],
    ['empleft', 'date'],
    ['empbnkacno', 'str', 30],
    ['empbnkcode', 'str', 20],
    ['empbnkbranch', 'str', 20],
    ['empbnkid', 'str', 20],
    ['empad1', 'str', 40],
    ['empad2', 'str', 40],
    ['empad3', 'str', 40],
    ['empad4', 'str', 40],
    ['empemail', 'str', 40],
    ['emptel', 'str', 25],
    ['empanual', 'str', 4],
    ['empcasal', 'str', 4],
    ['empleuleu', 'str', 4],
    ['empotflg', 'yn'],
    ['empnopflg', 'yn'],
    ['empattincflg', 'yn'],
    ['emplateflg', 'yn'],
    ['empnsatlflg', 'yn'],
];
// Treat missing, null and empty-text values as blank.
const isBlank = (v: unknown): boolean => {
    return v === undefined || v === null || v === '';
};
// Return cleaned employee data plus all validation messages.
export function validateEmployee(body: Record<string, unknown>, partial: boolean): {
    errors: string[];
    data: EmployeeInput;
} {
    const errors: string[] = [];
    // values are checked one by one below, so a loose record is fine while we fill it
    const data: Record<string, unknown> = {};
    // Require a name on creation; updates check only fields that were sent.
    if (!partial) {
        if (isBlank(body.empnam) || !String(body.empnam).trim()) {
            errors.push('empnam is required');
        }
    }
    // Check each allowed field present in the request body.
    for (const [name, kind, max] of SPEC) {
        if (!(name in body)) {
            continue;
        } // not sent -> leave as is (update) / DB default (create)
        const v = body[name];
        switch (kind) {
            // Accept whole numbers; intn fields may be blank and become null.
            case 'int':
            case 'intn': {
                if (isBlank(v)) {
                    if (kind === 'intn') {
                        data[name] = null;
                    }
                    else {
                        errors.push(`${name} must be an integer number`);
                    }
                    break;
                }
                const n = Number(v);
                if (!Number.isInteger(n)) {
                    errors.push(`${name} must be an integer number`);
                }
                else {
                    data[name] = n;
                }
                break;
            }
            // Convert decimals to numbers; treat blanks as zero.
            case 'float': {
                if (isBlank(v)) {
                    data[name] = 0;
                    break;
                }
                const n = Number(v);
                if (Number.isNaN(n)) {
                    errors.push(`${name} must be a number`);
                }
                else {
                    data[name] = n;
                }
                break;
            }
            // Accept YYYY-MM-DD date text, or null for a blank date.
            case 'date': {
                if (isBlank(v)) {
                    data[name] = null;
                    break;
                }
                if (!/^\d{4}-\d{2}-\d{2}$/.test(String(v))) {
                    errors.push(`${name} must be a date (YYYY-MM-DD)`);
                }
                else {
                    data[name] = String(v);
                }
                break;
            }
            // Accept only uppercase Yes/No flags Y or N.
            case 'yn':
                if (v !== 'Y' && v !== 'N') {
                    errors.push(`${name} must be Y or N`);
                }
                else {
                    data[name] = v;
                }
                break;
            // Accept Wages, Executive or Staff category codes only.
            case 'cat':
                if (v !== 'W' && v !== 'E' && v !== 'S') {
                    errors.push(`${name} must be W, E or S`);
                }
                else {
                    data[name] = v;
                }
                break;
            // Accept stored gender codes M or F only.
            case 'mf':
                if (v !== 'M' && v !== 'F') {
                    errors.push(`${name} must be M or F`);
                }
                else {
                    data[name] = v;
                }
                break;
            // Trim text, check lengths and validate names and email addresses.
            case 'str': {
                let s;
                if (isBlank(v)) {
                    s = '';
                }
                else {
                    s = String(v).trim();
                }
                if (max && s.length > max) {
                    errors.push(`${name} must be at most ${max} characters`);
                }
                else if (name === 'empnam' && !s) {
                    errors.push('empnam should not be empty');
                }
                else if (name === 'empemail' && s && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)) {
                    errors.push('empemail must be an email');
                }
                else {
                    data[name] = s;
                }
                break;
            }
        }
    }
    // Remove duplicate messages and return cleaned, allowed fields.
    return { errors: Array.from(new Set(errors)), data: data as EmployeeInput };
}
