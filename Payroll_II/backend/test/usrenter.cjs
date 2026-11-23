// Test the User Rights API with mocked SQL and a temporary local server.
const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const { once } = require('node:events');
const administration = require('../dist/routes/administration').default;
const { pool } = require('../dist/lib/db');

// Use one Single and one Multi program to test permission rules.
const programs = [{ prgsno: 21, prglvl: 'S' }, { prgsno: 22, prglvl: 'M' }];
// Build a valid example request that each test can modify.
const body = () => ({ usrusdsno: '7', modopt: 'S', smodopt: 'S', modsno: '32', submodsno: '33', save: true,
    hcount: 2, prgsno: [21, 22], usryn: ['y', 'y'], usraddyn: ['y', 'y'], usrameyn: ['y', 'n'], usrdelyn: ['y', 'y'] });

// Build a temporary test API with mocked SQL instead of real database writes.
async function fixture(context, options = {}) {
    const calls = [];
    let released = false;
    // Replace database lookups with predictable account and program results.
    context.mock.method(pool, 'query', async (sql, values) => {
        calls.push({ sql, values });
        if (sql.includes('usdactive')) return { rows: [{ usdactive: 'Y', usdadmin: options.admin !== false }] };
        if (sql.includes('FROM usdmast')) return { rows: [{ usdsno: 7, usdusd: 'USER7', usdnam: 'Test user' }] };
        return { rows: programs };
    });
    // Simulate transactions, connection release and optional write failures.
    context.mock.method(pool, 'connect', async () => ({
        async query(sql, values) {
            calls.push({ sql, values });
            if (sql.includes('FOR UPDATE')) return { rowCount: 1, rows: [{}] };
            if (sql.startsWith('SELECT p.*')) return { rows: options.programs ?? programs };
            if (sql.startsWith('INSERT') && options.failSave) throw new Error('Database write failed');
            return { rowCount: 1, rows: [] };
        },
        release() { released = true; },
    }));
    // Start a local test API with a fake signed-in administrator.
    const app = express();
    app.use(express.json());
    app.use((req, _res, next) => { req.user = { sub: 1, usr: 'ADMIN' }; next(); });
    app.use('/administration', administration);
    app.use((error, _req, res, _next) => res.status(error.status ?? 500).json({ message: error.message }));
    const server = app.listen(0, '127.0.0.1');
    await once(server, 'listening');
    // Close the temporary server after each test.
    context.after(() => new Promise(resolve => server.close(resolve)));
    return {
        calls, released: () => released,
        // Send a test GET or POST and return its status and parsed JSON.
        async send(payload, query = '') {
            const response = await fetch(`http://127.0.0.1:${server.address().port}/administration/usrenter${query}`, payload ?
                { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) } : {});
            return { status: response.status, data: await response.json() };
        },
    };
}

// Test: ordinary users cannot check or change user rights through direct API calls.
test('ordinary users cannot check or change user rights through direct API calls', async context => {
    const api = await fixture(context, { admin: false });
    assert.equal((await api.send(body())).status, 403);
    assert.equal((await api.send(null, '?usrusdsno=7&modopt=A&smodopt=A')).status, 403);
    assert.equal(api.calls.some(call => call.sql === 'BEGIN'), false);
});
// Test: CHECK retains original field names and selected module/submodule scope.
test('CHECK retains original field names and selected module/submodule scope', async context => {
    const api = await fixture(context);
    const result = await api.send(null, '?usrusdsno=7&modopt=S&smodopt=S&modsno=32&submodsno=33');
    assert.equal(result.status, 200);
    assert.equal(result.data.usrusdsnoauto, 'USER7');
    assert.deepEqual(result.data.rows, programs);
    assert.deepEqual(api.calls.at(-1).values, [7, 32, 33]);
});
// Test: SAVE applies single/multiple program rules and retains hidden legacy fields.
test('SAVE applies single/multiple program rules and retains hidden legacy fields', async context => {
    const api = await fixture(context);
    assert.equal((await api.send(body())).status, 200);
    const inserts = api.calls.filter(call => call.sql.startsWith('INSERT'));
    assert.deepEqual(inserts.map(call => call.values), [[7, 21, 'y', 'n', 'n', 'n', 'ADMIN'], [7, 22, 'n', 'y', 'n', 'y', 'ADMIN']]);
    assert.ok(inserts.every(call => !/usrdisyn|usrupdyn|usrvssyn/.test(call.sql)));
    assert.equal(api.calls.at(-1).sql, 'COMMIT');
    assert.equal(api.released(), true);
});
// Test: changed or forged program scope rolls back before any permission writes.
test('changed or forged program scope rolls back before any permission writes', async context => {
    const api = await fixture(context, { programs: [programs[0], { prgsno: 99, prglvl: 'M' }] });
    assert.equal((await api.send(body())).status, 400);
    assert.equal(api.calls.some(call => call.sql.startsWith('INSERT') || call.sql.startsWith('DELETE')), false);
    assert.equal(api.calls.at(-1).sql, 'ROLLBACK');
    assert.equal(api.released(), true);
});
// Test: DELETE uses the checked user and scope without reinserting rights.
test('DELETE uses the checked user and scope without reinserting rights', async context => {
    const api = await fixture(context);
    assert.equal((await api.send({ ...body(), save: false, delete: true })).status, 200);
    const deletion = api.calls.find(call => call.sql.startsWith('DELETE'));
    assert.deepEqual(deletion.values, [7, 32, 33]);
    assert.match(deletion.sql, /r\.usrusdsno=\$1/);
    assert.match(deletion.sql, /p\.prgmodsno=\$2/);
    assert.match(deletion.sql, /p\.prgsmdsno=\$3/);
    assert.equal(api.calls.some(call => call.sql.startsWith('INSERT')), false);
});
// Test: All module/submodule ignores stale select values and checks the whole catalog.
test('All module/submodule ignores stale select values and checks the whole catalog', async context => {
    const api = await fixture(context);
    assert.equal((await api.send(null, '?usrusdsno=7&modopt=A&smodopt=A&modsno=invalid&submodsno=invalid')).status, 200);
    assert.deepEqual(api.calls.at(-1).values, [7, null, null]);
    assert.equal((await api.send({ ...body(), modopt: 'A', smodopt: 'A', save: false, delete: true })).status, 200);
    assert.deepEqual(api.calls.find(call => call.sql.startsWith('DELETE')).values, [7, null, null]);
});
// Test: invalid flags and duplicate programs are rejected without starting a transaction.
test('invalid flags and duplicate programs are rejected without starting a transaction', async context => {
    const api = await fixture(context);
    for (const invalid of [{ ...body(), usryn: ['y', 'yes'] }, { ...body(), prgsno: [21, 21] }, { ...body(), hcount: 1 }, { ...body(), modsno: '' }, { ...body(), delete: true }]) {
        assert.equal((await api.send(invalid)).status, 400);
    }
    assert.equal(api.calls.some(call => call.sql === 'BEGIN'), false);
});
// Test: failed permission writes roll back and release the database connection.
test('failed permission writes roll back and release the database connection', async context => {
    const api = await fixture(context, { failSave: true });
    assert.equal((await api.send(body())).status, 500);
    assert.equal(api.calls.at(-1).sql, 'ROLLBACK');
    assert.equal(api.released(), true);
});
