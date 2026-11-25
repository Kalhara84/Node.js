import { request } from '../services/api.ts';
import { alertBox, errMsg, esc, loading, qs } from '../utils/ui.ts';
import type { PageContext } from '../types.ts';

type Usd = {
  usdsno: number; 
  usdusd: string; 
  usdnam: string 
};

type UsrFlag = 'usryn' | 'usraddyn' | 'usrameyn' | 'usrdelyn';

type Prg = {
    prgnam: string;
    prgdes: string;
    prgorder: string;
    prglvl: string;
    module: string | null;
    submodule: string | null;
} & Record<UsrFlag, string | null>;

type Scope = {
    usrusdsno: string;
    modopt: string;
    smodopt: string;
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

// Render User Rights inquiry page (view only)
export async function render(el: HTMLElement, ctx: PageContext): Promise<void> {
    el.innerHTML = loading('Loading users...');

    let users: Usd[];

    try {
        users = await request<Usd[]>(`${api}/users`);
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
          <span class="admin-banner-icon"><i class="bi bi-search" aria-hidden="true"></i></span>
          <div>
            <div class="admin-eyebrow">Administration</div>
            <h4 class="page-title">inquire User Rights-Given User</h4>
          </div>
        </div>
        <a href="/usrenter" data-link class="btn btn-outline-primary">
          <i class="bi bi-arrow-left me-2" aria-hidden="true"></i>Back
        </a>
      </div>
      <form name="inqurgr" id="inqurgr" class="card-soft p-4 mb-4 admin-records" novalidate>
        <div class="admin-records-heading"><h5>1. Select user</h5></div>
        <div class="row g-3 align-items-end">
          <div class="col-md-9">
            <label class="form-label" for="usrusdsno">User</label>
            <select id="usrusdsno" name="usrusdsno" class="form-select" required>
              <option value="">Select a user...</option>
              ${users.map((user) => `<option value="${esc(user.usdsno)}">${esc(user.usdusd)} - ${esc(user.usdnam)}</option>`).join('')}
            </select>
          </div>
          <div class="col-md-3">
            <button name="ok" type="submit" class="btn btn-primary" ${users.length ? '' : 'disabled'}><i class="bi bi-search me-2" aria-hidden="true"></i>CHECK</button>
          </div>
        </div>
        ${users.length ? '' : '<p class="text-muted mt-3 mb-0">No users available.</p>'}
      </form>
      <div id="notice" role="status" aria-live="polite"></div>
      <section class="card-soft p-3 admin-records">
        <div class="admin-records-heading">
          <h5>2. View program rights</h5>
          <span id="usr-summary" aria-live="polite">No user checked</span>
        </div>
        <p class="text-muted small">Single: View only &middot; Multi: View / Add / Amend / Delete</p>
        <div id="usr-admin-note"></div>
        <div id="usr-matrix">
          <div class="usr-empty">
            <i class="bi bi-shield-check"></i>
            <h6>Select a user and press CHECK to view their rights.</h6>
          </div>
        </div>
      </section>`;

    const form = qs<HTMLFormElement>(el, '#inqurgr');
    const notice = qs(el, '#notice');
    const matrix = qs(el, '#usr-matrix');
    const control = <T extends HTMLElement>(name: string) => qs<T>(form, `[name="${name}"]`);

    let te_scope: Scope | null = null;
    let te_rows: Prg[] = [];
    let te_busy = false;
    let te_version = 0;

    // Toggle form loading state
    function busy(value: boolean): void {
        te_busy = value;
        control<HTMLSelectElement>('usrusdsno').disabled = value;
        control<HTMLButtonElement>('ok').disabled = value || users.length === 0;
        form.setAttribute('aria-busy', String(value));
    }

    // Reset table when the selected user changes
    function invalidate(): void {
        te_version++;
        te_scope = null;
        te_rows = [];
        notice.innerHTML = '';
        qs(el, '#usr-admin-note').innerHTML = '';
        qs(el, '#usr-summary').textContent = 'Press CHECK to load this selection';
        matrix.innerHTML = '<div class="usr-empty"><h6>Press CHECK to view the selected user\'s rights.</h6></div>';
    }

    // Build scope for all modules and submodules of the selected user
    function selectedScope(): Scope {
        return {
            usrusdsno: control<HTMLSelectElement>('usrusdsno').value,
            modopt: 'A',
            smodopt: 'A'
        };
    }

    // Render permission matrix with disabled checkboxes
    function paint(): void {
        if (te_rows.length === 0) {
            matrix.innerHTML = '<div class="usr-empty"><i class="bi bi-grid"></i><h6>No programs for this user</h6></div>';
            return;
        }

        matrix.innerHTML = `
              <div class="table-responsive usr-table-wrap">
                <table class="table table-clean usr-table">
                  <caption class="visually-hidden">Program rights for ${esc(users.find((user) => String(user.usdsno) === te_scope?.usrusdsno)?.usdusd)}</caption>
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Module / Submodule</th>
                      <th>Order</th>
                      <th>Program name</th>
                      <th>Description</th>
                      ${labels.map((label) => `<th class="text-center">${label}</th>`).join('')}
                    </tr>
                  </thead>
                  <tbody>
                    ${te_rows.map((row, index) => `
                    <tr>
                      <td>${index + 1}</td>
                      <td>${esc(row.module)}<small class="d-block text-muted">${esc(row.submodule)}</small></td>
                      <td>${esc(row.prgorder)}</td>
                      <td><code>${esc(row.prgnam)}</code><span class="usr-level">${row.prglvl === 'S' ? 'Single' : row.prglvl === 'M' ? 'Multiple' : 'Unspecified'}</span></td>
                      <td class="usr-description">${esc(row.prgdes)}</td>
                      ${flags.map((flag, flagIndex) => `<td class="text-center">
                        <input type="checkbox" class="form-check-input" disabled
                          ${(row.prglvl === 'M' || (row.prglvl === 'S' && flag === 'usryn')) && row[flag] === 'y' ? 'checked' : ''}
                          aria-label="${labels[flagIndex]}: ${esc(row.prgdes || row.prgnam)}">
                      </td>`).join('')}
                    </tr>`).join('')}
                  </tbody>
                </table>
              </div>`;
    }

    // Load saved rights for the chosen user
    async function load(scope: Scope): Promise<void> {
        const version = ++te_version;
        const result = await request<Checked>(`${api}?${new URLSearchParams(scope)}`);
        if (!ctx.alive() || version !== te_version) {
            return;
        }

        te_scope = scope;
        te_rows = result.rows;

        qs(el, '#usr-summary').textContent = `${result.usrusdsnoauto} - ${result.usdnam} | ${te_rows.length} programs`;
        qs(el, '#usr-admin-note').innerHTML = result.usdadmin
            ? '<div class="alert alert-info py-2 small">Administrator account: saved rights below override default access.</div>'
            : '';

        paint();
    }

    // Reset the inquiry when a different user is selected
    form.addEventListener('change', () => {
        invalidate();
    });

    // Handle form submit (CHECK action)
    form.onsubmit = async (event) => {
        event.preventDefault();
        if (te_busy) {
            return;
        }

        const scope = selectedScope();
        if (!scope.usrusdsno) {
            notice.innerHTML = alertBox('Select a user first.');
            return;
        }

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
}
