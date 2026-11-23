import { request } from '../services/api.ts';
import { can, currentUser } from '../services/auth.ts';
import { esc, qs, errMsg, alertBox, loading, confirmModal } from '../utils/ui.ts';
import type { PageContext } from '../types.ts';

type Row = Record<string, string | number | boolean | null>;
type Lookups = { modules: Row[]; submodules: Row[]; locations: Row[]; programOptions: Row[] };

const flags = ['usryn', 'usraddyn', 'usrameyn', 'usrdelyn'];
const flagLabels = ['View', 'Add', 'Amend', 'Delete'];

// API helper for administration endpoints
const call = <T>(path: string, method = 'GET', body?: unknown) =>
    request<T>('/administration' + path, {
        method,
        ...(body ? { body: JSON.stringify(body) } : {})
    });

// User form fields config: [database_field, label, max_length]
const userFields: [string, string, number][] = [
    ['usdusd', 'User code', 8],
    ['usdnam', 'Full name', 50],
    ['usduno', 'User number', 3],
    ['usdad1', 'Address line 1', 50],
    ['usdad2', 'Address line 2', 50],
    ['usdad3', 'Address line 3', 50],
    ['usdtel', 'Telephone', 25],
    ['usdfax', 'Fax', 25],
    ['usdmail', 'Email', 25],
    ['usdnic', 'NIC number', 10],
    ['usddes', 'Designation', 25]
];

// Generate dropdown <option> HTML tags
function options(rows: Row[], value: string, label: string, selected: unknown, first = 'Select…'): string {
    const defaultOption = `<option value="">${esc(first)}</option>`;
    const list = rows.map((r) => {
        const isSelected = String(r[value]) === String(selected) ? 'selected' : '';
        return `<option value="${esc(r[value])}" ${isSelected}>${esc(r[label])}</option>`;
    }).join('');
    return defaultOption + list;
}

// Generate <select> dropdown markup
function select(name: string, label: string, html: string, required = false): string {
    return `
    <div class="col-md-6">
      <label class="form-label" for="${name}">${label}</label>
      <select class="form-select" id="${name}" name="${name}" ${required ? 'required' : ''}>
        ${html}
      </select>
    </div>`;
}

// Generate <input> markup
function input(name: string, label: string, value: unknown, max: number, required = false, type = 'text', readonly = false): string {
    return `
    <div class="col-md-6">
      <label class="form-label" for="${name}">${label}</label>
      <input class="form-control" id="${name}" name="${name}" type="${type}" maxlength="${max}" 
        value="${esc(value)}" ${required ? 'required' : ''} ${readonly ? 'readonly' : ''} 
        ${type === 'password' ? 'autocomplete="new-password"' : ''}>
    </div>`;
}

// Render administration page (Programs, Users, Rights)
export async function render(el: HTMLElement, ctx: PageContext): Promise<void> {
    const mode = location.pathname.split('/').pop()!;
    const rights = mode === 'rights';
    const users = mode === 'users';
    const title = rights ? 'User Rights' : users ? 'User Master' : 'Program Master';

    let rows: Row[] = [];
    let lookups: Lookups;
    let editing: Row | null = null;
    let selectedUser = '';
    let version = 0;

    el.innerHTML = loading();

    try {
        const result = await Promise.all([
            call<Lookups>('/lookups'),
            call<Row[]>(users || rights ? '/users' : '/programs')
        ]);
        if (!ctx.alive()) return;
        lookups = result[0];
        rows = result[1];
    } catch (e) {
        if (ctx.alive()) el.innerHTML = alertBox(errMsg(e));
        return;
    }

    el.innerHTML = `
      <nav class="admin-tabs mb-3" aria-label="Administration">
        ${[
            ['programs', 'bi-grid', 'Programs'],
            ['users', 'bi-people', 'Users'],
            ['rights', 'bi-shield-lock', 'User rights']
        ].filter(([key]) => can(key as 'programs' | 'users' | 'rights')).map(([key, icon, label]) => `
            <a href="/administration/${key}" data-link class="${mode === key ? 'active' : ''}" ${mode === key ? 'aria-current="page"' : ''}>
              <i class="bi ${icon}" aria-hidden="true"></i>${label}
            </a>
        `).join('')}
      </nav>

      <div class="admin-banner d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
        <div class="d-flex align-items-center gap-3">
          <span class="admin-banner-icon"><i class="bi ${rights ? 'bi-shield-lock' : users ? 'bi-people' : 'bi-grid'}" aria-hidden="true"></i></span>
          <div>
            <div class="admin-eyebrow">Administration</div>
            <h4 class="page-title">${title}</h4>
            <div class="page-sub">${rights ? 'Manage access by user, module and program' : users ? 'Manage user profiles and sign-in details' : 'Register app pages here, then assign each user View, Add, Amend and Delete rights in User Rights'}</div>
          </div>
        </div>
        ${rights ? '<span class="admin-banner-note">Choose a user to manage permissions</span>' : can(users ? 'users' : 'programs', 'add') ? `<button id="add" class="btn btn-primary"><i class="bi bi-plus-lg me-1"></i>Add ${users ? 'user' : 'program'}</button>` : ''}
      </div>

      <div id="notice" role="status" aria-live="polite"></div>
      <div id="editor"></div>

      <div class="card-soft fade-in p-3 admin-records">
        <div class="admin-records-heading">
          <h5>${rights ? 'Permission matrix' : users ? 'User directory' : 'Program directory'}</h5>
          <span>${rights ? 'Changes apply to the programs shown below' : 'Search records or select Edit to make changes'}</span>
        </div>

        <div id="filters" class="row g-3 mb-3">
          ${rights ? select('user', 'User', options(rows, 'usdsno', 'usdusd', '', 'Select a user'), true) : ''}
          ${!users ? select('module', 'Module', options(lookups.modules, 'syssno', 'sysdes', '', 'All modules')) + select('submodule', 'Submodule', options(lookups.submodules, 'syssno', 'sysdes', '', 'All submodules')) : ''}
          <div class="col-md-6">
            <label for="search" class="form-label">Search</label>
            <input id="search" class="form-control" placeholder="Search ${users ? 'users' : 'programs'}">
          </div>
        </div>

        <div id="tools" class="d-flex flex-wrap gap-2 mb-3"></div>
        <div class="table-responsive">
          <table class="table table-clean">
            <thead id="head"></thead>
            <tbody id="rows"></tbody>
          </table>
        </div>
        <div id="count" class="text-muted small"></div>
      </div>`;

    const $ = <T extends HTMLElement = HTMLElement>(s: string) => qs<T>(el, s);
    const notice = (text: string, error = false) => {
        $('#notice').innerHTML = error ? alertBox(text) : `<div class="alert alert-success">${esc(text)}</div>`;
    };

    // Filter visible rows based on search and selected modules
    function visible(): Row[] {
        const search = $<HTMLInputElement>('#search').value.toLowerCase();
        const module = users ? '' : $<HTMLSelectElement>('#module').value;
        const submodule = users ? '' : $<HTMLSelectElement>('#submodule').value;

        return rows.filter((r) => {
            const matchesModule = !module || String(r.prgmodsno) === module;
            const matchesSubmodule = !submodule || String(r.prgsmdsno) === submodule;
            const matchesSearch = Object.values(r).some((v) => String(v ?? '').toLowerCase().includes(search));
            return matchesModule && matchesSubmodule && matchesSearch;
        });
    }

    // Render table headers and data rows
    function draw(): void {
        const list = rights && !selectedUser ? [] : visible();

        $('#head').innerHTML = `<tr>${(
            users
                ? ['Code', 'Name', 'Location', 'Telephone', 'Email', 'Role', 'Status', 'Actions']
                : rights
                ? ['Program', 'Module / submodule', ...flagLabels]
                : ['Code', 'Name / description', 'Module', 'Submodule', 'Order', 'Level', 'Actions']
        ).map((t, i) => `<th>${rights && i > 1 ? `<label class="d-flex align-items-center gap-2"><input class="form-check-input" type="checkbox" data-column="${flags[i - 2]}" aria-label="Select all shown ${t} permissions" ${list.length && list.filter((r) => (i === 2 ? r.prglvl === 'S' || r.prglvl === 'M' : r.prglvl === 'M')).length && list.filter((r) => (i === 2 ? r.prglvl === 'S' || r.prglvl === 'M' : r.prglvl === 'M')).every((r) => r[flags[i - 2]] === 'y') ? 'checked' : ''}>${t}</label>` : t}</th>`).join('')}</tr>`;

        $('#rows').innerHTML = list.length
            ? list.map((r) => {
                  if (users) {
                      const locationName = lookups.locations.find((l) => String(l.locsno) === String(r.usdcomsno))?.locnam || '—';
                      return `
                      <tr>
                        <td>${esc(r.usdusd)}</td>
                        <td>${esc(r.usdnam)}</td>
                        <td>${esc(locationName)}</td>
                        <td>${esc(r.usdtel)}</td>
                        <td>${esc(r.usdmail)}</td>
                        <td>${r.usdadmin ? 'Administrator' : 'User'}</td>
                        <td><span class="badge ${r.usdactive === 'Y' ? 'bg-success' : 'bg-secondary'}">${r.usdactive === 'Y' ? 'Active' : 'Inactive'}</span></td>
                        <td>${can('users', 'amend') ? `<button class="btn btn-sm btn-outline-primary" data-edit="${r.usdsno}">Edit</button>` : ''}</td>
                      </tr>`;
                  }
                  if (rights) {
                      return `
                      <tr>
                        <td>${esc(r.prgdes)}<div class="small text-muted">${esc(r.prgnam)} · ${r.prglvl === 'M' ? 'Multi' : 'Single'}</div></td>
                        <td>${esc(r.module)} / ${esc(r.submodule)}</td>
                        ${flags.map((f, i) => `<td><input type="checkbox" class="form-check-input" data-id="${r.prgsno}" data-flag="${f}" aria-label="${flagLabels[i]} ${esc(r.prgdes)}" ${r[f] === 'y' ? 'checked' : ''} ${r.prglvl === 'S' && i > 0 ? 'disabled' : ''}></td>`).join('')}
                      </tr>`;
                  }
                  return `
                  <tr>
                    <td>${r.prgsno}</td>
                    <td>${esc(r.prgnam)}<div class="small text-muted">${esc(r.prgdes)}</div></td>
                    <td>${esc(r.module)}</td>
                    <td>${esc(r.submodule)}</td>
                    <td>${esc(r.prgorder)}</td>
                    <td>${r.prglvl === 'M' ? 'Multi' : 'Single'}</td>
                    <td class="text-nowrap">
                      ${can('programs', 'amend') ? `<button class="btn btn-sm btn-outline-primary" data-edit="${r.prgsno}">Edit</button>` : ''}
                      ${can('programs', 'delete') ? `<button class="btn btn-sm btn-outline-danger" data-delete="${r.prgsno}">Delete</button>` : ''}
                    </td>
                  </tr>`;
              }).join('')
            : `<tr><td colspan="${users ? 8 : 7}" class="text-center py-5 text-muted">${rights && !selectedUser ? 'Select a user to load program rights.' : 'No records found.'}</td></tr>`;

        $('#count').textContent = `${list.length} records`;

        if (rights) {
            $('#tools').innerHTML = `
              <button class="btn btn-outline-primary" data-bulk="y" ${!selectedUser ? 'disabled' : ''}>Select all shown</button>
              <button class="btn btn-outline-secondary" data-bulk="n" ${!selectedUser ? 'disabled' : ''}>Clear shown</button>
              <button class="btn btn-primary" id="save-rights" ${!list.length ? 'disabled' : ''}>Save shown rights</button>
              <button class="btn btn-outline-danger" id="delete-rights" ${!list.length ? 'disabled' : ''}>Delete shown rights</button>`;
        }
    }

    // Open add/edit record form
    function editor(row: Row | null): void {
        editing = row;
        const r = row ?? {};

        $('#editor').innerHTML = `
          <div class="card-soft p-4 mb-4 admin-editor">
            <div class="admin-records-heading">
              <h5>${row ? 'Edit' : 'Add'} ${users ? 'user' : 'program'} ${row ? esc(users ? r.usdusd : r.prgsno) : ''}</h5>
              <span>${users ? 'Profile, contact details and sign-in settings' : 'Module, display order and program details'}</span>
            </div>
            <form id="form">
              <div class="row g-3">
                ${users
                    ? userFields.map(([k, l, max]) => input(k, l, r[k], max, k === 'usdusd', k === 'usdmail' ? 'email' : 'text', k === 'usdusd' && !!row)).join('') +
                      input('usdpwd', row ? 'New password (leave blank to keep current)' : 'Password', '', 256, !row, 'password') +
                      select('usdcomsno', 'Location', options(lookups.locations, 'locsno', 'locnam', r.usdcomsno, 'No location')) +
                      select('usdactive', 'Status', `<option value="Y">Active</option><option value="N" ${r.usdactive === 'N' ? 'selected' : ''}>Inactive</option>`) +
                      (currentUser()?.access?.admin ? select('usdadmin', 'Role', `<option value="false">User</option><option value="true" ${r.usdadmin === true ? 'selected' : ''}>Administrator</option>`) : '')
                    : select('prgmodsno', 'Module', options(lookups.modules, 'syssno', 'sysdes', r.prgmodsno), true) +
                      select('prgsmdsno', 'Submodule', options(lookups.submodules, 'syssno', 'sysdes', r.prgsmdsno), true) +
                      input('prgorder', 'Order', r.prgorder, 5, true) +
                      select('prglvl', 'Permissions', `<option value="S" ${r.prglvl === 'S' ? 'selected' : ''}>View only</option><option value="M" ${r.prglvl !== 'S' ? 'selected' : ''}>View, Add, Amend and Delete</option>`) +
                      select('prgnam', 'Application page', options(lookups.programOptions, 'key', 'label', r.prgnam), true) +
                      input('prgdes', 'Description', r.prgdes, 60, true)}
              </div>
              <div id="form-error" class="mt-3" role="alert"></div>
              <div class="d-flex gap-2 mt-3">
                <button class="btn btn-primary" type="submit">Save</button>
                <button class="btn btn-light" type="button" id="cancel">Cancel</button>
              </div>
            </form>
            ${!users ? `
              <details class="mt-3">
                <summary>Add a module or submodule</summary>
                <form id="lookup-form" class="row g-2 mt-2">
                  <div class="col-md-3"><select name="sysrtp" class="form-select" aria-label="Type"><option value="32">Module</option><option value="33">Submodule</option></select></div>
                  <div class="col-md-3"><input name="sysrno" class="form-control" placeholder="Code" aria-label="Code" maxlength="10" required></div>
                  <div class="col-md-4"><input name="sysdes" class="form-control" placeholder="Description" aria-label="Description" maxlength="40" required></div>
                  <div class="col-md-2"><button class="btn btn-outline-primary">Add</button></div>
                </form>
              </details>` : ''}
          </div>`;

        $('#cancel').onclick = () => {
            $('#editor').innerHTML = '';
            editing = null;
        };

        $('#form').onsubmit = async (e) => {
            e.preventDefault();
            const form = e.currentTarget as HTMLFormElement;
            const body = Object.fromEntries(new FormData(form));
            const button = form.querySelector('button')!;
            button.disabled = true;

            try {
                await call(`/${mode}${editing ? '/' + editing[users ? 'usdsno' : 'prgsno'] : ''}`, editing ? 'PUT' : 'POST', body);
                rows = await call<Row[]>('/' + mode);
                if (!ctx.alive()) return;
                $('#editor').innerHTML = '';
                draw();
                notice('Record saved.');
            } catch (err) {
                if (ctx.alive()) $('#form-error').innerHTML = alertBox(errMsg(err));
            } finally {
                button.disabled = false;
            }
        };

        if (!users) {
            $('#lookup-form').onsubmit = async (e) => {
                e.preventDefault();
                const form = e.currentTarget as HTMLFormElement;
                const button = form.querySelector('button')!;
                button.disabled = true;

                try {
                    await call('/lookups', 'POST', Object.fromEntries(new FormData(form)));
                    lookups = await call<Lookups>('/lookups');
                    if (!ctx.alive()) return;

                    for (const [name, items] of [
                        ['prgmodsno', lookups.modules],
                        ['prgsmdsno', lookups.submodules]
                    ] as const) {
                        const field = $<HTMLSelectElement>('#' + name);
                        field.innerHTML = options(items, 'syssno', 'sysdes', field.value);
                    }

                    $('#module').innerHTML = options(lookups.modules, 'syssno', 'sysdes', '', 'All modules');
                    $('#submodule').innerHTML = options(lookups.submodules, 'syssno', 'sysdes', '', 'All submodules');
                    form.reset();
                    notice('Lookup added.');
                } catch (err) {
                    notice(errMsg(err), true);
                } finally {
                    button.disabled = false;
                }
            };
        }

        $('#editor').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    const addButton = el.querySelector<HTMLButtonElement>('#add');
    if (addButton) addButton.onclick = () => editor(null);
    $('#search').oninput = draw;

    if (!users) {
        $('#module').onchange = draw;
        $('#submodule').onchange = draw;
    }

    if (rights) {
        rows = [];
        $('#user').onchange = async () => {
            const current = ++version;
            selectedUser = $<HTMLSelectElement>('#user').value;
            rows = [];
            draw();
            if (!selectedUser) return;

            try {
                const data = await call<Row[]>('/rights/' + selectedUser);
                if (ctx.alive() && current === version) {
                    rows = data;
                    draw();
                }
            } catch (err) {
                if (ctx.alive() && current === version) notice(errMsg(err), true);
            }
        };
    }

    // Checkbox changes for rights
    el.addEventListener('change', (e) => {
        const t = e.target as HTMLInputElement;
        if (t.dataset.column) {
            for (const r of visible()) {
                if (t.dataset.column === 'usryn' ? r.prglvl === 'S' || r.prglvl === 'M' : r.prglvl === 'M') {
                    r[t.dataset.column] = t.checked ? 'y' : 'n';
                }
            }
            draw();
        }
        if (t.dataset.flag) {
            const r = rows.find((row) => String(row.prgsno) === t.dataset.id);
            if (r) r[t.dataset.flag] = t.checked ? 'y' : 'n';
        }
    });

    // Button clicks (Edit, Delete, Bulk select, Save rights)
    el.addEventListener('click', async (e) => {
        const t = (e.target as HTMLElement).closest<HTMLButtonElement>('button');
        if (!t) return;

        if (t.dataset.edit) {
            editor(rows.find((r) => String(r[users ? 'usdsno' : 'prgsno']) === t.dataset.edit)!);
            return;
        }

        try {
            if (t.dataset.delete) {
                const confirmed = await confirmModal({
                    title: 'Delete program?',
                    message: 'This removes the program and its assigned user rights.'
                });
                if (!confirmed) return;
                t.disabled = true;

                await call('/programs/' + t.dataset.delete, 'DELETE');
                rows = await call<Row[]>('/programs');
                if (ctx.alive()) {
                    draw();
                    notice('Program deleted.');
                }
                return;
            }

            if (t.dataset.bulk) {
                for (const r of visible()) {
                    flags.forEach((f, i) => {
                        if (r.prglvl === 'M' || (i === 0 && r.prglvl === 'S')) {
                            r[f] = t.dataset.bulk!;
                        }
                    });
                }
                draw();
                return;
            }

            if (t.id === 'save-rights' || t.id === 'delete-rights') {
                const clear = t.id === 'delete-rights';
                const user = selectedUser;
                const selected = visible().map((r) => ({
                    prgsno: r.prgsno,
                    ...Object.fromEntries(flags.map((f) => [f, r[f] === 'y' ? 'y' : 'n']))
                }));

                if (clear) {
                    const confirmed = await confirmModal({
                        title: 'Delete shown rights?',
                        message: `Remove rights for these ${selected.length} programs? Other programs remain unchanged.`
                    });
                    if (!confirmed) return;
                }

                t.disabled = true;
                await call('/rights/' + user, 'PUT', { rows: selected, clear });
                if (ctx.alive() && selectedUser === user) {
                    rows = await call<Row[]>('/rights/' + user);
                    draw();
                    notice('User rights saved.');
                }
            }
        } catch (err) {
            if (ctx.alive()) notice(errMsg(err), true);
        } finally {
            t.disabled = false;
        }
    });

    draw();
}
