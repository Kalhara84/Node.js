const test = require('node:test');
const assert = require('node:assert/strict');
const { AdministrationController } = require('../dist/controllers/administration.controller');
const { verifyPassword } = require('../dist/lib/auth');
const { pool } = require('../dist/lib/db');

// Capture the status and JSON sent by a controller without starting a server.
function response(admin = true) {
    return {
        locals: { access: { admin } },
        code: 200,
        status(code) { this.code = code; return this; },
        json(data) { this.data = data; }
    };
}

// Keep a fake signed-in identity separate from account fields submitted by the form.
const request = body => ({ params: { id: '7' }, body, user: { sub: 1, usr: 'EDITOR' } });

// Creating an account must hash its password and return public columns only.
test('user creation validates fields, hashes the password and records the editor', async context => {
    const calls = [];
    context.mock.method(pool, 'query', async (sql, values) => {
        calls.push({ sql, values });
        return { rows: [{ usdsno: 7, usdusd: 'newuser' }] };
    });
    const res = response();
    await AdministrationController.createUser(request({ usdusd: ' newuser ', usdpwd: 'new-password', usdnam: ' New User ' }), res);
    assert.equal(res.code, 201);
    assert.deepEqual(res.data, { usdsno: 7, usdusd: 'newuser' });
    const insert = calls[0];
    assert.ok(insert.values.includes('newuser'));
    assert.ok(insert.values.includes('New User'));
    assert.equal(insert.values.at(-1), 'EDITOR');
    const hash = insert.values.find(value => typeof value === 'string' && value.startsWith('scrypt$'));
    assert.equal(verifyPassword('new-password', hash), true);
    assert.equal(insert.values.includes('new-password'), false);
    assert.equal(insert.sql.split('RETURNING')[1].includes('usdpwd'), false);
});

// Invalid profiles or missing locations must be rejected before an INSERT.
test('invalid user input and nonexistent locations cannot create accounts', async context => {
    const calls = [];
    context.mock.method(pool, 'query', async sql => { calls.push(sql); return { rows: [], rowCount: 0 }; });
    for (const body of [
        { usdusd: 'toolongusername', usdpwd: 'secret' },
        { usdusd: 'user' },
        { usdusd: 'user', usdpwd: 'secret', usdactive: 'X' },
        { usdusd: 'user', usdpwd: 'secret', usdcomsno: 999 }
    ]) {
        await assert.rejects(AdministrationController.createUser(request(body), response()), error => error.status === 400);
    }
    assert.equal(calls.some(sql => sql.includes('INSERT')), false);
});

// Preserve the protection against ordinary users changing administrator passwords.
test('ordinary editors cannot change administrator accounts', async context => {
    context.mock.method(pool, 'query', async () => ({ rows: [{}], rowCount: 1 }));
    const res = response(false);
    await AdministrationController.updateUser(request({ usdpwd: 'replacement' }), res);
    assert.equal(res.code, 403);
    assert.equal(res.data.message, 'Only an administrator can change an administrator account');
});

// An ordinary profile edit keeps the username and password when replacements are not allowed/supplied.
test('profile updates preserve username and password and use the URL account ID', async context => {
    const calls = [];
    context.mock.method(pool, 'query', async (sql, values) => {
        calls.push({ sql, values });
        return { rows: [{ usdsno: 7, usdnam: 'Updated' }], rowCount: 1 };
    });
    const res = response();
    await AdministrationController.updateUser(request({ usdusd: 'changed', usdnam: ' Updated ', usdpwd: '' }), res);
    assert.equal(res.code, 200);
    const update = calls[0];
    const assignments = update.sql.split('SET')[1].split('WHERE')[0];
    assert.equal(assignments.includes('usdusd='), false);
    assert.equal(assignments.includes('usdpwd='), false);
    assert.ok(update.values.includes('Updated'));
    assert.deepEqual(update.values.slice(-2), ['EDITOR', 7]);
});

// Simulate one Single and one Multi program and capture transaction operations.
function rightsDatabase(context, options = {}) {
    const calls = [];
    let released = false;
    context.mock.method(pool, 'connect', async () => ({
        async query(sql, values) {
            calls.push({ sql: sql.trim(), values });
            if (sql.includes('FOR UPDATE')) return { rows: [{}], rowCount: 1 };
            if (sql.startsWith('SELECT prgsno')) return {
                rows: [{ prgsno: 21, prglvl: 'S' }, { prgsno: 22, prglvl: 'M' }],
                rowCount: options.changedPrograms ? 1 : 2
            };
            if (sql.includes('INSERT') && options.failWrite) throw new Error('Write failed');
            return { rows: [], rowCount: 1 };
        },
        release() { released = true; }
    }));
    return { calls, released: () => released };
}

const rights = () => ({ rows: [21, 22].map(prgsno => ({ prgsno, usryn: 'y', usraddyn: 'y', usrameyn: 'y', usrdelyn: 'y' })) });

// Both program levels must keep their original permission rules after the move.
test('administration rights saving normalizes flags and commits all changes together', async context => {
    const db = rightsDatabase(context);
    const res = response();
    await AdministrationController.saveRights(request(rights()), res);
    const inserts = db.calls.filter(call => call.sql.startsWith('INSERT'));
    assert.deepEqual(inserts.map(call => call.values), [
        [7, 21, 'y', 'n', 'n', 'n', 'EDITOR'],
        [7, 22, 'n', 'y', 'y', 'y', 'EDITOR']
    ]);
    assert.equal(db.calls.at(-1).sql, 'COMMIT');
    assert.equal(db.released(), true);
    assert.equal(res.data.message, '2 program rights updated');
});

test('clearing administration rights deletes only the submitted user/program pairs', async context => {
    const db = rightsDatabase(context);
    await AdministrationController.saveRights(request({ ...rights(), clear: true }), response());
    const deletions = db.calls.filter(call => call.sql.startsWith('DELETE'));
    assert.deepEqual(deletions.map(call => call.values), [[7, 21], [7, 22]]);
    assert.equal(db.calls.some(call => call.sql.startsWith('INSERT')), false);
    assert.equal(db.calls.at(-1).sql, 'COMMIT');
    assert.equal(db.released(), true);
});

// Invalid rights must not begin a transaction.
test('invalid administration rights fail before acquiring a connection', async context => {
    let connected = false;
    context.mock.method(pool, 'connect', async () => { connected = true; throw new Error('Unexpected connection'); });
    for (const rows of [
        [rights().rows[0], rights().rows[0]],
        [{ ...rights().rows[0], usryn: 'yes' }]
    ]) {
        await assert.rejects(AdministrationController.saveRights(request({ rows }), response()), error => error.status === 400);
    }
    assert.equal(connected, false);
});

// Failed writes and changed program lists must undo the transaction and free the connection.
test('failed administration rights writes roll back and release the connection', async context => {
    const db = rightsDatabase(context, { failWrite: true });
    await assert.rejects(AdministrationController.saveRights(request(rights()), response()), /Write failed/);
    assert.equal(db.calls.at(-1).sql, 'ROLLBACK');
    assert.equal(db.released(), true);
});

test('changed administration programs reject rights saving before writes', async context => {
    const db = rightsDatabase(context, { changedPrograms: true });
    await assert.rejects(AdministrationController.saveRights(request(rights()), response()), error => error.status === 400);
    assert.equal(db.calls.some(call => call.sql.startsWith('INSERT')), false);
    assert.equal(db.calls.at(-1).sql, 'ROLLBACK');
    assert.equal(db.released(), true);
});
