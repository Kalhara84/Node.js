import type { NextFunction, Request, Response } from 'express';
import { hashPassword } from '../lib/auth';
import { fail } from '../lib/errors';
import { AdministrationModel } from '../models/administration.model';
import {
    integer,
    validateLookup,
    validateProgram,
    validateRights,
    validateUser
} from '../validators/administration.validator';

// Request body as a plain object (empty object when missing)
const bodyOf = (req: Request): Record<string, unknown> => req.body ?? {};

// Check that the program's module and submodule really exist
async function checkProgramScope(module: number, submodule: number): Promise<void> {
    if (!(await AdministrationModel.moduleAndSubmoduleExist(module, submodule))) {
        fail('Choose a valid module and submodule');
    }
}

export const AdministrationController = {
    // Verify that the current user is active and has administrator rights
    async requireAdmin(req: Request, res: Response, next: NextFunction): Promise<void> {
        const u = await AdministrationModel.accountStatus(req.user!.sub);
        if (!u || u.usdactive !== 'Y') {
            res.status(401).json({ message: 'Account is inactive' });
            return;
        }
        if (!u.usdadmin) {
            res.status(403).json({ message: 'Administrator access required' });
            return;
        }
        next();
    },

    // Route-specific error handler (validation errors and unique constraint violations)
    handleError(err: unknown, _req: Request, res: Response, next: NextFunction): void {
        const e = err as { status?: number; code?: string; message?: string };
        if (e.status === 400) {
            res.status(400).json({ message: e.message });
            return;
        }
        if (e.code === '23505') {
            res.status(409).json({ message: 'This code or module/submodule/order already exists' });
            return;
        }
        next(err);
    },

    // ---------- Lookups ----------

    // Get administration lookup masters (modules, submodules, locations)
    async lookups(_req: Request, res: Response): Promise<void> {
        res.json(await AdministrationModel.lookups());
    },

    // Add new lookup record (module or submodule)
    async addLookup(req: Request, res: Response): Promise<void> {
        const { type, code, description } = validateLookup(bodyOf(req));
        res.status(201).json(await AdministrationModel.createLookup(type, code, description));
    },

    // ---------- Programs ----------

    // List all programs
    async programs(_req: Request, res: Response): Promise<void> {
        res.json(await AdministrationModel.programs());
    },

    // Create a new program
    async createProgram(req: Request, res: Response): Promise<void> {
        const { module, submodule, values } = validateProgram(bodyOf(req));
        await checkProgramScope(module, submodule);
        res.status(201).json(await AdministrationModel.createProgram(values, req.user!.usr));
    },

    // Update existing program
    async updateProgram(req: Request, res: Response): Promise<void> {
        const id = integer(req.params.id, 'Program');
        const { module, submodule, values } = validateProgram(bodyOf(req));
        await checkProgramScope(module, submodule);

        const program = await AdministrationModel.updateProgram(id, values, req.user!.usr);
        res.status(program ? 200 : 404).json(program ?? { message: 'Program not found' });
    },

    // Delete program and all assigned user rights
    async deleteProgram(req: Request, res: Response): Promise<void> {
        const id = integer(req.params.id, 'Program');
        const deleted = await AdministrationModel.deleteProgram(id);
        res.status(deleted ? 200 : 404).json({ message: deleted ? 'Program deleted' : 'Program not found' });
    },

    // ---------- Users ----------

    // List application users
    async users(_req: Request, res: Response): Promise<void> {
        res.json(await AdministrationModel.users());
    },

    // Create new user account
    async createUser(req: Request, res: Response): Promise<void> {
        const { data, password } = validateUser(bodyOf(req), true);
        if (data.usdcomsno && !(await AdministrationModel.locationExists(data.usdcomsno))) {
            fail('Invalid location');
        }
        if (password) data.usdpwd = hashPassword(password);

        res.status(201).json(await AdministrationModel.createUser(data, req.user!.usr));
    },

    // Update user account details
    async updateUser(req: Request, res: Response): Promise<void> {
        const id = integer(req.params.id, 'User');
        const { data, password } = validateUser(bodyOf(req), false);
        if (data.usdcomsno && !(await AdministrationModel.locationExists(data.usdcomsno))) {
            fail('Invalid location');
        }
        if (password) data.usdpwd = hashPassword(password);

        if (data.usdactive === 'N' && (await AdministrationModel.isAdministrator(id))) {
            fail('Administrator accounts cannot be disabled here');
        }

        const user = await AdministrationModel.updateUser(id, data, req.user!.usr);
        res.status(user ? 200 : 404).json(user ?? { message: 'User not found' });
    },

    // ---------- User rights ----------

    // Get program rights assigned to a specific user
    async rights(req: Request, res: Response): Promise<void> {
        const id = integer(req.params.id, 'User');
        res.json(await AdministrationModel.rights(id));
    },

    // Update program rights for a user
    async saveRights(req: Request, res: Response): Promise<void> {
        const id = integer(req.params.id, 'User');
        const { rows, ids, clear } = validateRights(bodyOf(req));

        await AdministrationModel.saveRights(id, rows, ids, clear, req.user!.usr);
        res.json({ message: `${rows.length} program rights updated` });
    },
};
