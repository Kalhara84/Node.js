const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const { once } = require('node:events');
const { pool } = require('../dist/lib/db');
const depm = require('../dist/routes/depm').default;
const noptrn = require('../dist/routes/noptrn').default;

async function setup(t, rights, existing = []) {
    const queries = [];
    const query = async (sql, values) => {
        queries.push({ sql, values });
        return { rows: sql.startsWith('SELECT trnempsno') ? existing : [], rowCount: 0 };
    };
    t.mock.method(pool, 'query', query);
    t.mock.method(pool, 'connect', async () => ({ query, release() {} }));
    const app = express();
    app.use(express.json());
    app.use((req, res, next) => {
        req.user = { sub: 7, usr: 'tester' };
        res.locals.access = { admin: true, depm: rights, noptrn: rights };
        next();
    });
    app.use('/depm', depm);
    app.use('/noptrn', noptrn);
    app.use((err, req, res, next) => res.status(500).json({ message: err.message }));
    const server = app.listen(0, '127.0.0.1');
    await once(server, 'listening');
    t.after(() => new Promise(resolve => server.close(resolve)));
    return { queries, async send(path, method = 'GET', body) {
        return fetch(`http://127.0.0.1:${server.address().port}${path}`, {
            method, headers: { 'Content-Type': 'application/json' },
            ...(body ? { body: JSON.stringify(body) } : {}),
        });
    } };
}
const none = { view: false, add: false, amend: false, delete: false };
const body = { sysrno: '007', rows: [{ empsno: 1, trnamt: 25 }] };

test('denied programs block direct URLs and writes even for administrators', async t => {
    const { send, queries } = await setup(t, none);
    for (const [path, method] of [
        ['/depm', 'GET'], ['/depm', 'POST'], ['/depm/1', 'PUT'], ['/depm/1', 'DELETE'],
        ['/noptrn/options', 'GET'], ['/noptrn/display', 'GET'], ['/noptrn/save', 'POST'],
    ]) assert.equal((await send(path, method, method === 'GET' ? undefined : body)).status, 403);
    assert.equal(queries.length, 0);
});

test('view-only users can read departments but cannot mutate either program', async t => {
    const { send, queries } = await setup(t, { ...none, view: true });
    assert.equal((await send('/depm')).status, 200);
    queries.length = 0;
    for (const [path, method] of [['/depm', 'POST'], ['/depm/1', 'PUT'], ['/depm/1', 'DELETE'], ['/noptrn/save', 'POST']]) {
        assert.equal((await send(path, method, body)).status, 403);
    }
    assert.equal(queries.length, 0);
});

for (const action of ['add', 'amend']) {
    test(`direct transactions enforce ${action} against stored rows`, async t => {
        const existing = action === 'amend' ? [{ trnempsno: 1, trntyp: '007' }] : [];
        const { send, queries } = await setup(t, { ...none, view: true, [action]: true }, existing);
        assert.equal((await send('/noptrn/save', 'POST', body)).status, 200);
        assert(queries.some(q => q.sql === 'COMMIT'));
        assert(queries.findIndex(q => q.sql.startsWith('LOCK TABLE')) < queries.findIndex(q => q.sql.startsWith('DELETE')));
    });
}

test('Add cannot overwrite existing transactions; the entire mixed batch rolls back', async t => {
    const { send, queries } = await setup(t, { ...none, view: true, add: true }, [{ trnempsno: 2, trntyp: '007' }]);
    assert.equal((await send('/noptrn/save', 'POST', { ...body, rows: [...body.rows, { empsno: 2, trnamt: 30 }] })).status, 403);
    assert(queries.some(q => q.sql === 'ROLLBACK'));
    assert(!queries.some(q => /^(DELETE|INSERT)/.test(q.sql)));
});

test('Amend cannot insert a missing transaction', async t => {
    const { send, queries } = await setup(t, { ...none, view: true, amend: true });
    assert.equal((await send('/noptrn/save', 'POST', body)).status, 403);
    assert(!queries.some(q => /^(DELETE|INSERT)/.test(q.sql)));
});

test('generated type 045 also requires Amend when already present', async t => {
    const { send, queries } = await setup(t, { ...none, view: true, add: true }, [{ trnempsno: 1, trntyp: '045' }]);
    assert.equal((await send('/noptrn/save', 'POST', { ...body, sysrno: '444' })).status, 403);
    assert(!queries.some(q => /^(DELETE|INSERT)/.test(q.sql)));
});

test('duplicate employee rows cannot turn an Add batch into repeated overwrites', async t => {
    const { send, queries } = await setup(t, { ...none, view: true, add: true });
    assert.equal((await send('/noptrn/save', 'POST', { ...body, rows: [body.rows[0], body.rows[0]] })).status, 400);
    assert.equal(queries.length, 0);
});
