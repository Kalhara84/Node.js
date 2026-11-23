import { randomUUID } from 'node:crypto';
import type { RequestHandler } from 'express';
import { log } from './lib/logger';

// Log transfer metadata, never passwords, tokens, or payroll payloads.
export const requestLogger: RequestHandler = (req, res, next) => {
    const started = performance.now();
    const requestId = randomUUID();
    const context = { requestId, method: req.method, path: req.path };
    res.locals.requestId = requestId;
    res.setHeader('X-Request-ID', requestId);
    log('info', 'API request received', { ...context, requestBytes: req.headers['content-length'] ?? null });

    let completed = false;
    res.once('finish', () => {
        completed = true;
        const status = res.statusCode;
        log(status >= 500 ? 'error' : status >= 400 ? 'warn' : 'info', 'API response sent', {
            ...context, status, durationMs: Math.round(performance.now() - started),
            responseBytes: res.getHeader('content-length') ?? null,
        });
    });
    res.once('close', () => {
        if (!completed) log('warn', 'API connection closed before response completed', context);
    });
    next();
};
