import { api } from '../services/api.ts';
import { alertBox, CATEGORY, emptyState, errMsg, esc, GENDER, money, qs, yn } from '../utils/ui.ts';
import type { Employee, Paged, PageContext } from '../types.ts';
import { allEmployees, copyText, excel, pdf, printTable } from '../utils/employee-export.ts';
import type { ExportTable } from '../utils/employee-export.ts';

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
    let busy = false;
    let exporting = false;

    el.innerHTML = `
      <div class="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-3">
        <div>
          <h4 class="page-title">All Employee Details</h4>
          <div class="page-sub" id="count" role="status">Loading employees...</div>
        </div>
        <div class="d-flex flex-wrap gap-2" role="group" aria-label="Employee table tools">
          <button type="button" id="back" class="btn btn-outline-secondary">Back</button>
          <button type="button" data-export="copy" class="btn btn-outline-primary"><i class="bi bi-copy me-1"></i>Copy</button>
          <button type="button" data-export="pdf" class="btn btn-outline-primary"><i class="bi bi-file-earmark-pdf me-1"></i>PDF</button>
          <button type="button" data-export="excel" class="btn btn-outline-primary" title="Download Excel workbook"><i class="bi bi-file-earmark-excel me-1"></i>EXLE</button>
          <button type="button" data-export="print" class="btn btn-outline-primary"><i class="bi bi-printer me-1"></i>PRINT</button>
          <a href="/dashboard" data-link class="btn btn-primary"><i class="bi bi-grid me-1"></i>MENU</a>
        </div>
      </div>
      <div id="export-status" class="text-muted small mb-3" role="status" aria-live="polite" hidden></div>
      <div id="export-error" role="alert"></div>
      <div id="copy-fallback" class="mb-3" hidden>
        <label for="copy-data" class="form-label">All employee data is ready. Copy below or press Ctrl+C on the selected text.</label>
        <textarea id="copy-data" class="form-control mb-2" rows="4" readonly></textarea>
        <button type="button" id="copy-ready" class="btn btn-outline-primary btn-sm">Copy prepared data</button>
      </div>
      <div id="err" role="alert"></div>
      <div class="card-soft fade-in employee-details-card">
        <div class="card-body-pad d-flex flex-wrap justify-content-between align-items-center gap-2">
          <div>
            <div class="fw-semibold">Employee records</div>
            <div class="text-muted small">Scroll sideways for more details. Employee numbers and names stay visible.</div>
          </div>
          <span class="badge badge-soft-blue">25 employees per page</span>
        </div>
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

    // A newly opened tab has no previous page, so return to Employees in that case
    $('#back').onclick = () => {
        if (window.history.length > 1) {
            window.history.back();
        } else {
            ctx.navigate('/employees');
        }
    };

    // Retry clipboard access directly from a user click if the browser requires it
    $('#copy-ready').onclick = async () => {
        const input = $<HTMLTextAreaElement>('#copy-data');
        input.focus();
        input.select();
        try {
            await navigator.clipboard.writeText(input.value);
            if (ctx.alive()) {
                $('#copy-fallback').hidden = true;
                $('#export-status').textContent = 'All employee data copied. Paste into Excel.';
                input.value = '';
            }
        } catch {
            if (ctx.alive()) {
                $('#export-status').textContent = 'Press Ctrl+C to copy the selected data, then paste into Excel.';
            }
        }
    };

    // Export fresh data from every API page, independently of table pagination
    async function exportData(action: string): Promise<void> {
        if (exporting) {
            return;
        }
        exporting = true;
        let popup: Window | null = null;
        const progress = (text: string): void => {
            if (ctx.alive()) {
                $('#export-status').textContent = text;
            }
        };
        el.querySelectorAll<HTMLButtonElement>('[data-export]').forEach((button) => {
            button.disabled = true;
        });
        $('#export-error').innerHTML = '';
        $('#export-status').hidden = false;
        $('#copy-fallback').hidden = true;
        $<HTMLTextAreaElement>('#copy-data').value = '';
        progress('Loading all employees...');

        try {
            // Open synchronously from the click so popup blockers allow printing
            if (action === 'print') {
                popup = window.open('', '_blank');
                if (!popup) {
                    throw new Error('Allow popups for this site, then press PRINT again.');
                }
                popup.opener = null;
                popup.document.body.textContent = 'Preparing all employee records for printing...';
            }
            const alive = (): boolean => ctx.alive() && (!popup || !popup.closed);
            const employees = await allEmployees(progress, alive);
            if (!employees.length) {
                popup?.close();
                progress('No employees available to export.');
                return;
            }

            const table: ExportTable = {
                headings: columns.map((key) => labels[key]),
                rows: employees.map((employee) => columns.map((key) => {
                    const value = employee[key];
                    if (amounts.has(key) && value !== null && value !== undefined && value !== '' && Number.isFinite(Number(value))) {
                        return Number(value);
                    }
                    return display(employee, key);
                }))
            };
            progress(`Preparing ${employees.length} employees...`);

            if (action === 'copy') {
                const text = copyText(table);
                try {
                    await navigator.clipboard.writeText(text);
                } catch {
                    if (ctx.alive()) {
                        const input = $<HTMLTextAreaElement>('#copy-data');
                        input.value = text;
                        $('#copy-fallback').hidden = false;
                        input.focus();
                        input.select();
                        progress(`${employees.length} employees ready. Use Copy prepared data or Ctrl+C below.`);
                    }
                    return;
                }
                progress(`Copied all ${employees.length} employees. Paste into Excel.`);
            } else if (action === 'excel') {
                await excel(table);
                progress(`Excel download created with all ${employees.length} employees.`);
            } else if (action === 'pdf') {
                await pdf(table, progress, alive);
                progress(`PDF download created with all ${employees.length} employees.`);
            } else if (action === 'print' && popup) {
                await printTable(table, popup, alive);
                progress(`Print dialog opened for all ${employees.length} employees.`);
            }
        } catch (e) {
            popup?.close();
            if (ctx.alive()) {
                $('#export-error').innerHTML = alertBox(errMsg(e));
                progress('Export was not completed. Please try again.');
            }
        } finally {
            exporting = false;
            if (ctx.alive()) {
                el.querySelectorAll<HTMLButtonElement>('[data-export]').forEach((button) => {
                    button.disabled = false;
                });
            }
        }
    }

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

    // Load the next batch only when requested
    el.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        const exportButton = target.closest<HTMLButtonElement>('[data-export]');
        if (exportButton) {
            if (!exportButton.disabled) {
                void exportData(exportButton.dataset.export ?? '');
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
