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
    let busy = false;

    el.innerHTML = `
      <div class="mb-3">
        <h4 class="page-title">All Employee Details</h4>
        <div class="page-sub" id="count" role="status">Loading employees...</div>
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
