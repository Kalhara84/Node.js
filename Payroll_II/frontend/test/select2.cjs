const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { stripTypeScriptTypes } = require('node:module');
const { runInNewContext } = require('node:vm');
const { test } = require('node:test');

// Exercise the dropdown bridge without a browser or API connection.
function setup() {
    const observers = [];
    class Select {
        dataset = {};
        disabledValue = false;
        selectedValue = '';
        initialized = false;
        changes = 0;
        handlers = new Map();
        get disabled() { return this.disabledValue; }
        set disabled(value) { this.disabledValue = value; }
        get value() { return this.selectedValue; }
        set value(value) { this.selectedValue = value; }
        querySelector() { return null; }
        setAttribute() {}
        removeAttribute() {}
    }
    const jquery = (select) => ({
        hasClass: () => select.initialized,
        select2: (action) => { select.initialized = action !== 'destroy'; },
        on: (events, handler) => { select.handlers?.set(events, handler); },
        off: () => { select.handlers.clear(); },
        prop: (name, value) => { select[name] = value; },
        trigger: () => { select.changes++; },
        remove: () => {},
    });
    jquery.fn = { select2() {} };
    class Observer {
        constructor(callback) {
            this.callback = callback;
            this.disconnected = false;
            observers.push(this);
        }
        observe(target, options) { this.options = options; }
        disconnect() { this.disconnected = true; }
    }
    const source = readFileSync(join(__dirname, '../src/utils/select2.ts'), 'utf8')
        .replace(/^import .*;\r?\n/gm, '')
        .replace(/^export /gm, '');
    const context = {
        $: jquery, select2Factory: () => {}, window: {}, document: {},
        HTMLSelectElement: Select, Element: Select, MutationObserver: Observer,
        setTimeout,
    };
    runInNewContext(stripTypeScriptTypes(source), context);
    return { context, Select, observers };
}

test('All / Select toggles do not recurse or observe their own disabled writes', () => {
    const { context, Select, observers } = setup();
    const select = new Select();
    context.enhanceSelect(select);
    for (let i = 0; i < 100; i++) {
        select.disabled = true;
        assert.equal(select.disabled, true);
        select.disabled = false;
        assert.equal(select.disabled, false);
    }
    assert.equal(observers[0].options.attributes, undefined);
    select.value = '2';
    assert.equal(select.value, '2');
    assert.equal(select.changes, 1);
    observers[0].callback([]);
    assert.equal(select.changes, 2);
});

test('navigation cleans up watchers and handlers before enhancing again', () => {
    const { context, Select, observers } = setup();
    const select = new Select();
    context.enhanceSelect(select);
    context.destroySelect2({ querySelectorAll: () => [select] });
    assert.equal(observers[0].disconnected, true);
    assert.equal(select.handlers.size, 0);
    assert.equal(Object.hasOwn(select, 'value'), false);
    context.enhanceSelect(select);
    assert.equal(select.handlers.size, 1);
    assert.equal(observers.length, 2);
});
