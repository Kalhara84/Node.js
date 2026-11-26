import { request } from '../services/api.ts';
import { can } from '../services/auth.ts';
import { alertBox, confirmModal, errMsg, esc, loading, qs } from '../utils/ui.ts';
import { destroySelect2 } from '../utils/select2.ts';
import type { PageContext } from '../types.ts';

type Holiday = {
    holsno: number;
    holddt: string;
    holtypsno: number;
    holotrate: number;
    sysdes: string | null;
    holucdnew: string;
    holentddt: string | null;
    holenttime: string;
    holucdame: string;
    holameddt: string | null;
    holametime: string;
};

type HolidayType = {
    syssno: number;
    sysdes: string;
};

// Shared API helper for holiday endpoints
const call = <T>(path = '', method = 'GET', body?: unknown): Promise<T> => {
    return request<T>('/holidays' + path, {
        method,
        ...(body ? { body: JSON.stringify(body) } : {}),
    });
};

// Render holiday master management page
export async function render(el: HTMLElement, ctx: PageContext): Promise<void> {
    el.innerHTML = loading('Loading holidays...');

    let rows: Holiday[];
    let types: HolidayType[];
    try {
        [rows, types] = await Promise.all([
            call<Holiday[]>(),
            call<HolidayType[]>('/types'),
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

    let busy = false;
    const $ = <T extends HTMLElement = HTMLElement>(selector: string): T => qs<T>(el, selector);

    el.innerHTML = `
      <div class="d-flex justify-content-between align-items-start gap-3 mb-4">
        <div>
          <h3 class="mb-1">Holiday Master</h3>
          <p class="text-muted mb-0">Manage holiday dates, holiday types and overtime rates.</p>
        </div>
        ${can('a_holm', 'add') ? `
          <div class="d-flex gap-2">
            <button class="btn btn-outline-primary text-nowrap" id="add-all"><i class="bi bi-calendar-plus me-1"></i>Add All</button>
            <button class="btn btn-primary text-nowrap" id="add"><i class="bi bi-plus-lg me-1"></i>Add holiday</button>
          </div>` : ''}
      </div>
      <div id="notice" role="status"></div>
      <div id="editor"></div>
      <div class="card-soft p-4 mb-4">
        <div class="row g-3 align-items-end">
          <div class="col-md-6">
            <label class="form-label" for="search">Search holidays</label>
            <input id="search" type="search" class="form-control" placeholder="Search by date or holiday type">
          </div>
          <div class="col-md-4">
            <label class="form-label" for="year">Year</label>
            <select id="year" class="form-select"><option value="">All years</option></select>
          </div>
          <div class="col-md-2">
            <button class="btn btn-outline-primary w-100" id="reload"><i class="bi bi-arrow-clockwise me-1"></i>Reload</button>
          </div>
        </div>
      </div>
      <div class="card-soft overflow-hidden">
        <div class="p-3 border-bottom d-flex justify-content-between">
          <strong>Holiday calendar</strong>
          <span id="count" class="text-muted"></span>
        </div>
        <div class="table-responsive">
          <table class="table table-hover align-middle mb-0">
            <thead>
              <tr><th>#</th><th>Date</th><th>Day</th><th>Holiday type</th><th>OT rate</th><th>Actions</th></tr>
            </thead>
            <tbody id="rows"></tbody>
          </table>
        </div>
      </div>`;

    // Show status or error banner
    function notice(message: string, error = false): void {
        if (ctx.alive()) {
            $('#notice').innerHTML = error ? alertBox(message) : `<div class="alert alert-success py-2">${esc(message)}</div>`;
        }
    }

    // Close editor panel and clean up Select2
    function closeEditor(): void {
        destroySelect2($('#editor'));
        $('#editor').innerHTML = '';
    }

    // Populate year filter dropdown from loaded holidays
    function years(): void {
        const select = $<HTMLSelectElement>('#year');
        const selected = select.value;
        const values = [...new Set(rows.map((r) => r.holddt?.slice(0, 4)).filter(Boolean))]
            .sort()
            .reverse();

        select.innerHTML =
            '<option value="">All years</option>' +
            values.map((year) => `<option value="${esc(year)}" ${year === selected ? 'selected' : ''}>${esc(year)}</option>`).join('');
    }

    // Filter and render holiday rows
    function draw(): void {
        const search = $<HTMLInputElement>('#search').value.toLowerCase().trim();
        const year = $<HTMLSelectElement>('#year').value;
        const list = rows.filter(
            (r) =>
                (!year || r.holddt?.startsWith(year)) &&
                `${r.holddt ?? ''} ${r.sysdes ?? ''}`.toLowerCase().includes(search)
        );

        $('#count').textContent = `${list.length} of ${rows.length} holidays`;
        $('#rows').innerHTML = list.length
            ? list.map((r, i) => `
              <tr>
                <td>${i + 1}</td>
                <td class="text-nowrap">${esc(r.holddt)}</td>
                <td>${r.holddt ? esc(new Date(`${r.holddt}T12:00:00`).toLocaleDateString('en', { weekday: 'long' })) : '—'}</td>
                <td>${esc(r.sysdes ?? `Unknown type (${r.holtypsno})`)}</td>
                <td>${Number(r.holotrate).toLocaleString('en-LK', { maximumFractionDigits: 4 })}</td>
                <td class="text-nowrap">
                  <button class="btn btn-sm btn-outline-secondary" data-view="${r.holsno}" ${busy ? 'disabled' : ''}>View</button>
                  ${can('a_holm', 'amend') ? `<button class="btn btn-sm btn-outline-primary" data-edit="${r.holsno}" ${busy ? 'disabled' : ''}>Edit</button>` : ''}
                  ${can('a_holm', 'delete') ? `<button class="btn btn-sm btn-outline-danger" data-delete="${r.holsno}" ${busy ? 'disabled' : ''}>Delete</button>` : ''}
                </td>
              </tr>`).join('')
            : '<tr><td colspan="6" class="text-center text-muted py-5">No holidays found. Try another year or search.</td></tr>';

        const add = el.querySelector<HTMLButtonElement>('#add');
        if (add) {
            add.disabled = busy;
        }
        const addAll = el.querySelector<HTMLButtonElement>('#add-all');
        if (addAll) {
            addAll.disabled = busy;
        }
        $<HTMLButtonElement>('#reload').disabled = busy;
    }

    // Reload holidays from backend
    async function refresh(): Promise<void> {
        const data = await call<Holiday[]>();
        if (ctx.alive()) {
            rows = data;
            years();
            draw();
        }
    }

    // Open add, edit, or view holiday form
    function editor(row: Holiday | null, view = false): void {
        if (busy) {
            return;
        }

        closeEditor();
        const today = new Date();
        const date =
            row?.holddt ??
            `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

        $('#editor').innerHTML = `
          <div class="card-soft p-4 mb-4">
            <h5>${view ? 'View holiday' : row ? 'Edit holiday' : 'Add holiday'}</h5>
            <form id="holiday-form">
              <fieldset ${view ? 'disabled' : ''}>
                <div class="row g-3">
                  <div class="col-md-4">
                    <label class="form-label" for="holddt">Date</label>
                    <input class="form-control" id="holddt" name="holddt" type="date" value="${esc(date)}" min="1900-01-01" max="9999-12-31" required ${row ? 'readonly' : ''}>
                    ${row ? '<div class="form-text">The holiday date stays fixed when editing.</div>' : ''}
                  </div>
                  <div class="col-md-4">
                    <label class="form-label" for="holtypsno">Holiday type</label>
                    <select class="form-select" id="holtypsno" name="holtypsno" required>
                      <option value="">Select holiday type</option>
                      ${row && !types.some((t) => t.syssno === row.holtypsno) ? `<option value="${row.holtypsno}" selected disabled>Unknown type (${row.holtypsno}) — choose a valid type</option>` : ''}
                      ${types.map((t) => `<option value="${t.syssno}" ${t.syssno === row?.holtypsno ? 'selected' : ''}>${esc(t.sysdes)}</option>`).join('')}
                    </select>
                  </div>
                  <div class="col-md-4">
                    <label class="form-label" for="holotrate">OT rate</label>
                    <input class="form-control" id="holotrate" name="holotrate" type="number" min="0" max="9999.99" step="any" value="${esc(row?.holotrate ?? '')}" placeholder="e.g. 1.5 or 2.0" required>
                    <div class="form-text">Overtime multiplier, for example 1.5 or 2.0.</div>
                  </div>
                </div>
              </fieldset>
              ${row ? `<div class="small text-muted mt-3">Entered by ${esc(row.holucdnew || '—')} · ${esc(row.holentddt)} ${esc(row.holenttime)}${row.holucdame ? `<br>Updated by ${esc(row.holucdame)} · ${esc(row.holameddt)} ${esc(row.holametime)}` : ''}</div>` : ''}
              <div id="form-error" class="mt-3" role="alert"></div>
              <div class="d-flex gap-2 mt-3">
                ${view ? '' : '<button class="btn btn-primary" type="submit">Save holiday</button><button class="btn btn-outline-secondary" type="reset">Reset</button>'}
                <button class="btn btn-light" id="cancel" type="button">${view ? 'Close' : 'Cancel'}</button>
              </div>
            </form>
          </div>`;

        $('#cancel').onclick = () => {
            if (!busy) {
                closeEditor();
            }
        };

        $('#holiday-form').onsubmit = async (event) => {
            event.preventDefault();
            if (view || busy) {
                return;
            }

            const form = event.currentTarget as HTMLFormElement;
            const body = Object.fromEntries(new FormData(form));

            if (!row && rows.some((r) => r.holddt === body.holddt)) {
                $('#form-error').innerHTML = alertBox('A holiday already exists for this date.');
                return;
            }

            busy = true;
            form.querySelectorAll<HTMLButtonElement>('button').forEach((b) => {
                b.disabled = true;
            });
            $('#form-error').innerHTML = '';
            draw();

            let saved = false;
            try {
                await call(row ? '/' + row.holsno : '', row ? 'PUT' : 'POST', body);
                saved = true;
                if (!ctx.alive()) {
                    return;
                }

                closeEditor();
                $<HTMLInputElement>('#search').value = '';
                $<HTMLSelectElement>('#year').value = '';
                notice('Holiday saved.');
                await refresh();
            } catch (error) {
                if (ctx.alive()) {
                    if (saved) {
                        notice('Holiday saved, but the list could not reload. Use Reload to try again.', true);
                    } else {
                        $('#form-error').innerHTML = alertBox(errMsg(error));
                    }
                }
            } finally {
                busy = false;
                if (ctx.alive()) {
                    draw();
                    form.querySelectorAll<HTMLButtonElement>('button').forEach((b) => {
                        b.disabled = false;
                    });
                }
            }
        };

        $('#editor').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    el.querySelector<HTMLButtonElement>('#add')?.addEventListener('click', () => editor(null));
    el.querySelector<HTMLButtonElement>('#add-all')?.addEventListener('click', () => ctx.navigate('/a_holentergrid'));
    $('#search').oninput = draw;
    $('#year').onchange = draw;

    // Handle reload button click
    $('#reload').onclick = async () => {
        if (busy) {
            return;
        }

        busy = true;
        draw();

        try {
            await refresh();
        } catch (error) {
            notice(errMsg(error), true);
        } finally {
            busy = false;
            if (ctx.alive()) {
                draw();
            }
        }
    };

    // Handle row action buttons (view, edit, delete)
    $('#rows').onclick = async (event) => {
        const button = (event.target as HTMLElement).closest<HTMLButtonElement>('button');
        if (!button || busy) {
            return;
        }

        const id = button.dataset.view ?? button.dataset.edit ?? button.dataset.delete;
        const row = rows.find((r) => String(r.holsno) === id);
        if (!row) {
            return;
        }

        if (!button.dataset.delete) {
            editor(row, !!button.dataset.view);
            return;
        }

        busy = true;
        draw();
        let deleted = false;

        try {
            const confirmed = await confirmModal({
                title: 'Delete holiday?',
                message: `Delete the holiday on ${row.holddt}? This cannot be undone.`,
            });
            if (!confirmed || !ctx.alive()) {
                return;
            }

            await call('/' + row.holsno, 'DELETE');
            deleted = true;
            if (!ctx.alive()) {
                return;
            }

            closeEditor();
            rows = rows.filter((r) => r.holsno !== row.holsno);
            notice('Holiday deleted.');
            await refresh();
        } catch (error) {
            notice(
                deleted
                    ? 'Holiday deleted, but the list could not reload. Use Reload to try again.'
                    : errMsg(error),
                true
            );
        } finally {
            busy = false;
            if (ctx.alive()) {
                years();
                draw();
            }
        }
    };

    years();
    draw();
}
