import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { verifyToken } from './lib/auth';
import type { TokenPayload } from './types';

// Extend Express Request object to include authenticated user
declare module 'express-serve-static-core' {
    interface Request {
        user?: TokenPayload;
    }
}

// Check the signed login token sent in the Authorization header.
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
    const header = req.headers.authorization;
    let user: TokenPayload | null = null;

    // Remove the Bearer prefix and check the token signature and expiry.
    if (header && header.startsWith('Bearer ')) {
        user = verifyToken(header.slice(7));
    }

    // Stop with 401 when no valid login token was provided.
    if (!user) {
        res.status(401).json({ message: 'Unauthorized' });
        return;
    }

    // Attach the verified user to the request and continue to the next check.
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
        res.status(400).json({ message: 'Invalid JSON body' });
        return;
    }

    console.error(err);
    res.status(500).json({ message: 'Server error' });
}
