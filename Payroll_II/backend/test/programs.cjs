const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const { once } = require('node:events');
const programRouter = require('../dist/routes/program').default;
const { pool } = require('../dist/lib/db');

// Use a valid Program Master form; tests change individual fields as needed.
const form = () => ({ prgmodsno: '32', prgsmdsno: '33', prgorder: ' 01 ', prglvl: 'M', prgnam: ' employees ', prgdes: ' Example program ' });
const program = { prgsno: 21, prgnam: 'employees', module: 'Program', submodule: 'Setup' };

// Exercise the real routes with simulated SQL; do not write to a real database.
async function fixture(context, options = {}) {
    const calls = [];
    let released = false;
    context.mock.method(pool, 'query', async (sql, values) => {
        const text = sql.trim();
        calls.push({ sql: text, values });
        if (text.startsWith('SELECT syssno FROM a_sysmast')) return { rows: [], rowCount: options.invalidScope ? 1 : 2 };
        if (text.includes('sysrtp=32')) return { rows: [{ syssno: 32, sysdes: 'Program' }] };
        if (text.includes('sysrtp=33')) return { rows: [{ syssno: 33, sysdes: 'Setup' }] };
        if (text.includes('FROM s_locmast')) return { rows: [{ locsno: 1, locnam: 'Main' }] };
        if (text.startsWith('INSERT') && options.duplicate) throw Object.assign(new Error('duplicate'), { code: '23505' });
        if (text.startsWith('INSERT INTO a_sysmast')) return { rows: [{ syssno: 40 }] };
        if (text.startsWith('UPDATE') && options.missing) return { rows: [] };
        return { rows: [program] };
    });
    context.mock.method(pool, 'connect', async () => ({
        async query(sql, values) {
            calls.push({ sql, values });
            if (sql.startsWith('DELETE FROM prgmast') && options.failDelete) throw new Error('Database write failed');
            return { rows: [], rowCount: options.missing ? 0 : 1 };
        },
        release() { released = true; }
    }));

    const app = express();
    app.use(express.json());
    app.use((req, res, next) => {
        req.user = { sub: 1, usr: 'SIGNED_IN_USER' };
        const allowed = { view: true, add: true, amend: true, delete: true };
        const denied = { view: false, add: false, amend: false, delete: false };
        res.locals.access = { admin: false, programs: options.programAccess ?? allowed, users: allowed, rights: denied };
        next();
    });
    app.use('/api/program', programRouter);
    app.use((error, _req, res, _next) => res.status(error.status ?? 500).json({ message: error.message }));
    const server = app.listen(0, '127.0.0.1');
    await once(server, 'listening');
    context.after(() => new Promise(resolve => server.close(resolve)));
    return {
        calls,
        released: () => released,
        async send(path, method = 'GET', body) {
            const response = await fetch(`http://127.0.0.1:${server.address().port}/api/program${path}`, {
                method,
                headers: { 'Content-Type': 'application/json' },
                ...(body === undefined ? {} : { body: JSON.stringify(body) })
            });
            return { status: response.status, data: await response.json() };
        }
    };
}

// Listing must still return the joined program rows expected by the screen.
test('Program Master lists programs at the existing route', async context => {
    const api = await fixture(context);
    const result = await api.send('/programs');
    assert.equal(result.status, 200);
    assert.deepEqual(result.data, [program]);
    assert.match(api.calls[0].sql, /LEFT JOIN a_sysmast/);
});

// Shared dropdown loading must continue working with User Master permission alone.
test('User Master can still load the shared program dropdowns', async context => {
    const api = await fixture(context, { programAccess: { view: false, add: false, amend: false, delete: false } });
    const result = await api.send('/lookups');
    assert.equal(result.status, 200);
    assert.deepEqual({ modules: result.data.modules, submodules: result.data.submodules, locations: result.data.locations }, {
        modules: [{ syssno: 32, sysdes: 'Program' }],
        submodules: [{ syssno: 33, sysdes: 'Setup' }],
        locations: [{ locsno: 1, locnam: 'Main' }]
    });
});

// The signed-in identity, rather than form input, supplies the audit username.
test('creating a program trims fields and uses parameterized values and signed-in audit details', async context => {
    const api = await fixture(context);
    const result = await api.send('/programs', 'POST', { ...form(), prgdes: " x'); DROP TABLE prgmast;-- ", prgucdnew: 'FORGED' });
    assert.equal(result.status, 201);
    assert.deepEqual(result.data, program);
    const insert = api.calls.find(call => call.sql.startsWith('INSERT'));
    assert.deepEqual(insert.values, [32, 33, '01', 'M', 'employees', "x'); DROP TABLE prgmast;--", 'SIGNED_IN_USER']);
    assert.equal(insert.sql.includes('DROP TABLE'), false);
});

// Invalid form values must stop before a program can be inserted.
test('invalid program fields and IDs are rejected before writes', async context => {
    const api = await fixture(context);
    for (const changes of [
        { prgmodsno: '' }, { prgmodsno: 1.5 }, { prgsmdsno: 2147483648 },
        { prglvl: 'X' }, { prgorder: '123456' }, { prgnam: ' ' },
        { prgnam: 42 }, { prgnam: 'bad.key' }, { prgnam: 'admin' },
        { prgnam: '__proto__' }, { prgnam: 'x'.repeat(36) }, { prgdes: 'x'.repeat(61) }
    ]) {
        assert.equal((await api.send('/programs', 'POST', { ...form(), ...changes })).status, 400);
    }
    assert.equal((await api.send('/programs/invalid', 'PUT', form())).status, 400);
    assert.equal((await api.send('/programs/0', 'DELETE')).status, 400);
    assert.equal(api.calls.length, 0);
});

// A deleted or incorrectly selected module must not allow a program save.
test('missing module or submodule returns the existing validation message', async context => {
    const api = await fixture(context, { invalidScope: true });
    const result = await api.send('/programs', 'POST', form());
    assert.equal(result.status, 400);
    assert.equal(result.data.message, 'Choose a valid module and submodule');
    assert.equal(api.calls.some(call => call.sql.startsWith('INSERT')), false);
});

// Updating must preserve the existing response and target only the URL ID.
test('updating a program uses the URL ID and signed-in audit details', async context => {
    const api = await fixture(context);
    assert.equal((await api.send('/programs/21', 'PUT', form())).status, 200);
    const update = api.calls.find(call => call.sql.startsWith('UPDATE'));
    assert.deepEqual(update.values, [32, 33, '01', 'M', 'employees', 'Example program', 'SIGNED_IN_USER', 21]);
});

test('updating a missing program returns 404', async context => {
    const api = await fixture(context, { missing: true });
    assert.deepEqual(await api.send('/programs/999', 'PUT', form()), { status: 404, data: { message: 'Program not found' } });
});

// Future pages use a new key without extending a hardcoded page list.
test('new page keys can be registered and updated', async context => {
    const api = await fixture(context);
    for (const [method, path, key] of [
        ['POST', '/programs', 'attendance'], ['PUT', '/programs/21', 'leave_requests']
    ]) {
        const result = await api.send(path, method, { ...form(), prgnam: key });
        assert.equal(result.status, method === 'POST' ? 201 : 200);
        const write = api.calls.findLast(call => call.sql.startsWith(method === 'POST' ? 'INSERT' : 'UPDATE'));
        assert.equal(write.values[4], key);
    }
});

// Program deletion must also remove assigned rights in the same transaction.
test('program deletion locks, removes rights, commits and releases its connection', async context => {
    const api = await fixture(context);
    assert.deepEqual(await api.send('/programs/21', 'DELETE'), { status: 200, data: { message: 'Program deleted' } });
    assert.deepEqual(api.calls.map(call => call.sql), [
        'BEGIN', 'LOCK TABLE prgmast IN SHARE ROW EXCLUSIVE MODE',
        "SELECT prgsno FROM prgmast WHERE prgsno=$1 AND prgapp='payroll-web'",
        'DELETE FROM usrmast WHERE usrprgsno=$1', "DELETE FROM prgmast WHERE prgsno=$1 AND prgapp='payroll-web'", 'COMMIT'
    ]);
    assert.deepEqual(api.calls[2].values, [21]);
    assert.deepEqual(api.calls[3].values, [21]);
    assert.equal(api.released(), true);
});

// Undo the rights deletion if removing the program fails, and release the connection.
test('failed program deletion rolls back and releases its connection', async context => {
    const api = await fixture(context, { failDelete: true });
    assert.equal((await api.send('/programs/21', 'DELETE')).status, 500);
    assert.equal(api.calls.at(-1).sql, 'ROLLBACK');
    assert.equal(api.calls.some(call => call.sql === 'COMMIT'), false);
    assert.equal(api.released(), true);
});

test('deleting a missing program returns 404 and releases its connection', async context => {
    const api = await fixture(context, { missing: true });
    assert.deepEqual(await api.send('/programs/999', 'DELETE'), { status: 404, data: { message: 'Program not found' } });
    assert.equal(api.released(), true);
});

// Keep module/submodule creation validation and duplicate handling in the controller.
test('module creation validates input and trims values', async context => {
    const api = await fixture(context);
    assert.equal((await api.send('/lookups', 'POST', { sysrtp: 99, sysrno: 'A', sysdes: 'Module' })).status, 400);
    assert.equal(api.calls.length, 0);
    assert.deepEqual(await api.send('/lookups', 'POST', { sysrtp: '32', sysrno: ' A ', sysdes: ' Module ' }), { status: 201, data: { syssno: 40 } });
    assert.deepEqual(api.calls[0].values, [32, 'A', 'Module']);
});

test('duplicate program codes retain the HTTP 409 response', async context => {
    const api = await fixture(context, { duplicate: true });
    const result = await api.send('/programs', 'POST', form());
    assert.equal(result.status, 409);
    assert.equal(result.data.message, 'This code or module/submodule/order already exists');
});

// Moving SQL must not bypass the existing route-level action checks.
test('view-only Program Master access cannot create, change or delete programs', async context => {
    const api = await fixture(context, { programAccess: { view: true, add: false, amend: false, delete: false } });
    for (const [path, method, body] of [
        ['/programs', 'POST', form()], ['/programs/21', 'PUT', form()],
        ['/programs/21', 'DELETE'], ['/lookups', 'POST', { sysrtp: 32, sysrno: 'A', sysdes: 'Module' }]
    ]) {
        assert.equal((await api.send(path, method, body)).status, 403);
    }
    assert.equal(api.calls.length, 0);
});
