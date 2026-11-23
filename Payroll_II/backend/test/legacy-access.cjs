const test=require('node:test');
const assert=require('node:assert/strict');
const {verifyPassword,hashPassword}=require('../dist/lib/auth');
const {accountAccess,requireEmployee,requireScreen}=require('../dist/lib/permissions');
const {AuthController}=require('../dist/controllers/auth.controller');
const {pool}=require('../dist/lib/db');
const {UserModel}=require('../dist/models/user.model');

test('imported Unix crypt passwords use published crypt(3) vectors',()=>{
 assert.equal(verifyPassword('foob','arlEKn0OzVJn.'),true);
 assert.equal(verifyPassword('wrong','arlEKn0OzVJn.'),false);
 assert.equal(verifyPassword('foo','ba4TuD1iozTxw'),true);
 assert.equal(verifyPassword('foo','not-a-hash'),false);
});
test('employee actions use the registered web page and operation flags',async t=>{
 t.mock.method(pool,'query',async sql=>({rows:sql.includes('usdactive')?[{usdactive:'Y',usdadmin:false}]:[
  {prgnam:'employees',prglvl:'M',usryn:'y',usraddyn:'y',usrameyn:'n',usrdelyn:'n'}
 ]}));
 const none={view:false,add:false,amend:false,delete:false};
 assert.deepEqual(await accountAccess(5),{admin:false,dashboard:none,employees:{view:true,add:true,amend:false,delete:false},programs:none,users:none,rights:none});
});
test('inactive users are denied even if they are administrators',async t=>{
 t.mock.method(pool,'query',async()=>({rows:[{usdactive:'N',usdadmin:true}]}));
 assert.equal(await accountAccess(1),null);
});
test('employee middleware rejects direct unauthorized requests',()=>{
 let status;
 const res={locals:{access:{employees:{delete:false}}},status(n){status=n;return this;},json(){}};
 requireEmployee('delete')({},res,()=>assert.fail('Unauthorized action advanced'));
 assert.equal(status,403);
});
test('legacy login upgrades the hash without returning it to the client',async t=>{
 const calls=[];
 t.mock.method(UserModel,'findByUsername',async()=>({usdsno:7,usdusd:'olduser',usdpwd:'arlEKn0OzVJn.',usdnam:'Old user',usdactive:'Y'}));
 t.mock.method(pool,'query',async(sql,values)=>{calls.push({sql,values});return {rows:sql.includes('usdactive')?[{usdactive:'Y',usdadmin:true}]:[]};});
 let output;
 await AuthController.login({body:{username:'olduser',password:'foob'}},{json(v){output=v;}});
 assert.ok(calls[0].values[0].startsWith('scrypt$'));
 assert.equal(verifyPassword('foob',calls[0].values[0]),true);
 assert.equal(output.user.access.admin,true);
 assert.equal(JSON.stringify(output).includes('usdpwd'),false);
});
test('password change checks the old password and saves only for the signed-in user',async t=>{
 const hash=hashPassword('oldpass');const calls=[];
 t.mock.method(pool,'query',async(sql,values)=>{calls.push({sql,values});return {rows:[{usdpwd:hash}],rowCount:1};});
 let output;let status=200;
 const res={status(n){status=n;return this;},json(v){output=v;}};
 await AuthController.changePassword({user:{sub:7,usr:'user'},body:{currentPassword:'wrong',newPassword:'next',confirmPassword:'next'}},res);
 assert.equal(status,400);assert.equal(calls.length,1);
 await AuthController.changePassword({user:{sub:7,usr:'user'},body:{currentPassword:'oldpass',newPassword:'next',confirmPassword:'next',usdsno:99}},res);
 assert.equal(calls.at(-1).values[2],7);
 assert.equal(verifyPassword('next',calls.at(-1).values[0]),true);
 assert.equal(output.message,'Password changed successfully');
});

test('screens other than employees follow their own program rights, administrators get everything',async t=>{
 t.mock.method(pool,'query',async sql=>({rows:sql.includes('usdactive')?[{usdactive:'Y',usdadmin:false}]:[
  {prgnam:'dashboard',usryn:'y',usraddyn:'n',usrameyn:'n',usrdelyn:'n'},
  {prgnam:'users',prglvl:'M',usryn:'n',usraddyn:'y',usrameyn:'y',usrdelyn:'n'}
 ]}));
 const access=await accountAccess(5);
 assert.equal(access.dashboard.view,true);
 assert.deepEqual(access.users,{view:true,add:true,amend:true,delete:false});
 assert.equal(access.programs.view,false);
 assert.equal(access.rights.view,false);
 assert.equal(access.employees.view,false);
});
test('administrators get every screen',async t=>{
 t.mock.method(pool,'query',async()=>({rows:[{usdactive:'Y',usdadmin:true}]}));
 const admin=await accountAccess(1);
 assert.equal(admin.admin,true);
 assert.equal(['dashboard','employees','programs','users','rights'].every(s=>admin[s].view&&admin[s].add&&admin[s].amend&&admin[s].delete),true);
});

// Simulate an ordinary account with rights on one registered web page.
function account(context, page, flags, level = 'M') {
    context.mock.method(pool, 'query', async (sql, values) => {
        if (sql.includes('usdactive')) return { rows: [{ usdactive: 'Y', usdadmin: false }] };
        assert.match(sql, /p\.prgapp='payroll-web'/);
        assert.equal(values[1], false);
        return { rows: [{ prgnam: page, prglvl: level, usryn: 'n', usraddyn: 'n', usrameyn: 'n', usrdelyn: 'n', ...flags }] };
    });
}

// Existing pages and future pages follow the same permission checks.
for (const page of ['employees', 'users', 'attendance']) {
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

test('unknown page requests are denied without throwing an error', async () => {
    let status;
    const res = { locals: { access: { admin: true } }, status(value) { status = value; return this; }, json() {} };
    await requireScreen('not_registered')({}, res, () => assert.fail('Unknown page was allowed'));
    assert.equal(status, 403);
});

test('saved restrictions also apply to administrators on future pages', async context => {
    context.mock.method(pool, 'query', async sql => ({ rows: sql.includes('usdactive') ? [{ usdactive: 'Y', usdadmin: true }] : [
        { prgnam: 'attendance', prglvl: 'M', usryn: 'n', usraddyn: 'n', usrameyn: 'n', usrdelyn: 'n' }
    ] }));
    const access = await accountAccess(7);
    assert.equal(access.admin, true);
    assert.deepEqual(access.attendance, { view: false, add: false, amend: false, delete: false });
});

// Admin status is retained; saved page-level restrictions still take precedence.
test('an administrator can be denied an entire page without losing administrator status', async context => {
    context.mock.method(pool, 'query', async sql => ({ rows: sql.includes('usdactive') ? [{ usdactive: 'Y', usdadmin: true }] : [
        { prgnam: 'employees', prglvl: 'M', usryn: 'n', usraddyn: 'n', usrameyn: 'n', usrdelyn: 'n' }
    ] }));
    const access = await accountAccess(7);
    assert.equal(access.admin, true);
    assert.deepEqual(access.employees, { view: false, add: false, amend: false, delete: false });
    assert.deepEqual(access.users, { view: true, add: true, amend: true, delete: true });
});

test('an administrator can be restricted to viewing a page without write access', async context => {
    context.mock.method(pool, 'query', async sql => ({ rows: sql.includes('usdactive') ? [{ usdactive: 'Y', usdadmin: true }] : [
        { prgnam: 'users', prglvl: 'M', usryn: 'y', usraddyn: 'n', usrameyn: 'n', usrdelyn: 'n' }
    ] }));
    const access = await accountAccess(7);
    assert.equal(access.admin, true);
    assert.deepEqual(access.users, { view: true, add: false, amend: false, delete: false });
});
