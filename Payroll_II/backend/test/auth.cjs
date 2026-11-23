const assert = require('node:assert/strict');
const test = require('node:test');
const { requireAuth, wrap } = require('../dist/middleware');
const { signToken, verifyToken, hashPassword, verifyPassword } = require('../dist/lib/auth');

test('missing or invalid authorization returns 401 without throwing', () => {
    for (const authorization of [undefined, '', 'Basic abc', 'Bearer invalid']) {
        const req = { headers: { authorization } };
        const res = {
            status(code) {
                assert.equal(code, 401);
                return this;
            },
            json(body) {
                assert.deepEqual(body, { message: 'Unauthorized' });
            },
        };
        requireAuth(req, res, () => assert.fail('Must not authorize this request'));
        assert.equal(req.user, undefined);
    }
});

test('valid token keeps the authenticated user and advances the request', () => {
    const user = { sub: 1, usr: 'admin', name: 'Administrator' };
    const token = signToken(user);
    const req = { headers: { authorization: `Bearer ${token}` } };
    let advanced = false;
    requireAuth(req, {}, () => {
        advanced = true;
    });
    assert.equal(advanced, true);
    assert.equal(req.user.sub, user.sub);
    assert.equal(req.user.usr, user.usr);
    assert.equal(verifyToken(`${token}changed`), null);
});

test('password hashing accepts the original password and rejects others', () => {
    const stored = hashPassword('example-password');
    assert.equal(verifyPassword('example-password', stored), true);
    assert.equal(verifyPassword('wrong-password', stored), false);
    assert.equal(verifyPassword('example-password', 'invalid'), false);
});

test('controller wrapper forwards both synchronous and asynchronous errors', async () => {
    const expected = new Error('Controller failed');
    const controllers = [
        () => {
            throw expected;
        },
        async () => {
            throw expected;
        },
    ];
    for (const controller of controllers) {
        await new Promise((resolve, reject) => {
            wrap(controller)({}, {}, (error) => {
                try {
                    assert.equal(error, expected);
                    resolve();
                } catch (failure) {
                    reject(failure);
                }
            });
        });
    }
});
