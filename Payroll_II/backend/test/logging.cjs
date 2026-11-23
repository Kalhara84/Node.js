const { test } = require('node:test');
const assert = require('node:assert/strict');
const app = require('../dist/app').default;
const { pool, checkDatabaseConnection } = require('../dist/lib/db');

test('logs API transfers, malformed JSON and database connectivity without request secrets', async () => {
    const entries = [];
    const originals = { info: console.info, warn: console.warn, error: console.error };
    const query = pool.query;
    let server;
    try {
        for (const level of Object.keys(originals)) console[level] = (line) => entries.push(JSON.parse(line));
        server = app.listen(0);
        await new Promise(resolve => server.once('listening', resolve));
        const base = `http://localhost:${server.address().port}`;
        const ok = await fetch(base + '/');
        assert.equal(ok.status, 200);
        assert.ok(ok.headers.get('x-request-id'));
        await ok.text();
        const bad = await fetch(base + '/api/auth/login?token=secret-query', {
            method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer secret-token' },
            body: '{"password":"secret-password",bad}',
        });
        assert.equal(bad.status, 400);
        await bad.text();
        assert.ok(entries.some(e => e.event === 'API response sent' && e.status === 200));
        assert.ok(entries.some(e => e.event === 'API response sent' && e.status === 400));
        assert.ok(entries.some(e => e.event === 'Invalid JSON body'));
        assert.ok(!JSON.stringify(entries).includes('secret-'));
        pool.query = async () => ({ rows: [{ '?column?': 1 }] });
        await checkDatabaseConnection();
        assert.ok(entries.some(e => e.event === 'Database connected'));
        pool.query = async () => { throw Object.assign(new Error('Connection refused'), { code: 'ECONNREFUSED' }); };
        await assert.rejects(checkDatabaseConnection(), /Connection refused/);
        assert.ok(entries.some(e => e.event === 'Database connection failed' && e.code === 'ECONNREFUSED'));
    } finally {
        Object.assign(console, originals);
        pool.query = query;
        if (server) {
            server.closeAllConnections();
            await new Promise(resolve => server.close(resolve));
        }
        await pool.end();
    }
});
