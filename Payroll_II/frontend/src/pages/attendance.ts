import { request } from '../services/api.ts';
import { can } from '../services/auth.ts';
import { esc, qs, errMsg, alertBox, loading, confirmModal } from '../utils/ui.ts';
import type { PageContext } from '../types.ts';

type Row = Record<string, string | number | null>;
const call = <T>(path = '', method = 'GET', body?: unknown) => request<T>('/attendance' + path, {
    method, ...(body ? { body: JSON.stringify(body) } : {})
});
const time = (row: Row, prefix: string) => `${String(row[prefix + 'hh'] ?? 0).padStart(2, '0')}:${String(row[prefix + 'mm'] ?? 0).padStart(2, '0')}`;

export async function render(el: HTMLElement, ctx: PageContext): Promise<void> {
    el.innerHTML = loading('Loading employees...');
    let employees: Row[];
    try { employees = await call<Row[]>('/employees'); }
    catch (error) { if (ctx.alive()) el.innerHTML = alertBox(errMsg(error)); return; }
    if (!ctx.alive()) return;
    const now = new Date();
    let rows: Row[] = [];
    let selection: { employee: string; year: string; month: string } | null = null;
    let version = 0;
    let busy = false;
    const $ = <T extends HTMLElement = HTMLElement>(selector: string) => qs<T>(el, selector);
    el.innerHTML = `
      <div class="d-flex justify-content-between align-items-start gap-3 mb-4">
        <div><h3 class="mb-1">Attendance Correction</h3><p class="text-muted mb-0">Review monthly attendance and correct recorded times, overtime and late minutes.</p></div>
        ${can('a_inqempatt', 'add') ? '<button class="btn btn-primary text-nowrap" id="add" disabled><i class="bi bi-plus-lg me-1"></i>Add record</button>' : ''}
      </div>
      <div id="notice" role="status"></div>
      <form id="filters" class="card-soft p-4 mb-4"><div class="row g-3 align-items-end">
        <div class="col-lg-6"><label for="employee" class="form-label">Employee</label><select id="employee" name="employee" class="form-select" required><option value="">Select employee</option>${employees.map(r => `<option value="${esc(r.empsno)}">${esc(r.empepfno)} - ${esc(r.empnam)} - ${esc(r.locnam)}</option>`).join('')}</select></div>
        <div class="col-sm-4 col-lg-2"><label for="year" class="form-label">Year</label><input id="year" name="year" class="form-control" type="number" min="1900" max="9998" value="${now.getFullYear()}" required></div>
        <div class="col-sm-4 col-lg-2"><label for="month" class="form-label">Month</label><select id="month" name="month" class="form-select">${Array.from({ length: 12 }, (_, i) => `<option value="${i + 1}" ${now.getMonth() === i ? 'selected' : ''}>${new Date(2024, i, 1).toLocaleString('en', { month: 'long' })}</option>`).join('')}</select></div>
        <div class="col-sm-4 col-lg-2"><button class="btn btn-primary w-100" id="check">Check</button></div>
      </div></form>
      <div id="editor"></div>
      <div class="card-soft overflow-hidden"><div class="p-3 border-bottom d-flex justify-content-between gap-3"><strong id="caption">Monthly attendance</strong><span id="count" class="text-muted">0 records</span></div>
        <div class="table-responsive attendance-table"><table class="table table-hover align-middle mb-0 text-nowrap"><thead><tr>${['#', 'Date', 'In', 'Out', 'OT1', 'OT2', 'Late min', 'No OT', 'No LT', 'Entry user', 'Entry date', 'Entry time', 'Actions'].map(t => `<th>${t}</th>`).join('')}</tr></thead><tbody id="rows"></tbody><tfoot id="totals"></tfoot></table></div>
      </div>`;

    function notice(message: string, error = false): void {
        if (ctx.alive()) $('#notice').innerHTML = error ? alertBox(message) : `<div class="alert alert-success py-2">${esc(message)}</div>`;
    }
    function draw(): void {
        $('#count').textContent = `${rows.length} records`;
        $('#rows').innerHTML = rows.length ? rows.map((r, i) => `<tr>
          <td>${i + 1}</td><td>${esc(r.denddt)}</td><td>${esc(time(r, 'dlyactin'))}</td><td>${esc(time(r, 'dlyactout'))}</td>
          <td>${esc(r.denot1)}</td><td>${esc(r.denot2)}</td><td>${esc(r.denlatemin)}</td>
          <td>${String(r.dennoot).toUpperCase() === 'Y' ? 'Yes' : 'No'}</td><td>${String(r.nolatflg).toUpperCase() === 'Y' ? 'Yes' : 'No'}</td>
          <td>${esc(r.denucdnew)}</td><td>${esc(r.denentddt)}</td><td>${esc(r.denenttime)}</td>
          <td><button class="btn btn-sm btn-outline-secondary" data-view="${esc(r.densno)}">View</button>
          ${can('a_inqempatt', 'amend') ? `<button class="btn btn-sm btn-outline-primary" data-edit="${esc(r.densno)}">Edit</button>` : ''}
          ${can('a_inqempatt', 'delete') ? `<button class="btn btn-sm btn-outline-danger" data-delete="${esc(r.densno)}">Delete</button>` : ''}</td></tr>`).join('')
          : `<tr><td colspan="13" class="text-center text-muted py-5">${selection ? 'No attendance records for this employee and month.' : 'Select an employee and month, then click Check.'}</td></tr>`;
        $('#totals').innerHTML = selection ? `<tr><th colspan="4">Monthly totals</th>${['denot1', 'denot2', 'denlatemin'].map(k => `<th>${rows.reduce((sum, r) => sum + Number(r[k] || 0), 0).toLocaleString('en-LK', { maximumFractionDigits: 2 })}</th>`).join('')}<td colspan="6"></td></tr>` : '';
        const add = el.querySelector<HTMLButtonElement>('#add');
        if (add) add.disabled = !selection || busy;
    }
    async function load(): Promise<void> {
        if (!selection) return;
        const current = ++version;
        const data = await call<Row[]>('?' + new URLSearchParams(selection));
        if (!ctx.alive() || current !== version) return;
        rows = data;
        const employee = employees.find(r => String(r.empsno) === selection!.employee);
        $('#caption').textContent = `${employee?.empnam ?? ''} · ${selection.year}-${selection.month.padStart(2, '0')}`;
        draw();
    }
    $('#filters').onsubmit = async event => {
        event.preventDefault();
        if (busy) return;
        selection = Object.fromEntries(new FormData(event.currentTarget as HTMLFormElement)) as typeof selection;
        rows = [];
        $('#editor').innerHTML = '';
        $('#notice').innerHTML = '';
        busy = true;
        $<HTMLButtonElement>('#check').disabled = true;
        draw();
        try { await load(); }
        catch (error) { notice(errMsg(error), true); }
        finally { busy = false; if (ctx.alive()) { $<HTMLButtonElement>('#check').disabled = false; draw(); } }
    };

    function editor(row: Row | null, view = false): void {
        if (!selection || busy) return;
        const r = row ?? {};
        const employee = selection.employee;
        const input = (key: string, label: string, type: string, value: unknown, attrs = '') => `<div class="col-sm-6 col-lg-3"><label class="form-label" for="att-${key}">${label}</label><input class="form-control" id="att-${key}" name="${key}" type="${type}" value="${esc(value)}" ${attrs} required></div>`;
        $('#editor').innerHTML = `<div class="card-soft p-4 mb-4"><h5>${view ? 'View' : row ? 'Edit' : 'Add'} attendance record</h5>
          <form id="record-form"><fieldset ${view ? 'disabled' : ''}><div class="row g-3">
          ${input('denddt', 'Date', 'date', r.denddt ?? `${selection.year}-${selection.month.padStart(2, '0')}-01`, 'min="1900-01-01" max="9999-12-31"')}
          ${input('in', 'In time', 'time', row ? time(r, 'dlyactin') : '08:00')}
          ${input('out', 'Out time', 'time', row ? time(r, 'dlyactout') : '17:00')}
          ${['denot1', 'denot2', 'denlatemin'].map((key, i) => input(key, ['OT1', 'OT2', 'Late minutes'][i], 'number', r[key] ?? 0, `min="0" max="${i === 2 ? 2147483647 : 999999}" step="${i === 2 ? 1 : 'any'}"`)).join('')}
          ${['dennoot', 'nolatflg'].map((key, i) => `<div class="col-sm-6 col-lg-3"><label class="form-label" for="att-${key}">${i ? 'No late deduction' : 'No overtime'}</label><select class="form-select" id="att-${key}" name="${key}">${['', 'N', 'Y', 'n', 'y'].map(flag => `<option value="${flag}" ${String(r[key] ?? 'N') === flag ? 'selected' : ''}>${flag === '' ? 'Not set' : flag.toUpperCase() === 'Y' ? 'Yes' : 'No'}${flag === 'y' || flag === 'n' ? ' (legacy)' : ''}</option>`).join('')}</select></div>`).join('')}
          </div></fieldset>
          ${row ? `<p class="small text-muted mt-3">Entered by ${esc(r.denucdnew)} · ${esc(r.denentddt)} ${esc(r.denenttime)}${r.denucdame ? `<br>Updated by ${esc(r.denucdame)} · ${esc(r.denameddt)} ${esc(r.denametime)}` : ''}</p>` : ''}
          <div id="form-error" class="mt-3" role="alert"></div><div class="d-flex gap-2 mt-3">${view ? '' : '<button class="btn btn-primary" type="submit">Save record</button>'}<button class="btn btn-light" type="button" id="cancel">${view ? 'Close' : 'Cancel'}</button></div></form></div>`;
        $('#cancel').onclick = () => { if (!busy) $('#editor').innerHTML = ''; };
        $('#record-form').onsubmit = async event => {
            event.preventDefault();
            if (view || busy) return;
            const form = event.currentTarget as HTMLFormElement;
            const data = Object.fromEntries(new FormData(form));
            const [ih, im] = String(data.in).split(':');
            const [oh, om] = String(data.out).split(':');
            if (Number(ih) * 60 + Number(im) >= Number(oh) * 60 + Number(om)) { $('#form-error').innerHTML = alertBox('Out time must be later than in time.'); return; }
            busy = true;
            form.querySelector<HTMLButtonElement>('button[type="submit"]')!.disabled = true;
            draw();
            try {
                await call(row ? '/' + row.densno : '', row ? 'PUT' : 'POST', { ...data, employee, dlyactinhh: ih, dlyactinmm: im, dlyactouthh: oh, dlyactoutmm: om });
                if (!ctx.alive()) return;
                $('#editor').innerHTML = '';
                notice('Attendance saved.');
                await load();
            } catch (error) { notice(errMsg(error), true); }
            finally { busy = false; if (ctx.alive()) { draw(); const button = el.querySelector<HTMLButtonElement>('#record-form button[type="submit"]'); if (button) button.disabled = false; } }
        };
        $('#editor').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    el.querySelector<HTMLButtonElement>('#add')?.addEventListener('click', () => editor(null));
    $('#rows').onclick = async event => {
        const button = (event.target as HTMLElement).closest<HTMLButtonElement>('button');
        if (!button || busy) return;
        const id = button.dataset.view ?? button.dataset.edit ?? button.dataset.delete;
        const row = rows.find(r => String(r.densno) === id);
        if (!row) return;
        if (!button.dataset.delete) { editor(row, !!button.dataset.view); return; }
        busy = true;
        draw();
        try {
            if (!await confirmModal({ title: 'Delete attendance record?', message: `Delete the attendance record for ${row.denddt}? This cannot be undone.` }) || !ctx.alive()) return;
            await call('/' + row.densno, 'DELETE');
            if (!ctx.alive()) return;
            $('#editor').innerHTML = '';
            notice('Attendance deleted.');
            await load();
        } catch (error) { notice(errMsg(error), true); }
        finally { busy = false; if (ctx.alive()) draw(); }
    };
    draw();
}
