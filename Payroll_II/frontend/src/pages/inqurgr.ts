import { request } from '../services/api.ts';
import { alertBox, errMsg, esc, loading, qs } from '../utils/ui.ts';
import type { PageContext } from '../types.ts';

type User = { usdsno: number; usdusd: string; usdnam: string };
const flags = ['usryn', 'usraddyn', 'usrameyn', 'usrdelyn'] as const;
const labels = ['View', 'Add', 'Amend', 'Delete'];
type Program = {
    prgnam: string; prgdes: string; prgorder: string; prglvl: string;
    module: string | null; submodule: string | null;
} & Record<typeof flags[number], string | null>;
type Checked = { rows: Program[]; usdadmin: boolean; usdnam: string; usrusdsnoauto: string };
const api = '/administration/usrenter';

export async function render(el: HTMLElement, ctx: PageContext): Promise<void> {
    el.innerHTML = loading('Loading users...');
    let users: User[];
    try {
        users = await request<User[]>(`${api}/users`);
    } catch (error) {
        if (ctx.alive()) el.innerHTML = alertBox(errMsg(error));
        return;
    }
    if (!ctx.alive()) return;

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
          <i class="bi bi-arrow-left me-2" aria-hidden="true"></i>Back to User Rights
        </a>
      </div>
      <form id="inquiry-form" class="card-soft p-4 mb-4 admin-records" novalidate>
        <div class="admin-records-heading"><h5>1. Select user</h5></div>
        <div class="row g-3 align-items-end">
          <div class="col-md-9">
            <label class="form-label" for="inquiry-user">User</label>
            <select id="inquiry-user" class="form-select" required>
              <option value="">Select a user...</option>
              ${users.map(user => `<option value="${esc(user.usdsno)}">${esc(user.usdusd)} - ${esc(user.usdnam)}</option>`).join('')}
            </select>
          </div>
          <div class="col-md-3">
            <button id="inquiry-check" type="submit" class="btn btn-primary" ${users.length ? '' : 'disabled'}><i class="bi bi-search me-2" aria-hidden="true"></i>CHECK</button>
          </div>
        </div>
        ${users.length ? '' : '<p class="text-muted mt-3 mb-0">No users available.</p>'}
      </form>
      <div id="inquiry-notice" role="status" aria-live="polite"></div>
      <section class="card-soft p-3 admin-records">
        <div class="admin-records-heading">
          <h5>2. View program rights</h5>
          <span id="inquiry-summary" aria-live="polite">No user checked</span>
        </div>
        <p class="text-muted small">Single: View only &middot; Multi: View / Add / Amend / Delete</p>
        <div id="inquiry-admin-note"></div>
        <div id="inquiry-matrix"><div class="usr-empty"><i class="bi bi-shield-check"></i><h6>Select a user and press CHECK to view their rights.</h6></div></div>
      </section>`;

    const userSelect = qs<HTMLSelectElement>(el, '#inquiry-user');
    const check = qs<HTMLButtonElement>(el, '#inquiry-check');
    const notice = qs(el, '#inquiry-notice');
    const summary = qs(el, '#inquiry-summary');
    const adminNote = qs(el, '#inquiry-admin-note');
    const matrix = qs(el, '#inquiry-matrix');
    let version = 0;

    userSelect.addEventListener('change', () => {
        version++;
        check.disabled = false;
        matrix.removeAttribute('aria-busy');
        notice.innerHTML = '';
        adminNote.innerHTML = '';
        summary.textContent = 'Press CHECK to load this selection';
        matrix.innerHTML = '<div class="usr-empty"><h6>Press CHECK to view the selected user\'s rights.</h6></div>';
    });

    qs<HTMLFormElement>(el, '#inquiry-form').addEventListener('submit', async event => {
        event.preventDefault();
        if (check.disabled) return;
        if (!userSelect.value) {
            notice.innerHTML = alertBox('Select a user first.');
            return;
        }
        const currentVersion = ++version;
        check.disabled = true;
        notice.innerHTML = '';
        adminNote.innerHTML = '';
        summary.textContent = 'Loading rights...';
        matrix.innerHTML = loading('Loading user rights...');
        matrix.setAttribute('aria-busy', 'true');
        try {
            const query = new URLSearchParams({ usrusdsno: userSelect.value, modopt: 'A', smodopt: 'A' });
            const result = await request<Checked>(`${api}?${query}`);
            if (!ctx.alive() || currentVersion !== version) return;
            summary.textContent = `${result.usrusdsnoauto} - ${result.usdnam} | ${result.rows.length} programs`;
            adminNote.innerHTML = result.usdadmin
                ? '<div class="alert alert-info py-2 small">Administrator account: saved rights below override default access.</div>' : '';
            matrix.innerHTML = result.rows.length ? `
              <div class="table-responsive usr-table-wrap">
                <table class="table table-clean usr-table">
                  <caption class="visually-hidden">Program rights for ${esc(result.usrusdsnoauto)} - ${esc(result.usdnam)}</caption>
                  <thead><tr><th>#</th><th>Module / Submodule</th><th>Order</th><th>Program name</th><th>Description</th>
                    ${labels.map(label => `<th class="text-center">${label}</th>`).join('')}
                  </tr></thead>
                  <tbody>${result.rows.map((row, index) => `
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
                    </tr>`).join('')}</tbody>
                </table>
              </div>` : '<div class="usr-empty"><i class="bi bi-grid"></i><h6>No programs for this user</h6></div>';
        } catch (error) {
            if (!ctx.alive() || currentVersion !== version) return;
            notice.innerHTML = alertBox(errMsg(error));
            summary.textContent = 'Unable to load rights';
            matrix.innerHTML = '<div class="usr-empty"><p>Press CHECK to try again.</p></div>';
        } finally {
            if (ctx.alive() && currentVersion === version) {
                check.disabled = false;
                matrix.removeAttribute('aria-busy');
            }
        }
    });
}
