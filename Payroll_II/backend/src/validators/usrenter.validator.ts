// Check the selected user, module scope, action and permission arrays.
import { fail } from '../lib/errors';
import { integer } from './administration.validator';

// Use these names for each program's y/n permission arrays.
export const usrFlags = [
    'usryn', 
    'usraddyn', 
    'usrameyn', 
    'usrdelyn'
] as const;

// Keep incoming values unknown until they pass validation.
type UsrInput = Record<string, unknown>;

// Describe a checked user with optional module/submodule IDs.
export type UsrScope = {
    usrusdsno: number;
    modopt: 'A' | 'S';
    smodopt: 'A' | 'S';
    modsno: number | null;
    submodsno: number | null;
};

// Validate user + module/submodule selection (All / Select)
export function usrScope(input: UsrInput): UsrScope {
    // Require A for All or S for Select on both filters.
    const { modopt, smodopt } = input;
    if ((modopt !== 'A' && modopt !== 'S') || (smodopt !== 'A' && smodopt !== 'S')) {
        fail('Choose All or Select for module and submodule');
    }
    return {
        usrusdsno: integer(input.usrusdsno, 'User'),
        modopt,
        smodopt,
        modsno: modopt === 'S' ? integer(input.modsno, 'Module') : null,
        submodsno: smodopt === 'S' ? integer(input.submodsno, 'Submodule') : null,
    };
}

// Validate the program list and the y/n flags posted from the screen
export function usrRows(input: UsrInput): { prgsno: number; values: string[] }[] {
    // Require a program list with no more than 10,000 items.
    if (!Array.isArray(input.prgsno) || input.prgsno.length > 10000) {
        fail('Invalid program list');
    }
    const ids = input.prgsno.map((value) => integer(value, 'Program'));
    // Reject repeated program IDs.
    if (new Set(ids).size !== ids.length) {
        fail('Duplicate programs');
    }
    // Reject a row count that does not match the submitted list.
    if (input.hcount !== ids.length) {
        fail('Program count changed; CHECK again');
    }
    // Require one lowercase y/n value per program for each permission.
    for (const flag of usrFlags) {
        const values = input[flag];
        if (!Array.isArray(values) || values.length !== ids.length || values.some((v) => v !== 'y' && v !== 'n')) {
            fail('Rights must be y or n for each program');
        }
    }
    // Pair each program ID with its four validated permission values.
    return ids.map((prgsno, index) => ({
        prgsno,
        values: usrFlags.map((flag) => (input[flag] as string[])[index])
    }));
}

// SAVE or DELETE must be chosen (exactly one)
export function usrAction(input: UsrInput): 'save' | 'delete' {
    // Reject requests selecting both SAVE and DELETE, or neither.
    if ((input.save === true) === (input.delete === true)) {
        fail('Choose SAVE or DELETE');
    }
    return input.delete === true ? 'delete' : 'save';
}
