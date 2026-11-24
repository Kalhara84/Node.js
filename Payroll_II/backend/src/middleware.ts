import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { verifyToken } from './lib/auth';
import type { TokenPayload } from './types';
import { randomUUID } from 'node:crypto';

const methodColors: Record<string, number> = {
    GET: 32, 
    POST: 33, 
    PUT: 34, 
    PATCH: 35, 
    DELETE: 31, 
    OPTIONS: 36, 
    HEAD: 90,
};

// Keep each completed request on one line without logging private payloads.
export const requestLogger: RequestHandler = (req, res, next) => {
    const started = performance.now();
    const path = req.path.replace(/[\x00-\x1f\x7f-\x9f]/g, '');
    res.setHeader('X-Request-ID', randomUUID());
    let completed = false;
    
    const print = (aborted = false): void => {
        const time = new Date().toLocaleTimeString('en-GB', { hour12: false });
        const status = aborted ? 'ABORTED' : res.statusCode;
        const error = res.locals.logError ? ` | ${res.locals.logError}` : '';
        const output = aborted || res.statusCode >= 400 ? process.stderr : process.stdout;
        
        const method = output.isTTY && process.env.NO_COLOR === undefined
            ? `\x1b[${methodColors[req.method] ?? 37}m${req.method}\x1b[0m`
            : req.method;
        const line = `  ${time}  ${method}${' '.repeat(Math.max(0, 7 - req.method.length))} ${path}  ${status}  ${Math.round(performance.now() - started)} ms  ${res.getHeader('content-length') ?? 0} B${error}`;
        
        if (aborted || res.statusCode >= 500) {
            console.error(line);
        }
        else if (res.statusCode >= 400) {
            console.warn(line);
        }
        else {
            console.log(line);
        }
    };
    res.once('finish', () => {
        completed = true;
        print();
    });
    res.once('close', () => {
        if (!completed) {
            print(true);
        }
    });
    next();
};

// Extend Express Request object to include authenticated user
declare module 'express-serve-static-core' {
    interface Request {
        user?: TokenPayload;
    }
}

// Authentication middleware: validates Bearer JWT token in Authorization header
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
    const header = req.headers.authorization;
    let user: TokenPayload | null = null;

    if (header && header.startsWith('Bearer ')) {
        user = verifyToken(header.slice(7));
    }

    if (!user) {
        res.status(401).json(
            { message: 'Unauthorized' }
        );

        return;
    }

    req.user = user;
    next();
}

// Async error handler wrapper for Express route controllers
export function wrap(fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown> | unknown): RequestHandler {
    return async (req, res, next) => {
        try {
            await fn(req, res, next);
        } catch (error) {
            next(error);
        }
    };
}

// 404 Not Found route handler
export function notFound(_req: Request, res: Response): void {
    res.status(404).json({ message: 'Not found' });
}

// Global server error handler middleware
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
    if ((err as { type?: string })?.type === 'entity.parse.failed') {
        res.locals.logError = 'Invalid JSON body';
        
        res.status(400).json(
            { message: 'Invalid JSON body' }
        );

        return;
    }

    res.locals.logError = (err instanceof Error ? err.message : 'Unknown error').replace(/[\x00-\x1f\x7f-\x9f]/g, ' ');
    if (res.headersSent) {
        return _next(err);
    }

    res.status(500).json(
        { message: 'Server error' }
    );
}
