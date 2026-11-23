import app from './app';
import { checkDatabaseConnection, pool } from './lib/db';
import { errorDetails, log } from './lib/logger';

// Default port number
let port = 3001;

// Use PORT from environment if specified
if (process.env.PORT && process.env.PORT.trim() !== '') {
    port = Number(process.env.PORT);
}

// Validate port range
if (!Number.isInteger(port) || port < 0 || port >= 65536) {
    throw new Error('PORT must be a whole number between 0 and 65535.');
}

async function start(): Promise<void> {
    await checkDatabaseConnection();
    const server = app.listen(port, () => {
        const address = server.address();
        const actualPort = typeof address === 'object' && address ? address.port : port;
        log('info', 'Payroll API running', { url: `http://localhost:${actualPort}` });
    });
    server.on('error', (error) => {
        log('error', 'HTTP server failed', errorDetails(error));
        void pool.end().finally(() => { process.exitCode = 1; });
    });
}

void start().catch(async (error) => {
    log('error', 'Backend startup failed', errorDetails(error));
    await pool.end();
    process.exitCode = 1;
});
