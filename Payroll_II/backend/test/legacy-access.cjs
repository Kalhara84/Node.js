const test=require('node:test');
const assert=require('node:assert/strict');
const {verifyPassword,hashPassword}=require('../dist/lib/auth');
const {accountAccess,requireEmployee}=require('../dist/lib/permissions');
const {AuthController}=require('../dist/controllers/auth.controller');
const {pool}=require('../dist/lib/db');
const {UserModel}=require('../dist/models/user.model');

test('imported Unix crypt passwords use published crypt(3) vectors',()=>{
 assert.equal(verifyPassword('foob','arlEKn0OzVJn.'),true);
 assert.equal(verifyPassword('wrong','arlEKn0OzVJn.'),false);
 assert.equal(verifyPassword('foo','ba4TuD1iozTxw'),true);
 assert.equal(verifyPassword('foo','not-a-hash'),false);
});
test('employee actions match the PHP program and operation flag',async t=>{
 t.mock.method(pool,'query',async sql=>({rows:sql.includes('usdactive')?[{usdactive:'Y',usdadmin:false}]:[
  {prgnam:'p_empenter',usryn:'n',usraddyn:'y',usrameyn:'n',usrdelyn:'n'},
  {prgnam:'p_empm.php',usryn:'y',usraddyn:'n',usrameyn:'y',usrdelyn:'n'}
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
  {prgnam:'a_users.php',usryn:'n',usraddyn:'y',usrameyn:'y',usrdelyn:'n'}
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
