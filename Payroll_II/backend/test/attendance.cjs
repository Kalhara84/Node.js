const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const { once } = require('node:events');
const router = require('../dist/routes/attendance').default;
const { pool } = require('../dist/lib/db');

const form = () => ({ employee: 6, denddt: '2026-02-28', dlyactinhh: 8, dlyactinmm: 0,
    dlyactouthh: 17, dlyactoutmm: 30, denot1: 1.5, denot2: 0, denlatemin: 5, dennoot: 'N', nolatflg: 'Y' });
async function setup(t, options = {}) {
    const calls = [];
    t.mock.method(pool, 'query', async (sql, values) => {
        calls.push({ sql, values });
        return { rows: options.missing ? [] : [{ densno: 4, ...form() }], rowCount: options.missing ? 0 : 1 };
    });
    const app = express();
    app.use(express.json());
    app.use((req, res, next) => {
        req.user = { sub: 1, usr: 'tester' };
        res.locals.access = { a_inqempatt: { view: true, add: true, amend: true, delete: true, ...options.rights } };
        next();
    });
    app.use('/attendance', router);
    app.use((err, req, res, next) => res.status(500).json({ message: err.message }));
    const server = app.listen(0, '127.0.0.1');
    await once(server, 'listening');
    t.after(() => new Promise(resolve => server.close(resolve)));
    return { calls, async send(path, method = 'GET', body) {
        const res = await fetch(`http://127.0.0.1:${server.address().port}/attendance${path}`, {
            method, headers: { 'Content-Type': 'application/json' }, ...(body ? { body: JSON.stringify(body) } : {})
        });
        return { status: res.status, body: await res.json() };
    } };
}
test('monthly inquiry uses mapping code and an exclusive next-month bound', async t => {
    const { send, calls } = await setup(t);
    assert.equal((await send('?employee=6&year=2026&month=2')).status, 200);
    assert.deepEqual(calls[0].values, [6, '2026-02-01']);
    assert.match(calls[0].sql, /empmapcode::text/);
    assert.match(calls[0].sql, /INTERVAL '1 month'/);
});
test('rejects bad dates, times, flags and nonnumeric input before writing', async t => {
    const { send, calls } = await setup(t);
    for (const change of [{ denddt: '2026-02-30' }, { dlyactinmm: 60 }, { dlyactouthh: 7 },
        { dennoot: 'x' }, { denot1: -1 }, { denlatemin: 1.5 }, { employee: true }, { denot2: '' }]) {
        assert.equal((await send('', 'POST', { ...form(), ...change })).status, 400);
    }
    assert.equal(calls.length, 0);
});
test('create derives employee metadata and audit identity on the server', async t => {
    const { send, calls } = await setup(t);
    assert.equal((await send('', 'POST', { ...form(), denucdnew: 'forged', denempsno: 999 })).status, 201);
    assert.equal(calls[0].values[10], 'tester');
    assert.equal(calls[0].values[11], 6);
    assert.match(calls[0].sql, /COALESCE\(empdepsno,0\)/);
});
test('edit targets one ID and preserves entry audit; delete targets one ID', async t => {
    const { send, calls } = await setup(t);
    assert.equal((await send('/4', 'PUT', form())).status, 200);
    assert.match(calls[0].sql, /denucdame=\$11/);
    assert.doesNotMatch(calls[0].sql, /denucdnew=/);
    assert.equal(calls[0].values[11], 4);
    assert.equal((await send('/4', 'DELETE')).status, 200);
    assert.deepEqual(calls[1].values, [4]);
});
test('missing employees and records produce useful client errors', async t => {
    const { send } = await setup(t, { missing: true });
    assert.equal((await send('', 'POST', form())).status, 400);
    assert.equal((await send('/4', 'PUT', form())).status, 404);
    assert.equal((await send('/4', 'DELETE')).status, 404);
});
test('each operation enforces attendance rights before querying SQL', async t => {
    const { send, calls } = await setup(t, { rights: { view: false, add: false, amend: false, delete: false } });
    for (const [path, method] of [['/employees', 'GET'], ['?employee=6&year=2026&month=2', 'GET'], ['', 'POST'], ['/4', 'PUT'], ['/4', 'DELETE']]) {
        assert.equal((await send(path, method, ['POST', 'PUT'].includes(method) ? form() : undefined)).status, 403);
    }
    assert.equal(calls.length, 0);
});
