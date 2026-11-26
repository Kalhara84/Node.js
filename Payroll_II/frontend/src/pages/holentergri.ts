import { request } from '../services/api.ts';
import { alertBox, errMsg, esc, loading, qs } from '../utils/ui.ts';
import type { PageContext } from '../types.ts';

type HolidayType = {
    syssno: number;
    sysdes: string;
};

type RangeHoliday = {
    holsno: number;
    holddt: string;
    holtypsno: number;
    holotrate: number;
    sysdes: string | null;
};

type BulkResponse = {
    inserted: number;
    updated: number;
    message: string;
};

// Shared API helper for holiday endpoints
const call = <T>(path = '', method = 'GET', body?: unknown): Promise<T> => {
    return request<T>('/holidays' + path, {
        method,
        ...(body ? { body: JSON.stringify(body) } : {}),
    });
};

// Generate inclusive YYYY-MM-DD date list between from and to dates
function dateRange(from: string, to: string): string[] {
    const dates: string[] = [];
    const current = new Date(`${from}T00:00:00Z`);
    const last = new Date(`${to}T00:00:00Z`);

    while (current <= last) {
        dates.push(current.toISOString().slice(0, 10));
        current.setUTCDate(current.getUTCDate() + 1);
    }

    return dates;
}

// Render bulk holiday entry grid page (a_holentergrid)
export async function render(el: HTMLElement, ctx: PageContext): Promise<void> {
    el.innerHTML = loading('Loading holiday types...');

    let types: HolidayType[];
    try {
        types = await call<HolidayType[]>('/types');
    } catch (error) {
        if (ctx.alive()) {
            el.innerHTML = alertBox(errMsg(error));
        }
        return;
    }

    if (!ctx.alive()) {
        return;
    }

    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const firstDay = `${year}-${month}-01`;
    const lastDay = `${year}-${month}-${String(new Date(year, today.getMonth() + 1, 0).getDate()).padStart(2, '0')}`;

    let busy = false;
    let currentDates: string[] = [];
    let existingMap = new Map<string, RangeHoliday>();

    const $ = <T extends HTMLElement = HTMLElement>(selector: string): T => qs<T>(el, selector);

    el.innerHTML = `
      <div class="d-flex flex-wrap justify-content-between align-items-start gap-3 mb-4">
        <div>
          <h3 class="mb-1">Add All Holidays</h3>
          <p class="text-muted mb-0">Select a date range, assign holiday types and OT rates, then save all at once.</p>
        </div>
        <div class="d-flex gap-2">
          <button type="button" class="btn btn-outline-secondary text-nowrap" id="btn-back">
            <i class="bi bi-arrow-left me-1"></i>Back
          </button>
          <button type="button" class="btn btn-outline-primary text-nowrap" id="btn-reload">
            <i class="bi bi-arrow-clockwise me-1"></i>Reload
          </button>
          <button type="button" class="btn btn-primary text-nowrap" id="btn-menu">
            <i class="bi bi-grid-1x2-fill me-1"></i>Menu
          </button>
        </div>
      </div>

      <div id="notice" role="status"></div>

      <form id="range-form" class="card-soft p-4 mb-4">
        <div class="row g-3 align-items-end">
          <div class="col-sm-4">
            <label class="form-label" for="frddt">From Date</label>
            <input id="frddt" name="frddt" type="date" class="form-control" value="${firstDay}" min="1900-01-01" max="9999-12-31" required />
          </div>
          <div class="col-sm-4">
            <label class="form-label" for="toddt">To Date</label>
            <input id="toddt" name="toddt" type="date" class="form-control" value="${lastDay}" min="1900-01-01" max="9999-12-31" required />
          </div>
          <div class="col-sm-4">
            <button type="submit" class="btn btn-primary w-100" id="btn-display">
              <i class="bi bi-table me-1"></i>Display
            </button>
          </div>
        </div>
      </form>

      <div id="grid-wrap" hidden>
        <form id="bulk-form" class="card-soft overflow-hidden">
          <div class="p-3 border-bottom d-flex flex-wrap justify-content-between align-items-center gap-2">
            <strong id="grid-caption">Holiday Grid</strong>
            <span id="grid-count" class="text-muted"></span>
          </div>
          <div class="table-responsive attendance-table">
            <table class="table table-hover align-middle mb-0">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Date</th>
                  <th>Day</th>
                  <th>Holiday Type</th>
                  <th>OT Rate</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody id="grid-rows"></tbody>
            </table>
          </div>
          <div class="p-3 border-top d-flex justify-content-end gap-2">
            <button type="submit" class="btn btn-primary" id="btn-save">
              <i class="bi bi-check-lg me-1"></i>Save All
            </button>
          </div>
        </form>
      </div>`;

    // Show status or error banner
    function notice(message: string, error = false): void {
        if (ctx.alive()) {
            $('#notice').innerHTML = error ? alertBox(message) : `<div class="alert alert-success py-2">${esc(message)}</div>`;
        }
    }

    // Update disabled state of action buttons while busy
    function setBusy(state: boolean): void {
        busy = state;
        $<HTMLButtonElement>('#btn-display').disabled = state;
        $<HTMLButtonElement>('#btn-save').disabled = state;
        $<HTMLButtonElement>('#btn-reload').disabled = state;
    }

    // Render date grid rows with any existing holiday values pre-filled
    function drawGrid(from: string, to: string): void {
        currentDates = dateRange(from, to);
        $('#grid-caption').textContent = `Dates from ${from} to ${to}`;
        $('#grid-count').textContent = `${currentDates.length} days`;

        $('#grid-rows').innerHTML = currentDates.map((d, i) => {
            const existing = existingMap.get(d);
            const dayName = new Date(`${d}T12:00:00`).toLocaleDateString('en', { weekday: 'long' });
            const selectedType = existing?.holtypsno ?? '';
            const rateValue = existing ? String(existing.holotrate) : '';

            return `
              <tr data-date="${esc(d)}">
                <td>${i + 1}</td>
                <td class="text-nowrap fw-semibold">${esc(d)}</td>
                <td>${esc(dayName)}</td>
                <td style="min-width: 220px;">
                  <select class="form-select form-select-sm" data-field="holtypsno">
                    <option value="">----</option>
                    ${types.map((t) => `<option value="${t.syssno}" ${t.syssno === selectedType ? 'selected' : ''}>${esc(t.sysdes)}</option>`).join('')}
                  </select>
                </td>
                <td style="max-width: 140px;">
                  <input type="number" class="form-control form-control-sm" data-field="holotrate" min="0" max="9999.99" step="any" placeholder="0" value="${esc(rateValue)}" />
                </td>
                <td>
                  ${existing ? '<span class="badge badge-soft-blue">Existing</span>' : '<span class="badge badge-soft-gray">Not set</span>'}
                </td>
              </tr>`;
        }).join('');

        $('#grid-wrap').hidden = false;
    }

    // Load existing holidays for the selected range and render the grid
    async function loadRange(from: string, to: string): Promise<void> {
        const query = new URLSearchParams({ from, to });
        const rows = await call<RangeHoliday[]>('/range?' + query.toString());
        if (!ctx.alive()) {
            return;
        }

        existingMap = new Map(rows.map((r) => [r.holddt, r]));
        drawGrid(from, to);
    }

    // Navigation and reload buttons
    $('#btn-back').onclick = () => {
        ctx.navigate('/a_holm');
    };

    $('#btn-menu').onclick = () => {
        ctx.navigate('/dashboard');
    };

    $('#btn-reload').onclick = async () => {
        if (busy) {
            return;
        }

        const from = $<HTMLInputElement>('#frddt').value;
        const to = $<HTMLInputElement>('#toddt').value;

        if (!from || !to || from > to || $('#grid-wrap').hidden) {
            ctx.navigate('/a_holentergrid', true);
            return;
        }

        $('#notice').innerHTML = '';
        setBusy(true);

        try {
            await loadRange(from, to);
        } catch (error) {
            notice(errMsg(error), true);
        } finally {
            if (ctx.alive()) {
                setBusy(false);
            }
        }
    };

    // Handle date range display form submit
    $('#range-form').onsubmit = async (event) => {
        event.preventDefault();
        if (busy) {
            return;
        }

        const from = $<HTMLInputElement>('#frddt').value;
        const to = $<HTMLInputElement>('#toddt').value;

        if (!from || !to) {
            notice('From Date and To Date are required.', true);
            return;
        }

        if (from > to) {
            notice('To Date must be greater than or equal to From Date.', true);
            return;
        }

        $('#notice').innerHTML = '';
        setBusy(true);

        try {
            await loadRange(from, to);
        } catch (error) {
            notice(errMsg(error), true);
        } finally {
            if (ctx.alive()) {
                setBusy(false);
            }
        }
    };

    // Handle bulk save of all selected holiday rows
    $('#bulk-form').onsubmit = async (event) => {
        event.preventDefault();
        if (busy) {
            return;
        }

        const items: Array<{ holddt: string; holtypsno: string; holotrate: string }> = [];
        const rowEls = el.querySelectorAll<HTMLTableRowElement>('#grid-rows tr');

        for (const tr of rowEls) {
            const holddt = tr.dataset.date ?? '';
            const typeEl = tr.querySelector<HTMLSelectElement>('[data-field="holtypsno"]');
            const rateEl = tr.querySelector<HTMLInputElement>('[data-field="holotrate"]');
            const holtypsno = typeEl?.value ?? '';

            if (!holtypsno) {
                continue;
            }

            const rawRate = rateEl?.value.trim() ?? '';
            const holotrate = rawRate === '' ? '0' : rawRate;
            const rateNum = Number(holotrate);

            if (!Number.isFinite(rateNum) || rateNum < 0 || rateNum > 9999.99) {
                notice(`Invalid OT rate for ${holddt}. Enter a value between 0 and 9999.99.`, true);
                rateEl?.focus();
                return;
            }

            items.push({ holddt, holtypsno, holotrate });
        }

        if (!items.length) {
            notice('Select a Holiday Type for at least one date before saving.', true);
            return;
        }

        $('#notice').innerHTML = '';
        setBusy(true);

        try {
            const result = await call<BulkResponse>('/bulk', 'POST', { items });
            if (!ctx.alive()) {
                return;
            }

            notice(result.message);
            const from = $<HTMLInputElement>('#frddt').value;
            const to = $<HTMLInputElement>('#toddt').value;
            await loadRange(from, to);
        } catch (error) {
            notice(errMsg(error), true);
        } finally {
            if (ctx.alive()) {
                setBusy(false);
            }
        }
    };
}

