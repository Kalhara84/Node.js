const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { stripTypeScriptTypes } = require('node:module');
const { runInNewContext } = require('node:vm');
const { test } = require('node:test');

test('employee table fetches one batch at a time and retries failed pages', async () => {
    const elements = new Map();
    const calls = [];
    let click;
    let fail = false;
    const el = {
        innerHTML: '',
        querySelectorAll: () => [],
        addEventListener: (event, handler) => { click = handler; },
    };
    const qs = (root, selector) => {
        if (!elements.has(selector)) {
            elements.set(selector, { innerHTML: '', textContent: '', setAttribute() {} });
        }
        return elements.get(selector);
    };
    const source = readFileSync(join(__dirname, '../src/pages/employees-table.ts'), 'utf8')
        .replace(/^import .*;\r?\n/gm, '')
        .replace(/^export /gm, '');
    const context = {
        api: {
            list: async (search, page, limit) => {
                calls.push({ search, page, limit });
                if (fail) throw new Error('Connection failed');
                const data = Array.from({ length: page === 3 ? 1 : 25 }, (_, i) => ({
                    empeno: (page - 1) * limit + i + 1,
                    empnam: `Employee ${(page - 1) * limit + i + 1}`,
                }));
                return { data, page, limit, total: 51, totalPages: 3 };
            },
        },
        qs, esc: (value) => String(value), money: String, yn: String,
        CATEGORY: {}, GENDER: {}, emptyState: String, alertBox: String,
        errMsg: (error) => error.message,
    };
    runInNewContext(stripTypeScriptTypes(source), context);
    await context.render(el, { alive: () => true });
    assert.deepEqual(calls, [{ search: '', page: 1, limit: 25 }]);
    assert.match(qs(el, '#rows').innerHTML, /Employee 25/);
    assert.doesNotMatch(qs(el, '#rows').innerHTML, /Employee 26/);

    async function navigate(page) {
        const button = { disabled: false, dataset: page ? { page: String(page) } : {} };
        click({ target: { closest: (selector) => selector === '[data-export]' ? null : button } });
        await new Promise(setImmediate);
    }

    await navigate(2);
    assert.equal(calls.length, 2);
    assert.match(qs(el, '#rows').innerHTML, /Employee 26/);
    assert.match(qs(el, '#pager').innerHTML, /Showing 26–50 of 51/);
    fail = true;
    await navigate(3);
    assert.match(qs(el, '#err').innerHTML, /Retry page 3/);
    assert.match(qs(el, '#rows').innerHTML, /Employee 26/);
    fail = false;
    await navigate();
    assert.equal(calls.at(-1).page, 3);
    assert.match(qs(el, '#pager').innerHTML, /Showing 51–51 of 51/);
    assert.match(qs(el, '#pager').innerHTML, /data-page="4" disabled/);
});
