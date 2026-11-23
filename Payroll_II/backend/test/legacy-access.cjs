// Test imported password hashes, employee rights and password changes.
const test=require('node:test');
const assert=require('node:assert/strict');
const {verifyPassword,hashPassword}=require('../dist/lib/auth');
const {accountAccess,requireEmployee}=require('../dist/lib/permissions');
const {AuthController}=require('../dist/controllers/auth.controller');
const {pool}=require('../dist/lib/db');
const {UserModel}=require('../dist/models/user.model');

// Test: imported Unix crypt passwords use published crypt(3) vectors.
test('imported Unix crypt passwords use published crypt(3) vectors',()=>{
 assert.equal(verifyPassword('foob','arlEKn0OzVJn.'),true);
 assert.equal(verifyPassword('wrong','arlEKn0OzVJn.'),false);
 assert.equal(verifyPassword('foo','ba4TuD1iozTxw'),true);
 assert.equal(verifyPassword('foo','not-a-hash'),false);
});
// Test: employee actions match the PHP program and operation flag.
test('employee actions match the PHP program and operation flag',async t=>{
 // Replace SQL with controlled results so no real database is needed.
 t.mock.method(pool,'query',async sql=>({rows:sql.includes('usdactive')?[{usdactive:'Y',usdadmin:false}]:[
  {prgnam:'p_empenter',usryn:'n',usraddyn:'y',usrameyn:'n',usrdelyn:'n'},
  {prgnam:'p_empm.php',usryn:'y',usraddyn:'n',usrameyn:'y',usrdelyn:'n'}
 ]}));
 assert.deepEqual(await accountAccess(5),{admin:false,employees:{view:true,add:true,amend:false,delete:false}});
});
// Test: inactive users are denied even if they are administrators.
test('inactive users are denied even if they are administrators',async t=>{
 // Replace SQL with controlled results so no real database is needed.
 t.mock.method(pool,'query',async()=>({rows:[{usdactive:'N',usdadmin:true}]}));
 assert.equal(await accountAccess(1),null);
});
// Test: employee middleware rejects direct unauthorized requests.
test('employee middleware rejects direct unauthorized requests',()=>{
 let status;
 const res={locals:{access:{employees:{delete:false}}},status(n){status=n;return this;},json(){}};
 requireEmployee('delete')({},res,()=>assert.fail('Unauthorized action advanced'));
 assert.equal(status,403);
});
// Test: legacy login upgrades the hash without returning it to the client.
test('legacy login upgrades the hash without returning it to the client',async t=>{
 const calls=[];
 // Simulate an active imported account with a known legacy hash.
 t.mock.method(UserModel,'findByUsername',async()=>({usdsno:7,usdusd:'olduser',usdpwd:'arlEKn0OzVJn.',usdnam:'Old user',usdactive:'Y'}));
 // Replace SQL with controlled results so no real database is needed.
 t.mock.method(pool,'query',async(sql,values)=>{calls.push({sql,values});return {rows:sql.includes('usdactive')?[{usdactive:'Y',usdadmin:true}]:[]};});
 let output;
 await AuthController.login({body:{username:'olduser',password:'foob'}},{json(v){output=v;}});
 assert.ok(calls[0].values[0].startsWith('scrypt$'));
 assert.equal(verifyPassword('foob',calls[0].values[0]),true);
 assert.equal(output.user.access.admin,true);
 assert.equal(JSON.stringify(output).includes('usdpwd'),false);
});
// Test: password change checks the old password and saves only for the signed-in user.
test('password change checks the old password and saves only for the signed-in user',async t=>{
 const hash=hashPassword('oldpass');const calls=[];
 // Replace SQL with controlled results so no real database is needed.
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
