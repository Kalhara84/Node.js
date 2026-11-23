const test = require('node:test');
const assert = require('node:assert/strict');
const { accountAccess, requireScreen } = require('../dist/lib/permissions');
const { pool } = require('../dist/lib/db');

// Simulate an ordinary account with rights on one registered web page.
function account(context, page, flags, level = 'M') {
    context.mock.method(pool, 'query', async (sql, values) => {
        if (sql.includes('usdactive')) return { rows: [{ usdactive: 'Y', usdadmin: false }] };
        assert.match(sql, /p\.prgapp='payroll-web'/);
        assert.ok(values[1].includes(page));
        return { rows: [{ prgnam: page, prglvl: level, usryn: 'n', usraddyn: 'n', usrameyn: 'n', usrdelyn: 'n', ...flags }] };
    });
}

// These are the two pages currently registered in Program Master.
for (const page of ['employees', 'users']) {
    test(`${page}: View-only users cannot add, amend or delete`, async context => {
        account(context, page, { usryn: 'y' });
        const access = await accountAccess(7);
        assert.deepEqual(access[page], { view: true, add: false, amend: false, delete: false });
        const other = page === 'employees' ? 'users' : 'employees';
        assert.deepEqual(access[other], { view: false, add: false, amend: false, delete: false });
        for (const action of ['add', 'amend', 'delete']) {
            let code;
            const res = { locals: { access }, status(value) { code = value; return this; }, json() {} };
            await requireScreen(page, action)({ user: { sub: 7 } }, res, () => assert.fail('View-only user was allowed to write'));
            assert.equal(code, 403);
        }
    });

    test(`${page}: View plus Add users can insert but cannot amend or delete`, async context => {
        account(context, page, { usryn: 'y', usraddyn: 'y' });
        const access = await accountAccess(7);
        assert.deepEqual(access[page], { view: true, add: true, amend: false, delete: false });
        let advanced = false;
        await requireScreen(page, 'add')({ user: { sub: 7 } }, { locals: { access } }, () => { advanced = true; });
        assert.equal(advanced, true);
    });
}

// Changing a page to view-only must also disable stale operation flags in the database.
test('Single programs never grant write access from stale action flags', async context => {
    account(context, 'users', { usryn: 'y', usraddyn: 'y', usrameyn: 'y', usrdelyn: 'y' }, 'S');
    assert.deepEqual((await accountAccess(7)).users, { view: true, add: false, amend: false, delete: false });
});

test('a newly created user without saved program rights has no business-page access', async context => {
    context.mock.method(pool, 'query', async sql => ({ rows: sql.includes('usdactive') ? [{ usdactive: 'Y', usdadmin: false }] : [] }));
    const access = await accountAccess(7);
    assert.equal(Object.entries(access).filter(([key]) => key !== 'admin').every(([, rights]) => Object.values(rights).every(value => value === false)), true);
});
