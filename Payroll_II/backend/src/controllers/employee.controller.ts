import type { Request, Response } from 'express';
import { EmployeeModel } from '../models/employee.model';
import { LookupModel } from '../models/lookup.model';
import { validateEmployee } from '../validators/employee.validator';
import type { EmployeeInput } from '../types';

// Helper to return error responses cleanly
const fail = (res: Response, message: string | string[], status: number): void => {
    res.status(status).json({ message });
};

// Parse numeric ID from route parameters
function parseId(raw: string): number | null {
    const n = Number(raw);
    return Number.isInteger(n) && n > 0 ? n : null;
}

// Check if value is a non-null object
const isObject = (b: unknown): b is Record<string, unknown> => !!b && typeof b === 'object' && !Array.isArray(b);

// Validate unique employee number and unique map code
async function duplicateError(data: EmployeeInput, ignoreId?: number): Promise<string | null> {
    if (typeof data.empeno === 'number') {
        const f = await EmployeeModel.findByEmpNo(data.empeno);
        if (f && f.empsno !== ignoreId) {
            return `Employee No ${data.empeno} already exists`;
        }
    }
    if (typeof data.empmapcode === 'number' && data.empmapcode !== 0) {
        const f = await EmployeeModel.findByMapCode(data.empmapcode);
        if (f && f.empsno !== ignoreId) {
            return `Map Code ${data.empmapcode} already exists`;
        }
    }
    return null;
}

export const EmployeeController = {
    // Generate next available employee number
    async nextNumber(_req: Request, res: Response): Promise<void> {
        res.json(
            { empeno: await EmployeeModel.nextNumber() }
        );
    },

    // List employees with search filter and pagination
    async list(req: Request, res: Response): Promise<void> {
        const search = String(req.query.search || '').trim();
        const page = Math.max(1, parseInt(String(req.query.page), 10) || 1);
        const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit), 10) || 10));
        res.json(await EmployeeModel.list(search, page, limit));
    },

    // Fetch employee by primary key ID
    async get(req: Request, res: Response): Promise<void> {
        const n = parseId(req.params.id);
        if (!n) {
            return fail(res, 'Invalid id', 400);
        }

        const emp = await EmployeeModel.findById(n);
        if (!emp) {
            return fail(res, `Employee #${n} not found`, 404);
        }

        res.json(emp);
    },

    // Create a new employee
    async create(req: Request, res: Response): Promise<void> {
        if (!isObject(req.body)) {
            return fail(res, 'Invalid JSON body', 400);
        }

        const { errors, data } = validateEmployee(req.body, false);
        if (errors.length) {
            return fail(res, errors, 400);
        }

        const dup = await duplicateError(data);
        if (dup) {
            return fail(res, dup, 409);
        }

        const id = await EmployeeModel.create(data);
        res.status(201).json(await EmployeeModel.findById(id));
    },

    // Update existing employee
    async update(req: Request, res: Response): Promise<void> {
        const n = parseId(req.params.id);
        if (!n) {
            return fail(res, 'Invalid id', 400);
        }

        if (!(await EmployeeModel.findById(n))) {
            return fail(res, `Employee #${n} not found`, 404);
        }

        if (!isObject(req.body)) {
            return fail(res, 'Invalid JSON body', 400);
        }

        const { errors, data } = validateEmployee(req.body, true);
        if (errors.length) {
            return fail(res, errors, 400);
        }

        const dup = await duplicateError(data, n);
        if (dup) {
            return fail(res, dup, 409);
        }

        await EmployeeModel.update(n, data);
        res.json(await EmployeeModel.findById(n));
    },

    // Delete employee by ID
    async remove(req: Request, res: Response): Promise<void> {
        const n = parseId(req.params.id);
        if (!n) {
            return fail(res, 'Invalid id', 400);
        }

        const emp = await EmployeeModel.findById(n);
        if (!emp) {
            return fail(res, `Employee #${n} not found`, 404);
        }

        await EmployeeModel.remove(n);
        res.json(
            { message: `Employee ${emp.empeno} deleted` }
        );
    },
};

export const LookupController = {
    // Return all system dropdown lookup tables
    async all(_req: Request, res: Response): Promise<void> {
        res.json(await LookupModel.all());
    },
};
