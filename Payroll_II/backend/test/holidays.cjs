const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const { once } = require('node:events');
const router = require('../dist/routes/holidays').default;
const { pool } = require('../dist/lib/db');

const form = () => ({ holddt: '2028-02-29', holtypsno: 9, holotrate: 1.5 });
async function setup(t, options = {}) {
    const calls = [];
    t.mock.method(pool, 'query', async (sql, values) => {
        calls.push({ sql, values });
        if (sql.startsWith('SELECT 1')) return { rows: [], rowCount: options.invalidType ? 0 : 1 };
        if (sql.startsWith('INSERT') && options.duplicate) throw Object.assign(new Error('duplicate'), { code: '23505' });
        return { rows: options.missing ? [] : [{ holsno: 4, ...form() }], rowCount: options.missing ? 0 : 1 };
    });
    const app = express();
    app.use(express.json());
    app.use((req, res, next) => {
        req.user = { sub: 1, usr: 'tester' };
        res.locals.access = { a_holm: { view: true, add: true, amend: true, delete: true, ...options.rights } };
        next();
    });
    app.use('/holidays', router);
    app.use((err, req, res, next) => res.status(500).json({ message: err.message }));
    const server = app.listen(0, '127.0.0.1');
    await once(server, 'listening');
    t.after(() => new Promise(resolve => server.close(resolve)));
    return { calls, async send(path = '', method = 'GET', body) {
        const res = await fetch(`http://127.0.0.1:${server.address().port}/holidays${path}`, {
            method, headers: { 'Content-Type': 'application/json' }, ...(body ? { body: JSON.stringify(body) } : {})
        });
        return { status: res.status, body: await res.json() };
    } };
}
test('holiday list and type lookup use legacy tables and category 3', async t => {
    const { send, calls } = await setup(t);
    assert.equal((await send()).status, 200);
    assert.match(calls[0].sql, /LEFT JOIN a_sysmast/);
    assert.equal((await send('/types')).status, 200);
    assert.match(calls[1].sql, /sysrtp=3/);
});
test('holiday creation validates leap date and uses signed-in audit identity', async t => {
    const { send, calls } = await setup(t);
    assert.equal((await send('', 'POST', { ...form(), holucdnew: 'forged' })).status, 201);
    assert.deepEqual(calls[1].values, ['2028-02-29', 9, 1.5, 'tester']);
});
test('invalid dates, holiday types and OT rates fail before SQL', async t => {
    const { send, calls } = await setup(t);
    for (const change of [{ holddt: '2026-02-29' }, { holddt: '2026-13-01' }, { holddt: '' },
        { holtypsno: true }, { holtypsno: 0 }, { holotrate: -1 }, { holotrate: 'NaN' },
        { holotrate: '' }, { holotrate: [] }, { holotrate: 10000 }]) {
        assert.equal((await send('', 'POST', { ...form(), ...change })).status, 400);
    }
    assert.equal(calls.length, 0);
});
test('only an existing holiday-category type can be saved', async t => {
    const { send, calls } = await setup(t, { invalidType: true });
    assert.equal((await send('', 'POST', form())).status, 400);
    assert.equal(calls.length, 1);
    assert.match(calls[0].sql, /syssno=\$1 AND sysrtp=3/);
});
test('duplicate date returns a clear conflict response', async t => {
    const { send } = await setup(t, { duplicate: true });
    const response = await send('', 'POST', form());
    assert.equal(response.status, 409);
    assert.match(response.body.message, /already exists/);
});
test('amendment preserves date and entry audit; deletion targets one record', async t => {
    const { send, calls } = await setup(t);
    assert.equal((await send('/4', 'PUT', form())).status, 200);
    assert.match(calls[1].sql, /WHERE holsno=\$4 AND holddt=\$5/);
    assert.doesNotMatch(calls[1].sql, /SET holddt|holucdnew=/);
    assert.deepEqual(calls[1].values, [9, 1.5, 'tester', 4, '2028-02-29']);
    assert.equal((await send('/4', 'DELETE')).status, 200);
    assert.deepEqual(calls[2].values, [4]);
});
test('missing holiday returns 404 and malformed ID cannot delete records', async t => {
    const { send, calls } = await setup(t, { missing: true });
    assert.equal((await send('/4', 'PUT', form())).status, 404);
    assert.equal((await send('/4', 'DELETE')).status, 404);
    const count = calls.length;
    assert.equal((await send('/0', 'DELETE')).status, 400);
    assert.equal(calls.length, count);
});
test('view-only holiday access cannot write through direct API requests', async t => {
    const { send, calls } = await setup(t, { rights: { add: false, amend: false, delete: false } });
    for (const [path, method] of [['', 'POST'], ['/4', 'PUT'], ['/4', 'DELETE']]) {
        assert.equal((await send(path, method, method === 'DELETE' ? undefined : form())).status, 403);
    }
    assert.equal(calls.length, 0);
    assert.equal((await send()).status, 200);
});
test('holiday viewing and lookups require their own program permission', async t => {
    const { send, calls } = await setup(t, { rights: { view: false } });
    assert.equal((await send()).status, 403);
    assert.equal((await send('/types')).status, 403);
    assert.equal(calls.length, 0);
});
