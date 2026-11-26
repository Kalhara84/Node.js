import { request } from '../services/api.ts';
import { can } from '../services/auth.ts';
import { alertBox, confirmModal, errMsg, esc, loading, qs } from '../utils/ui.ts';
import type { PageContext } from '../types.ts';

type Lookup = { syssno: number; sysdes: string };
type Usd = { usdsno: number; usdusd: string; usdnam: string };
type UsrFlag = 'usryn' | 'usraddyn' | 'usrameyn' | 'usrdelyn';
type Prg = {
    prgsno: number;
    prgnam: string;
    prgdes: string;
    prgorder: string;
    prglvl: string;
    module: string | null;
    submodule: string | null;
} & Record<UsrFlag, string | null>;

type Scope = {
    usrusdsno: string;
    usrusdsnoauto: string;
    modopt: string;
    smodopt: string;
    modsno: string;
    modsnoauto: string;
    submodsno: string;
    submodsnoauto: string;
};

type Checked = {
    rows: Prg[];
    usdadmin: boolean;
    usdnam: string;
    usrusdsnoauto: string;
};

const flags: UsrFlag[] = ['usryn', 'usraddyn', 'usrameyn', 'usrdelyn'];
const labels = ['View', 'Add', 'Amend', 'Delete'];
const api = '/administration/usrenter';

// Helper to render <option> elements from lookup list
function options(rows: Lookup[]): string {
    return '<option value="">Select...</option>' + rows.map((row) => `<option value="${row.syssno}">${esc(row.sysdes)}</option>`).join('');
}

// Scope filter component (All vs Select radio buttons with dropdown)
function scopePicker(name: string, field: string, label: string, rows: Lookup[]): string {
    return `
    <div class="col-md-6">
      <div class="d-flex justify-content-between gap-2 mb-2">
        <span class="form-label mb-0" id="${name}-label">${label}</span>
        <div class="d-flex gap-3" role="group" aria-labelledby="${name}-label">
          <label class="small"><input class="form-check-input me-1" type="radio" name="${name}" value="A" checked>All</label>
          <label class="small"><input class="form-check-input me-1" type="radio" name="${name}" value="S">Select</label>
        </div>
      </div>
      <select class="form-select" name="${field}" id="${field}" aria-labelledby="${name}-label" disabled>${options(rows)}</select>
      <input type="hidden" name="${field}auto">
    </div>`;
}

// Render legacy User Rights permission matrix page
export async function render(el: HTMLElement, ctx: PageContext): Promise<void> {
    el.innerHTML = loading('Loading user rights...');

    let lookups: { modules: Lookup[]; submodules: Lookup[] };
    let users: Usd[];

    try {
        [lookups, users] = await Promise.all([
            request<typeof lookups>('/administration/lookups'),
            request<Usd[]>('/administration/usrenter/users')
        ]);
    } catch (error) {
        if (ctx.alive()) {
            el.innerHTML = alertBox(errMsg(error));
        }
        return;
    }

    if (!ctx.alive()) {
        return;
    }

    el.innerHTML = `
      <div class="admin-banner d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
        <div class="d-flex align-items-center gap-3">
          <span class="admin-banner-icon"><i class="bi bi-shield-lock"></i></span>
          <div>
            <div class="admin-eyebrow">Administration</div>
            <h4 class="page-title">User Rights</h4>
            <div class="page-sub">Choose a user, check programs and assign access.</div>
          </div>
        </div>
        <div class="d-flex flex-wrap align-items-center gap-2">
         <a href="/inqurgr" data-link id="inquire-user-rights" class="btn btn-primary">
          <i class="bi bi-search me-2" aria-hidden="true"></i>inquire User Rights-Given User
        </a>
        <a href="/inqurgr2" data-link id="inquire-user-rights" class="btn btn-primary">
          <i class="bi bi-search me-2" aria-hidden="true"></i>inquire User Rights-Given User2
        </a>
        </div>
      </div>

      <div id="notice" role="status" aria-live="polite"></div>

      <form name="usrenter" id="usrenter">
        <fieldset id="usrenter-controls">
          <!-- Step 1: User & Scope filter -->
          <section class="card-soft p-4 mb-4 admin-records">
            <div class="admin-records-heading">
              <h5>1. Select user and programs</h5>
              <span>All modules or a selected module / submodule</span>
            </div>
            <div class="row g-3">
              <div class="col-md-6">
                <label for="usrusdsno" class="form-label">User code</label>
                <select class="form-select" id="usrusdsno" name="usrusdsno" required>
                  <option value="">Select a user...</option>
                  ${users.map((user) => `<option value="${user.usdsno}">${esc(user.usdusd)} - ${esc(user.usdnam)}</option>`).join('')}
                </select>
                <input type="hidden" name="usrusdsnoauto">
              </div>
              <div class="col-md-6">
                <label for="usdnam" class="form-label">User name</label>
                <input class="form-control" id="usdnam" readonly placeholder="Select a user">
              </div>
              ${scopePicker('modopt', 'modsno', 'Module', lookups.modules)}
              ${scopePicker('smodopt', 'submodsno', 'Submodule', lookups.submodules)}
            </div>
            <div class="d-flex flex-wrap justify-content-between gap-3 align-items-center mt-4">
              <span class="text-muted small">Select CHECK after changing the user or scope.</span>
              <button class="btn btn-primary" name="ok" type="submit"><i class="bi bi-search me-2"></i>CHECK</button>
            </div>
          </section>

          <!-- Step 2: Permission Matrix -->
          <section class="card-soft p-3 admin-records">
            <div class="admin-records-heading">
              <h5>2. Assign program rights</h5>
              <span id="usr-summary" aria-live="polite">No user checked</span>
            </div>
            <div id="usr-tools" class="d-flex flex-wrap gap-2 mb-3" hidden>
              <button type="button" class="btn btn-sm btn-outline-primary" name="check_all">Check all</button>
              <button type="button" class="btn btn-sm btn-outline-secondary" name="clear_all">Clear all</button>
              <span class="text-muted small align-self-center ms-md-auto">Single: View only &middot; Multi: View / Add / Amend / Delete</span>
            </div>
            <div id="usr-admin-note"></div>
            <div id="usr-matrix">
              <div class="usr-empty">
                <i class="bi bi-shield-check"></i>
                <h6>Check a user's programs to begin</h6>
                <p>Select a user and press CHECK to load their saved rights.</p>
              </div>
            </div>
            <input type="hidden" name="hcount" value="0">
            <input type="hidden" name="hcountmod" value="0">

            <div id="usr-actions" class="usr-actions mt-3 pt-3 d-flex flex-wrap justify-content-between align-items-center gap-3" hidden>
              <span id="usr-changes" class="text-muted small" aria-live="polite"></span>
              <div class="d-flex flex-wrap gap-2">
                <button type="button" name="delete" class="btn btn-outline-danger" ${can('rights', 'delete') ? '' : 'disabled'}><i class="bi bi-trash me-1"></i>DELETE</button>
                <button type="button" name="reset" class="btn btn-light">RESET</button>
                <button type="button" name="save" class="btn btn-primary" ${can('rights', 'amend') ? '' : 'disabled'}><i class="bi bi-check2 me-1"></i>SAVE</button>
              </div>
            </div>
          </section>
        </fieldset>
      </form>`;

    const form = qs<HTMLFormElement>(el, '#usrenter');
    const controls = qs<HTMLFieldSetElement>(form, '#usrenter-controls');
    const notice = qs(el, '#notice');
    const matrix = qs(el, '#usr-matrix');
    const control = <T extends HTMLElement>(name: string) => qs<T>(form, `[name="${name}"]`);

    let te_scope: Scope | null = null;
    let te_rows: Prg[] = [];
    let te_saved: Prg[] = [];
    let te_busy = false;
    let te_version = 0;

    // Check if permission flag is editable based on Single or Multiple program level
    const editable = (row: Prg, flag: UsrFlag) =>
        row.prglvl === 'M' || (row.prglvl === 'S' && flag === 'usryn');

    // Enable/disable dropdowns based on All / Select radio choices
    function selectors(): void {
        for (const [radio, selectName] of [
            ['modopt', 'modsno'],
            ['smodopt', 'submodsno']
        ]) {
            const selected = qs<HTMLInputElement>(form, `[name="${radio}"]:checked`).value === 'S';
            control<HTMLSelectElement>(selectName).disabled = !selected;
            control<HTMLSelectElement>(selectName).required = selected;
        }
    }

    // Toggle form loading state
    function busy(value: boolean): void {
        te_busy = value;
        controls.disabled = value;
        form.setAttribute('aria-busy', String(value));
        selectors();
    }

    // Update status indicators and column header checkbox states
    function status(): void {
        let changed = 0;
        for (const [index, row] of te_rows.entries()) {
            if (flags.some((flag) => editable(row, flag) && (row[flag] === 'y') !== (te_saved[index]?.[flag] === 'y'))) {
                changed++;
            }
        }

        qs(el, '#usr-changes').textContent = changed ? `${changed} program(s) with unsaved changes` : 'Saved rights loaded';

        for (const flag of flags) {
            const checkbox = matrix.querySelector<HTMLInputElement>(`[data-column="${flag}"]`);
            if (!checkbox) {
                continue;
            }
            const applicable = te_rows.filter((row) => editable(row, flag));
            const checkedCount = applicable.filter((row) => row[flag] === 'y').length;
            checkbox.disabled = applicable.length === 0;
            checkbox.checked = applicable.length > 0 && checkedCount === applicable.length;
            checkbox.indeterminate = checkedCount > 0 && checkedCount < applicable.length;
        }
    }

    // Render permission checkboxes matrix table
    function paint(): void {
        control<HTMLInputElement>('hcount').value = String(te_rows.length);
        qs(el, '#usr-tools').hidden = te_rows.length === 0;
        qs(el, '#usr-actions').hidden = te_rows.length === 0;

        if (te_rows.length === 0) {
            matrix.innerHTML = `
              <div class="usr-empty">
                <i class="bi bi-grid"></i>
                <h6>No programs in this selection</h6>
                <p>Change the module / submodule and press CHECK.</p>
              </div>`;
            return;
        }

        matrix.innerHTML = `
          <div class="table-responsive usr-table-wrap">
            <table class="table table-clean usr-table">
              <caption class="visually-hidden">Program rights for ${esc(te_scope?.usrusdsnoauto)}</caption>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Module / Submodule</th>
                  <th>Order</th>
                  <th>Program name</th>
                  <th>Description</th>
                  ${flags.map((flag, index) => `
                    <th class="text-center">
                      <label>
                        <input class="form-check-input d-block mx-auto mb-2" type="checkbox" data-column="${flag}" aria-label="Select all ${labels[index]} rights">
                        ${labels[index]}
                      </label>
                    </th>
                  `).join('')}
                </tr>
              </thead>
              <tbody>
                ${te_rows.map((row, index) => `
                  <tr>
                    <td>${index + 1}<input type="hidden" name="prgsno[${index}]" value="${row.prgsno}"></td>
                    <td>${esc(row.module)}<small class="d-block text-muted">${esc(row.submodule)}</small></td>
                    <td>${esc(row.prgorder)}</td>
                    <td><code>${esc(row.prgnam)}</code><span class="usr-level">${row.prglvl === 'S' ? 'Single' : row.prglvl === 'M' ? 'Multiple' : 'Unspecified'}</span></td>
                    <td class="usr-description">${esc(row.prgdes)}</td>
                    ${flags.map((flag, flagIndex) => `
                      <td class="text-center">
                        <input type="checkbox" class="form-check-input" id="${flag}[${index}]" name="${flag}[${index}]"
                          data-row="${index}" data-flag="${flag}"
                          ${editable(row, flag) ? '' : 'disabled'}
                          ${editable(row, flag) && row[flag] === 'y' ? 'checked' : ''}
                          aria-label="${labels[flagIndex]}: ${esc(row.prgdes || row.prgnam)}">
                      </td>
                    `).join('')}
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>`;

        status();
    }

    // Reset table when filter changes
    function invalidate(): void {
        te_version++;
        te_scope = null;
        te_rows = [];
        te_saved = [];
        qs(el, '#usr-tools').hidden = true;
        qs(el, '#usr-actions').hidden = true;
        qs(el, '#usr-admin-note').innerHTML = '';
        qs(el, '#usr-summary').textContent = 'Press CHECK to load this selection';
        matrix.innerHTML = '<div class="usr-empty"><i class="bi bi-arrow-repeat"></i><h6>Selection updated</h6><p>Press CHECK to load the saved rights.</p></div>';
        notice.innerHTML = '';
        selectors();
    }

    // Build scope object from current form values
    function selectedScope(): Scope {
        const text = (name: string) => control<HTMLSelectElement>(name).selectedOptions[0]?.textContent ?? '';
        const scope = {
            usrusdsno: control<HTMLSelectElement>('usrusdsno').value,
            usrusdsnoauto: users.find((user) => String(user.usdsno) === control<HTMLSelectElement>('usrusdsno').value)?.usdusd ?? '',
            modopt: qs<HTMLInputElement>(form, '[name="modopt"]:checked').value,
            smodopt: qs<HTMLInputElement>(form, '[name="smodopt"]:checked').value,
            modsno: control<HTMLSelectElement>('modsno').value,
            modsnoauto: text('modsno'),
            submodsno: control<HTMLSelectElement>('submodsno').value,
            submodsnoauto: text('submodsno')
        };

        for (const name of ['usrusdsnoauto', 'modsnoauto', 'submodsnoauto'] as const) {
            control<HTMLInputElement>(name).value = scope[name];
        }
        return scope;
    }

    // Load rights for the chosen scope
    async function load(scope: Scope): Promise<void> {
        const version = ++te_version;
        const result = await request<Checked>(`${api}?${new URLSearchParams(scope)}`);
        if (!ctx.alive() || version !== te_version) {
            return;
        }

        te_scope = scope;
        te_rows = result.rows;
        te_saved = result.rows.map((row) => ({ ...row }));

        qs(el, '#usr-summary').textContent = `${result.usrusdsnoauto} - ${result.usdnam} | ${te_rows.length} programs`;
        qs(el, '#usr-admin-note').innerHTML = result.usdadmin
            ? '<div class="alert alert-info py-2 small">Administrator account: saved rights below override default access. Untick a page or action to block it for this administrator.</div>'
            : '';

        paint();
    }

    // Form change event handler
    form.addEventListener('change', (event) => {
        const target = event.target as HTMLInputElement;
        if (target.dataset.flag) {
            te_rows[Number(target.dataset.row)][target.dataset.flag as UsrFlag] = target.checked ? 'y' : 'n';
            status();
        } else if (target.dataset.column) {
            checkCol(target.checked, target.dataset.column as UsrFlag);
        } else {
            const user = users.find((row) => String(row.usdsno) === control<HTMLSelectElement>('usrusdsno').value);
            qs<HTMLInputElement>(el, '#usdnam').value = user?.usdnam ?? '';
            invalidate();
        }
    });

    // Check or uncheck an entire column
    function checkCol(checkyn: boolean, colnam: UsrFlag): void {
        for (const row of te_rows) {
            if (editable(row, colnam)) {
                row[colnam] = checkyn ? 'y' : 'n';
            }
        }
        paint();
    }

    // Check or uncheck all applicable flags
    function checkAll(checkyn: boolean): void {
        for (const row of te_rows) {
            for (const flag of flags) {
                if (editable(row, flag)) {
                    row[flag] = checkyn ? 'y' : 'n';
                }
            }
        }
        paint();
    }

    // Handle form submit (CHECK action)
    form.onsubmit = async (event) => {
        event.preventDefault();
        if (te_busy || !form.reportValidity()) {
            return;
        }

        const scope = selectedScope();
        notice.innerHTML = '';
        busy(true);

        try {
            await load(scope);
        } catch (error) {
            if (ctx.alive()) {
                invalidate();
                notice.innerHTML = alertBox(errMsg(error));
            }
        } finally {
            if (ctx.alive()) {
                busy(false);
            }
        }
    };

    control<HTMLButtonElement>('check_all').onclick = () => checkAll(true);
    control<HTMLButtonElement>('clear_all').onclick = () => checkAll(false);
    control<HTMLButtonElement>('reset').onclick = () => {
        te_rows = te_saved.map((row) => ({ ...row }));
        paint();
        notice.innerHTML = '';
    };

    // Save or delete permissions
    async function save(remove: boolean): Promise<void> {
        if (!can('rights', remove ? 'delete' : 'amend')) {
            return;
        }
        if (te_busy || !te_scope || !te_rows.length) {
            return;
        }
        const scope = { ...te_scope };
        const version = te_version;

        if (remove) {
            const confirmed = await confirmModal({
                title: 'Delete user rights?',
                message: `Remove all rights for ${scope.usrusdsnoauto} in the checked selection (${te_rows.length} programs)?`,
                confirmText: 'Delete rights'
            });
            if (!confirmed) {
                return;
            }
        }

        if (!ctx.alive() || version !== te_version || te_busy) {
            return;
        }

        const payload = {
            ...scope,
            save: !remove,
            delete: remove,
            hcount: te_rows.length,
            hcountmod: 0,
            prgsno: te_rows.map((row) => row.prgsno),
            ...Object.fromEntries(
                flags.map((flag) => [flag, te_rows.map((row) => (editable(row, flag) && row[flag] === 'y' ? 'y' : 'n'))])
            )
        };

        busy(true);
        notice.innerHTML = '';

        try {
            const result = await request<{ message: string }>(api, {
                method: 'POST',
                body: JSON.stringify(payload)
            });
            if (!ctx.alive()) {
                return;
            }

            try {
                await load(scope);
            } catch {
                invalidate();
                notice.innerHTML = alertBox(`${result.message}. Press CHECK to reload the saved rights.`);
                return;
            }

            if (ctx.alive()) {
                notice.innerHTML = `<div class="alert alert-success py-2">${esc(result.message)}</div>`;
            }
        } catch (error) {
            if (ctx.alive()) {
                notice.innerHTML = alertBox(errMsg(error));
            }
        } finally {
            if (ctx.alive()) {
                busy(false);
            }
        }
    }

    control<HTMLButtonElement>('save').onclick = () => {
        void save(false);
    };
    control<HTMLButtonElement>('delete').onclick = () => {
        void save(true);
    };
}
