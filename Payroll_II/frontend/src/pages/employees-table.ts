import { api } from '../services/api.ts';
import { alertBox, CATEGORY, emptyState, errMsg, esc, GENDER, money, qs, yn } from '../utils/ui.ts';
import type { Employee, PageContext } from '../types.ts';

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
    let employees: Employee[] = [];

    el.innerHTML = `
      <div class="mb-3">
        <h4 class="page-title">All Employee Details</h4>
        <div class="page-sub" id="count" role="status">Loading employees...</div>
      </div>
      <div id="err" role="alert"></div>
      <div class="card-soft fade-in">
        <div class="card-body-pad text-muted small">Scroll horizontally to view all employee details.</div>
        <div class="table-responsive" tabindex="0" role="region" aria-label="All employee details" style="max-height:70vh">
          <table class="table table-clean text-nowrap">
            <caption class="visually-hidden">All employee details, read only</caption>
            <thead>
              <tr>
                ${columns.map((key) => `<th scope="col">${esc(labels[key])}</th>`).join('')}
              </tr>
            </thead>
            <tbody id="rows"></tbody>
          </table>
        </div>
      </div>`;

    const $ = <T extends HTMLElement = HTMLElement>(s: string): T => qs<T>(el, s);

    // Fetch all employee pages from API (maximum 100 records per request)
    async function load(): Promise<void> {
        $('#rows').innerHTML = `<tr><td colspan="${columns.length}" class="text-center text-muted py-5">Loading...</td></tr>`;
        $('#err').innerHTML = '';
        employees = [];

        try {
            let page = 1;
            let totalPages = 1;

            do {
                const result = await api.list('', page, 100);
                if (!ctx.alive()) {
                    return;
                }

                employees.push(...result.data);
                totalPages = result.totalPages;
                $('#count').textContent = `Loading employees: ${employees.length} of ${result.total}`;
                page += 1;
            } while (page <= totalPages);

            draw();
        } catch (e) {
            if (!ctx.alive()) {
                return;
            }
            $('#err').innerHTML = alertBox(errMsg(e));
            $('#count').textContent = 'Unable to load employees. Reload the page to try again.';
            $('#rows').innerHTML = '';
        }
    }

    // Render employee rows and total count
    function draw(): void {
        $('#count').textContent = `${employees.length} employees in total`;

        if (employees.length) {
            $('#rows').innerHTML = employees.map(row).join('');
        } else {
            $('#rows').innerHTML = `<tr><td colspan="${columns.length}">${emptyState('No employees found')}</td></tr>`;
        }
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

    await load();
}
