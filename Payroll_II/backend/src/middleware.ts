import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { verifyToken } from './lib/auth';
import type { TokenPayload } from './types';

// tell TypeScript that req.user exists after requireAuth
declare module 'express-serve-static-core' {
  interface Request {
    user?: TokenPayload;
  }
}

/** protects a route: no valid "Authorization: Bearer <token>" -> 401 */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  let user: TokenPayload | null = null;
  if (header && header.startsWith('Bearer ')) {
    user = verifyToken(header.slice(7));
  }
  if (!user) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }
  req.user = user;
  next();
}

/** wraps an async controller so errors go to the error handler */
export function wrap(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown> | unknown,
): RequestHandler {
  return (req, res, next) => {
    Promise.resolve().then(() => fn(req, res, next)).catch(next);
  };
}

export function notFound(_req: Request, res: Response): void {
  res.status(404).json({ message: 'Not found' });
}

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
  if ((err as { type?: string })?.type === 'entity.parse.failed') {
    res.status(400).json({ message: 'Invalid JSON body' });
    return;
  }
  console.error(err);
  res.status(500).json({ message: 'Server error' });
}
