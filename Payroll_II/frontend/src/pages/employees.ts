import { canEmployee } from '../services/auth.ts';
import { api } from '../services/api.ts';
import { esc, money, errMsg, qs, CATEGORY, emptyState, confirmModal } from '../utils/ui.ts';
import type { Employee, Paged, PageContext } from '../types.ts';

// Render employee list page with search and pagination
export async function render(el: HTMLElement, ctx: PageContext): Promise<void> {
    let search = '';
    let page = 1;
    let result: Paged<Employee> | null = null;
    let timer: number | undefined;

    el.innerHTML = `
      <div class="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-3">
        <div>
          <h4 class="page-title">Employees</h4>
          <div class="page-sub" id="count">&nbsp;</div>
        </div>
        ${canEmployee('add') ? `<a href="/employees/new" data-link class="btn btn-primary"><i class="bi bi-plus-lg me-1"></i> Add Employee</a>` : ''}
      </div>
      <div id="err"></div>
      <div class="card-soft fade-in">
        <div style="border-bottom:1px solid var(--line);padding:16px 22px">
          <div class="input-group" style="max-width:420px">
            <span class="input-group-text"><i class="bi bi-search"></i></span>
            <input id="search" class="form-control" placeholder="Search by name, employee no, NIC, designation" />
          </div>
        </div>
        <div class="table-responsive">
          <table class="table table-clean">
            <thead>
              <tr>
                <th>Emp No</th>
                <th>Name</th>
                <th>Category</th>
                <th>Department</th>
                <th>Designation</th>
                <th class="text-end">Basic Salary</th>
                <th>Status</th>
                <th class="text-end">Actions</th>
              </tr>
            </thead>
            <tbody id="rows"></tbody>
          </table>
        </div>
        <div id="pager"></div>
      </div>`;

    const $ = <T extends HTMLElement = HTMLElement>(s: string): T => qs<T>(el, s);

    // Fetch employee data from API
    async function load(): Promise<void> {
        $('#rows').innerHTML = '<tr><td colspan="8" class="text-center text-muted py-5">Loading...</td></tr>';
        $('#err').innerHTML = '';
        try {
            const r = await api.list(search, page);
            if (!ctx.alive()) return;
            result = r;
            draw();
        } catch (e) {
            if (!ctx.alive()) return;
            $('#err').innerHTML = `<div class="alert alert-danger py-2">${esc(errMsg(e))}</div>`;
            $('#rows').innerHTML = '';
        }
    }

    // Render employee rows and pagination controls
    function draw(): void {
        if (!result) return;

        $('#count').textContent = `${result.total} employees in total`;

        if (result.data.length) {
            $('#rows').innerHTML = result.data.map(row).join('');
        } else {
            $('#rows').innerHTML = `<tr><td colspan="8">${emptyState('No employees found', 'Try a different search term.')}</td></tr>`;
        }

        if (result.totalPages > 1) {
            const prevDisabled = page <= 1 ? 'disabled' : '';
            const nextDisabled = page >= result.totalPages ? 'disabled' : '';

            $('#pager').innerHTML = `
              <div class="card-body-pad d-flex justify-content-between align-items-center">
                <div class="text-muted small">Page ${result.page} of ${result.totalPages}</div>
                <div class="btn-group">
                  <button class="btn btn-outline-secondary btn-sm" data-page="${page - 1}" ${prevDisabled}><i class="bi bi-chevron-left"></i> Prev</button>
                  <button class="btn btn-outline-secondary btn-sm" data-page="${page + 1}" ${nextDisabled}>Next <i class="bi bi-chevron-right"></i></button>
                </div>
              </div>`;
        } else {
            $('#pager').innerHTML = '';
        }
    }

    // Generate single employee table row
    const row = (e: Employee): string => {
        const isActive = e.empactflg === 'Y';
        const statusClass = isActive ? 'badge-soft-green' : 'badge-soft-red';
        const statusText = isActive ? 'Active' : 'Inactive';

        return `
          <tr>
            <td class="fw-semibold">${e.empeno}</td>
            <td>
              <div class="d-flex align-items-center gap-2">
                <span class="avatar av${e.empsno % 5}">${esc((e.empnam || '?').charAt(0).toUpperCase())}</span>
                <div>
                  <div class="fw-semibold" style="color:var(--ink)">${esc(e.empnam)}</div>
                  <div class="text-muted small">${esc(e.empidno || e.empdesig || '')}</div>
                </div>
              </div>
            </td>
            <td><span class="badge badge-soft-blue">${esc(CATEGORY[e.empcat] ?? e.empcat)}</span></td>
            <td>
              <div>${esc(e.department_name ?? '-')}</div>
              <div class="text-muted small">${esc(e.location_name ?? '')}</div>
            </td>
            <td>${esc(e.empdesig || '-')}</td>
            <td class="text-end">${money(e.empsal, 2)}</td>
            <td><span class="badge ${statusClass}"><i class="dot"></i>${statusText}</span></td>
            <td class="text-end text-nowrap">
              <a href="/employees/${e.empsno}" data-link class="btn btn-outline-secondary btn-sm icon-btn me-1" title="View"><i class="bi bi-eye"></i></a>
              ${canEmployee('amend') ? `<a href="/employees/${e.empsno}/edit" data-link class="btn btn-outline-primary btn-sm icon-btn me-1" title="Edit"><i class="bi bi-pencil"></i></a>` : ''}
              ${canEmployee('delete') ? `<button class="btn btn-outline-danger btn-sm icon-btn" title="Delete" data-del="${e.empsno}"><i class="bi bi-trash"></i></button>` : ''}
            </td>
          </tr>`;
    };

    // Debounced search input handler
    $<HTMLInputElement>('#search').oninput = (e) => {
        clearTimeout(timer);
        const value = (e.target as HTMLInputElement).value.trim();
        timer = window.setTimeout(() => {
            search = value;
            page = 1;
            void load();
        }, 350);
    };

    // Pagination and delete button click handler
    el.addEventListener('click', async (e) => {
        const target = e.target as HTMLElement;
        const pg = target.closest<HTMLButtonElement>('[data-page]');
        if (pg && !pg.disabled) {
            page = Number(pg.dataset.page);
            return load();
        }

        const del = target.closest<HTMLElement>('[data-del]');
        if (!del || !result) return;

        const emp = result.data.find((x) => x.empsno === Number(del.dataset.del));
        if (!emp) return;

        const confirmed = await confirmModal({
            title: 'Delete employee',
            message: `Delete ${emp.empnam} (Emp No ${emp.empeno})? This cannot be undone.`
        });
        if (!confirmed) return;

        try {
            await api.remove(emp.empsno);
            if (result.data.length === 1 && page > 1) {
                page -= 1;
            }
            await load();
        } catch (err) {
            $('#err').innerHTML = `<div class="alert alert-danger py-2">${esc(errMsg(err))}</div>`;
        }
    });

    await load();
}
