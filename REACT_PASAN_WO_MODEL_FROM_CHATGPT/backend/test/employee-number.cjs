const assert = require('node:assert/strict');
const test = require('node:test');
const { validateEmployee } = require('../dist/validators/employee.validator');
const { EmployeeModel } = require('../dist/models/employee.model');
const { pool } = require('../dist/lib/db');

test('creation requires a name but no client-provided employee number', () => {
    const result = validateEmployee({ empnam: 'Employee' }, false);
    assert.deepEqual(result.errors, []);
    assert.deepEqual(result.data, { empnam: 'Employee' });
});

test('client-provided employee numbers are ignored on create and update', () => {
    for (const partial of [false, true]) {
        const result = validateEmployee({ empnam: 'Employee', empeno: 999 }, partial);
        assert.deepEqual(result.errors, []);
        assert.equal(Object.hasOwn(result.data, 'empeno'), false);
    }
});

test('model update preserves employee number even if called directly', async (t) => {
    const queries = [];
    t.mock.method(pool, 'query', async (sql, values) => {
        queries.push({ sql, values });
        return { rows: [] };
    });
    await EmployeeModel.update(7, { empeno: 999, empnam: 'Updated' });
    assert.equal(queries.length, 1);
    assert.equal(queries[0].sql.includes('empeno'), false);
    assert.deepEqual(queries[0].values, ['Updated', 7]);
});

test('creation saves the generated number and releases the transaction connection', async (t) => {
    const queries = [];
    let released = false;
    t.mock.method(pool, 'connect', async () => ({
        async query(sql, values) {
            queries.push({ sql, values });
            if (sql.startsWith('SELECT')) return { rows: [{ empeno: 42 }] };
            if (sql.startsWith('INSERT')) return { rows: [{ empsno: 7 }] };
            return { rows: [] };
        },
        release() { released = true; },
    }));
    assert.equal(await EmployeeModel.create({ empnam: 'New', empeno: 999 }), 7);
    assert.equal(queries[0].sql, 'BEGIN');
    assert.match(queries[1].sql, /^LOCK TABLE/);
    assert.deepEqual(queries.find(q => q.sql.startsWith('INSERT')).values, ['New', 42]);
    assert.equal(queries.at(-1).sql, 'COMMIT');
    assert.equal(released, true);
});
