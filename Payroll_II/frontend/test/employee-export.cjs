const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { stripTypeScriptTypes } = require('node:module');
const { runInNewContext } = require('node:vm');
const { test } = require('node:test');

function setup(list) {
    const source = readFileSync(join(__dirname, '../src/utils/employee-export.ts'), 'utf8')
        .replace(/^import .*;\r?\n/gm, '')
        .replace(/^export /gm, '');
    const context = { api: { list }, esc: String, window: { setTimeout } };
    runInNewContext(stripTypeScriptTypes(source), context);
    return context;
}

test('exports fetch every database page, including the final partial batch', async () => {
    const calls = [];
    const context = setup(async (search, page, limit) => {
        calls.push({ search, page, limit });
        const length = page === 3 ? 15 : 100;
        return {
            data: Array.from({ length }, (_, i) => ({ empsno: (page - 1) * 100 + i + 1 })),
            total: 215, totalPages: 3,
        };
    });
    const progress = [];
    const rows = await context.allEmployees((text) => progress.push(text), () => true);
    assert.equal(rows.length, 215);
    assert.equal(rows.at(-1).empsno, 215);
    assert.deepEqual(calls.map((call) => call.page), [1, 2, 3]);
    assert.ok(calls.every((call) => call.limit === 100 && call.search === ''));
    assert.match(progress.at(-1), /215 of 215/);
});

test('failed pages and changing record counts do not produce partial exports', async () => {
    const context = setup(async (search, page) => {
        if (page === 2) throw new Error('Server unavailable');
        return { data: [{ empsno: 1 }], total: 2, totalPages: 2 };
    });
    await assert.rejects(context.allEmployees(() => {}, () => true), /Server unavailable/);
    context.api.list = async (search, page) => ({ data: [{ empsno: page }], total: page + 1, totalPages: 2 });
    await assert.rejects(context.allEmployees(() => {}, () => true), /records changed/);
    context.api.list = async () => ({ data: [{ empsno: 1 }, { empsno: 1 }], total: 2, totalPages: 1 });
    await assert.rejects(context.allEmployees(() => {}, () => true), /complete employee list/);
});

test('leaving the page cancels further export requests', async () => {
    let alive = true;
    let calls = 0;
    const context = setup(async () => {
        calls++;
        alive = false;
        return { data: [{ empsno: 1 }], total: 200, totalPages: 2 };
    });
    await assert.rejects(context.allEmployees(() => {}, () => alive), /cancelled/);
    assert.equal(calls, 1);
});

test('copy includes all rows as Excel columns and neutralizes formula text', () => {
    const context = setup();
    const text = context.copyText({
        headings: ['Emp No', 'Name', 'Account', 'Salary'],
        rows: [['1', 'First\nEmployee', '00123', 500], ['2', '=1+1', '00005', -20]],
    });
    assert.equal(text, "Emp No\tName\tAccount\tSalary\r\n1\tFirst Employee\t00123\t500\r\n2\t'=1+1\t00005\t-20");
});

test('PDF and print column sections cover every field and repeat employee identity', () => {
    const context = setup();
    const groups = context.columnGroups({ headings: Array.from({ length: 53 }, (_, i) => String(i)), rows: [] });
    const detailColumns = [];
    for (const group of groups) {
        assert.equal(group[0], 0);
        assert.equal(group[1], 1);
        assert.ok(group.length <= 8);
        detailColumns.push(...group.slice(2));
    }
    assert.deepEqual(detailColumns, Array.from({ length: 51 }, (_, i) => i + 2));
});
