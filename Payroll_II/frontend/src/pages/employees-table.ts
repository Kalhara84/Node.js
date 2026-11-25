import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { api } from '../services/api.ts';
import { alertBox, CATEGORY, emptyState, errMsg, esc, GENDER, money, qs, yn } from '../utils/ui.ts';
import type { Employee, Paged, PageContext } from '../types.ts';

// Employee table column headings
const labels: Record<keyof Employee, string> = {
    empeno: 'Emp No',
    empnam: 'Name',
    empinital: 'Initial',
    empcat: 'Category',
    empactflg: 'Active Status',
    empsts: 'Status',
    department_name: 'Department',
    location_name: 'Location',
    empdesig: 'Designation',
    empsal: 'Basic Salary',
    empmof: 'Sex',
    empmrdtst: 'Married',
    empidno: 'National ID',
    emppasportno: 'Passport No',
    empdob: 'Date of Birth',
    empjoin: 'Date Joined',
    empleft: 'Date Left',
    empmapcode: 'Map Code',
    emplocsno: 'Location ID',
    empdepsno: 'Department ID',
    empsecsno: 'Section ID',
    emparesno: 'Area ID',
    empcossno: 'Cost Center ID',
    empbasisno: 'Basis ID',
    empepfyn: 'EPF',
    empepfno: 'EPF No',
    emppayeyn: 'PAYE',
    emptno: 'Tax Table No',
    empprl: 'PAYE Relief',
    empgin: 'Up To Date Gross Earnings',
    emptax: 'Up To Date Tax',
    emptin: 'TIN No',
    empcob: 'Coin Opening Balance',
    empscgpcn: 'Service Charge %',
    empbnkacno: 'Bank Account No',
    empbnkcode: 'Bank Code',
    empbnkbranch: 'Bank Branch',
    empbnkid: 'Bank ID',
    empad1: 'Address Line 1',
    empad2: 'Address Line 2',
    empad3: 'Address Line 3',
    empad4: 'Address Line 4',
    empemail: 'Email',
    emptel: 'Telephone',
    empanual: 'Annual Leave',
    empcasal: 'Casual Leave',
    empleuleu: 'L/L',
    empotflg: 'OT',
    empnopflg: 'No Pay',
    empattincflg: 'Attendance Incentive',
    emplateflg: 'Late',
    empnsatlflg: 'Saturday Leave',
    empsno: 'Record ID',
};

const columns = Object.keys(labels) as (keyof Employee)[];
const flags = new Set<keyof Employee>([
    'empmrdtst', 'empepfyn', 'emppayeyn', 'empotflg', 'empnopflg',
    'empattincflg', 'emplateflg', 'empnsatlflg',
]);
const amounts = new Set<keyof Employee>(['empsal', 'empprl', 'empgin', 'emptax', 'empcob', 'empscgpcn']);

// Format employee field values for display
function display(employee: Employee, key: keyof Employee): string {
    const value = employee[key];
    if (value === null || value === undefined || value === '') {
        return '-';
    }
    if (key === 'empcat') {
        return CATEGORY[String(value)] ?? String(value);
    }
    if (key === 'empmof') {
        return GENDER[String(value)] ?? String(value);
    }
    if (key === 'empactflg') {
        if (value === 'Y') {
            return 'Active';
        }
        if (value === 'N') {
            return 'Inactive';
        }
        return String(value);
    }
    if (flags.has(key)) {
        return yn(String(value));
    }
    if (amounts.has(key)) {
        return money(value, 2);
    }
    return String(value);
}

// Render all employee details without row actions
export async function render(el: HTMLElement, ctx: PageContext): Promise<void> {
    const limit = 25;
    let page = 1;
    let result: Paged<Employee> | null = null;
    let allCache: Employee[] | null = null;
    let busy = false;
    let exporting = false;

    el.innerHTML = `
      <div class="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-3">
        <div>
          <h4 class="page-title">All Employee Details</h4>
          <div class="page-sub" id="count" role="status">Loading employees...</div>
        </div>
        <div class="d-flex flex-wrap align-items-center gap-2" id="toolbar">
          <button type="button" class="btn btn-outline-secondary btn-sm" data-action="back"><i class="bi bi-arrow-left me-1"></i>Back</button>
          <button type="button" class="btn btn-outline-primary btn-sm" data-action="copy"><i class="bi bi-clipboard me-1"></i>Copy</button>
          <button type="button" class="btn btn-outline-danger btn-sm" data-action="pdf"><i class="bi bi-file-earmark-pdf me-1"></i>PDF</button>
          <button type="button" class="btn btn-outline-success btn-sm" data-action="excel"><i class="bi bi-file-earmark-excel me-1"></i>EXLE</button>
          <button type="button" class="btn btn-outline-dark btn-sm" data-action="print"><i class="bi bi-printer me-1"></i>PRINT</button>
          <button type="button" class="btn btn-primary btn-sm" data-action="menu"><i class="bi bi-grid-1x2-fill me-1"></i>MENU</button>
        </div>
      </div>
      <div id="err" role="alert"></div>
      <div class="card-soft fade-in employee-details-card">
        <div id="table-status" class="px-3 py-2 text-muted" role="status" hidden></div>
        <div id="table-wrap" class="table-responsive employee-details-wrap" tabindex="0" role="region" aria-label="All employee details">
          <table class="table table-clean employee-details-table">
            <caption class="visually-hidden">All employee details, read only</caption>
            <thead>
              <tr>
                ${columns.map((key) => `<th scope="col"${amounts.has(key) ? ' class="text-end"' : ''}>${esc(labels[key])}</th>`).join('')}
              </tr>
            </thead>
            <tbody id="rows"></tbody>
          </table>
        </div>
        <div id="pager" class="card-body-pad d-flex flex-wrap justify-content-between align-items-center gap-3"></div>
      </div>`;

    const $ = <T extends HTMLElement = HTMLElement>(s: string): T => qs<T>(el, s);

    // Fetch only the requested page so the first records appear immediately
    async function load(): Promise<void> {
        if (busy) {
            return;
        }
        busy = true;
        $('#table-wrap').setAttribute('aria-busy', 'true');
        $('#table-status').hidden = false;
        $('#table-status').textContent = `Loading page ${page}...`;
        el.querySelectorAll<HTMLButtonElement>('[data-page], #retry').forEach((button) => {
            button.disabled = true;
        });
        $('#err').innerHTML = '';

        try {
            const r = await api.list('', page, limit);
            if (!ctx.alive()) {
                return;
            }
            result = r;
            draw();
            $('#table-wrap').scrollTop = 0;
        } catch (e) {
            if (!ctx.alive()) {
                return;
            }
            $('#err').innerHTML = `${alertBox(errMsg(e))}<button id="retry" class="btn btn-outline-primary btn-sm mb-3">Retry page ${page}</button>`;
            if (!result) {
                $('#count').textContent = 'Unable to load employees.';
            }
        } finally {
            busy = false;
            if (ctx.alive()) {
                $('#table-wrap').setAttribute('aria-busy', 'false');
                $('#table-status').hidden = true;
                drawPager();
            }
        }
    }

    // Render employee rows and total count
    function draw(): void {
        if (!result) {
            return;
        }
        $('#count').textContent = `${result.total} employees in total`;

        if (result.data.length) {
            $('#rows').innerHTML = result.data.map(row).join('');
        } else {
            $('#rows').innerHTML = `<tr><td colspan="${columns.length}">${emptyState('No employees found')}</td></tr>`;
        }
    }

    // Render navigation for the currently displayed page
    function drawPager(): void {
        if (!result) {
            return;
        }
        const first = result.data.length ? (result.page - 1) * limit + 1 : 0;
        const last = result.data.length ? first + result.data.length - 1 : 0;
        const prevDisabled = result.page <= 1 ? 'disabled' : '';
        const nextDisabled = result.page >= result.totalPages ? 'disabled' : '';

        $('#pager').innerHTML = `
          <div class="text-muted small">Showing ${first}–${last} of ${result.total} employees</div>
          <div class="d-flex align-items-center gap-2">
            <button class="btn btn-outline-secondary btn-sm" data-page="${result.page - 1}" ${prevDisabled}>Previous</button>
            <span class="text-muted small">Page ${result.page} of ${result.totalPages}</span>
            <button class="btn btn-outline-primary btn-sm" data-page="${result.page + 1}" ${nextDisabled}>Next</button>
          </div>`;
    }

    // Generate single employee table row
    const row = (e: Employee): string => {
        const cells = columns.map((key) => {
            const cellClass = amounts.has(key) ? ' class="text-end"' : '';
            return `<td${cellClass}>${esc(display(e, key))}</td>`;
        }).join('');

        return `
          <tr>
            ${cells}
          </tr>`;
    };

    // Fetch all employee records once and cache for Copy/PDF/Excel/Print
    async function getAllEmployees(): Promise<Employee[]> {
        if (allCache) {
            return allCache;
        }
        const all = await api.allEmployees();
        allCache = all;
        return all;
    }

    // Build shared headers and formatted rows for export operations
    function buildExportData(employees: Employee[]): { headers: string[]; rows: string[][] } {
        const headers = columns.map((key) => labels[key]);
        const rows = employees.map((emp) => columns.map((key) => display(emp, key)));
        return { headers, rows };
    }

    // Copy all employee records as tab-separated values for Excel pasting
    async function copyAll(employees: Employee[]): Promise<void> {
        const { headers, rows } = buildExportData(employees);
        const clean = (v: string): string => v.replace(/[\t\r\n]+/g, ' ');
        const tsv = [
            headers.map(clean).join('\t'),
            ...rows.map((r) => r.map(clean).join('\t')),
        ].join('\n');

        if (navigator.clipboard?.writeText) {
            await navigator.clipboard.writeText(tsv);
        } else {
            const ta = document.createElement('textarea');
            ta.value = tsv;
            ta.style.position = 'fixed';
            ta.style.opacity = '0';
            document.body.appendChild(ta);
            ta.select();
            document.execCommand('copy');
            ta.remove();
        }
    }

    // Generate landscape A3 PDF with all employee records
    function exportPdf(employees: Employee[]): void {
        const { headers, rows } = buildExportData(employees);
        const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a3' });
        doc.setFontSize(14);
        doc.text('All Employee Details', 28, 30);
        doc.setFontSize(9);
        doc.text(`${employees.length} employees in total`, 28, 44);
        autoTable(doc, {
            head: [headers],
            body: rows,
            startY: 54,
            margin: { left: 28, right: 28, bottom: 28 },
            styles: { fontSize: 6, cellPadding: 2 },
            headStyles: { fillColor: [79, 70, 229] },
            horizontalPageBreak: true,
            horizontalPageBreakRepeat: 0,
        });
        doc.save('all-employee-details.pdf');
    }

    // Generate Excel (.xlsx) workbook with all employee records
    function exportExcel(employees: Employee[]): void {
        const { headers, rows } = buildExportData(employees);
        const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Employees');
        XLSX.writeFile(wb, 'all-employee-details.xlsx');
    }

    // Print all employee records via an isolated print iframe
    function printAll(employees: Employee[]): void {
        const { headers, rows } = buildExportData(employees);
        const thead = `<tr>${headers.map((h) => `<th>${esc(h)}</th>`).join('')}</tr>`;
        const tbody = rows.map((r) => `<tr>${r.map((c) => `<td>${esc(c)}</td>`).join('')}</tr>`).join('');

        const iframe = document.createElement('iframe');
        iframe.style.position = 'fixed';
        iframe.style.right = '0';
        iframe.style.bottom = '0';
        iframe.style.width = '0';
        iframe.style.height = '0';
        iframe.style.border = '0';
        document.body.appendChild(iframe);

        const doc = iframe.contentDocument || iframe.contentWindow?.document;
        if (!doc || !iframe.contentWindow) {
            iframe.remove();
            throw new Error('Unable to open print preview.');
        }

        doc.open();
        doc.write(`<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>All Employee Details</title>
  <style>
    @page { size: landscape; margin: 10mm; }
    body { font-family: Arial, sans-serif; color: #111; margin: 0; }
    h2 { margin: 0 0 4px; font-size: 16px; }
    .sub { margin: 0 0 10px; font-size: 11px; color: #555; }
    table { width: 100%; border-collapse: collapse; font-size: 8px; }
    th, td { border: 1px solid #ccc; padding: 3px 4px; text-align: left; }
    th { background: #f3f4f6; font-weight: 700; }
    thead { display: table-header-group; }
    tr { page-break-inside: avoid; }
  </style>
</head>
<body>
  <h2>All Employee Details</h2>
  <div class="sub">${employees.length} employees in total</div>
  <table>
    <thead>${thead}</thead>
    <tbody>${tbody}</tbody>
  </table>
</body>
</html>`);
        doc.close();

        const cleanup = (): void => {
            setTimeout(() => iframe.remove(), 300);
        };
        iframe.contentWindow.addEventListener('afterprint', cleanup, { once: true });
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
    }

    // Run export/print/copy action using all database records
    async function runExport(action: string): Promise<void> {
        if (exporting) {
            return;
        }
        exporting = true;
        const statusEl = $('#table-status');
        const toolbarButtons = el.querySelectorAll<HTMLButtonElement>('#toolbar [data-action]');
        toolbarButtons.forEach((b) => { b.disabled = true; });
        $('#err').innerHTML = '';
        statusEl.hidden = false;
        statusEl.textContent = 'Loading all employee records from database...';

        try {
            const all = await getAllEmployees();
            if (!ctx.alive()) {
                return;
            }
            if (action === 'copy') {
                await copyAll(all);
                statusEl.textContent = `Copied ${all.length} employee records to clipboard.`;
                setTimeout(() => {
                    if (ctx.alive() && !busy && !exporting) {
                        statusEl.hidden = true;
                    }
                }, 3000);
                return;
            }
            if (action === 'pdf') {
                exportPdf(all);
            } else if (action === 'excel') {
                exportExcel(all);
            } else if (action === 'print') {
                printAll(all);
            }
            statusEl.hidden = true;
        } catch (e) {
            if (!ctx.alive()) {
                return;
            }
            statusEl.hidden = true;
            $('#err').innerHTML = alertBox(errMsg(e));
        } finally {
            exporting = false;
            if (ctx.alive()) {
                toolbarButtons.forEach((b) => { b.disabled = false; });
            }
        }
    }

    // Handle pagination, retry, and toolbar button clicks
    el.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        const actionBtn = target.closest<HTMLButtonElement>('[data-action]');
        if (actionBtn) {
            const action = actionBtn.dataset.action;
            if (action === 'back') {
                if (window.history.length > 1) {
                    window.history.back();
                } else {
                    ctx.navigate('/employees');
                }
                return;
            }
            if (action === 'menu') {
                ctx.navigate('/dashboard');
                return;
            }
            if (action && !actionBtn.disabled) {
                void runExport(action);
            }
            return;
        }

        const button = target.closest<HTMLButtonElement>('[data-page], #retry');
        if (!button || button.disabled || busy) {
            return;
        }
        if (button.dataset.page) {
            page = Number(button.dataset.page);
        }
        void load();
    });

    await load();
}
