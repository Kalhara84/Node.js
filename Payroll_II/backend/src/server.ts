import app from './app';
import { checkDatabaseConnection, pool } from './lib/db';

const started = performance.now();

const color = (code: number, text: string): string => process.stdout.isTTY && !process.env.NO_COLOR
    ? `\x1b[${code}m${text}\x1b[0m` : text;

const errorMessage = (error: unknown): string => (error instanceof Error ? error.message : 'Unknown error')
    .replace(/[\x00-\x1f\x7f-\x9f]/g, ' ');

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
        console.log(`\n  ${color(32, 'PAYROLL API')}  ready in ${Math.round(performance.now() - started)} ms\n`);
        console.log(`  ${color(32, '➜')}  Local:    ${color(36, `http://localhost:${actualPort}/`)}`);
        console.log(`  ${color(32, '✓')}  Database: ${color(32, 'connected')}\n`);
    });

    server.on('error', (error) => {
        console.error(`  ${color(31, '✗')} HTTP server failed: ${errorMessage(error)}`);
        void pool.end().finally(() => {
            process.exitCode = 1;
        });
    });
}

void start().catch(async (error) => {
    console.error(`\n  ${color(31, '✗')} Database connection failed: ${errorMessage(error)}\n`);
    await pool.end();
    process.exitCode = 1;
});
