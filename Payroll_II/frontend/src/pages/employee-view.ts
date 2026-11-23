// Load one employee and show their personal, job, salary and contact details.
import { canEmployee } from '../services/auth.ts';
import { api, getLookups } from '../services/api.ts';
import { esc, errMsg, qs, CATEGORY, yn, loading, alertBox, confirmModal } from '../utils/ui.ts';
import type { Employee, Lookups, PageContext, SysItem } from '../types.ts';

// Detail field display helper
const item = (label: string, value: string | number | null | undefined): string => {
    // Show a dash for empty values and safely escape values that exist.
    let displayValue = '-';
    if (value !== null && value !== undefined && value !== '') {
        displayValue = esc(value);
    }
    return `
    <div class="col-6 col-md-4 col-lg-3 detail-item">
      <div class="k">${esc(label)}</div>
      <div class="v">${displayValue}</div>
    </div>`;
};

// Detail card section helper
const section = (icon: string, title: string, items: string[]): string => `
  <div class="card-soft mb-3 fade-in">
    <div class="card-head"><i class="bi ${icon}"></i> ${esc(title)}</div>
    <div class="card-body-pad"><div class="row g-3">${items.join('')}</div></div>
  </div>`;

// Render single employee details view page
export async function render(el: HTMLElement, ctx: PageContext): Promise<void> {
    // Read the employee ID captured from the browser URL.
    const id = Number(ctx.params[0]);
    el.innerHTML = loading();

    let emp: Employee;
    let lookups: Lookups | null;

    try {
        // Fetch the employee and dropdown descriptions together.
        [emp, lookups] = await Promise.all([
            api.get(id),
            getLookups().catch(() => null)
        ]);
    } catch (e) {
        if (ctx.alive()) {
            el.innerHTML = alertBox(errMsg(e));
        }
        return;
    }

    // Ignore results if the user has already moved to another page.
    if (!ctx.alive()) return;

    // Lookup description helper
    const name = (list: SysItem[] | undefined, key: number | null, field: 'sysdes' | 'sysrno' = 'sysdes'): string | undefined => {
        return list?.find((x) => x.syssno === key)?.[field];
    };

    // Translate stored codes into readable status, department and gender labels.
    const statusText = emp.empactflg === 'Y' ? 'Active' : 'Inactive';
    const departmentBadge = emp.department_name ? `<span class="badge">${esc(emp.department_name)}</span>` : '';
    const gender = emp.empmof === 'M' ? 'Male' : emp.empmof === 'F' ? 'Female' : emp.empmof;

    // Build the employee profile and its grouped detail cards.
    el.innerHTML = `
      <div class="profile-hero d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4 fade-in">
        <div class="d-flex align-items-center gap-3">
          <span class="avatar">${esc((emp.empnam || '?').charAt(0).toUpperCase())}</span>
          <div>
            <h4>${esc(emp.empnam)}</h4>
            <div class="sub">Emp No ${emp.empeno} &middot; ${esc(emp.empdesig || 'No designation')}</div>
            <div class="mt-2 d-flex gap-2 flex-wrap">
              <span class="badge">${esc(CATEGORY[emp.empcat] ?? emp.empcat)}</span>
              <span class="badge">${statusText}</span>
              ${departmentBadge}
            </div>
          </div>
        </div>
        <div class="d-flex gap-2 flex-wrap">
          <a href="/employees" data-link class="btn btn-ghost"><i class="bi bi-arrow-left me-1"></i>Back</a>
          ${canEmployee('amend') ? `<a href="/employees/${emp.empsno}/edit" data-link class="btn btn-light"><i class="bi bi-pencil me-1"></i>Edit</a>` : ''}
          ${canEmployee('delete') ? `<button class="btn btn-ghost" id="del"><i class="bi bi-trash me-1"></i>Delete</button>` : ''}
        </div>
      </div>
      <div id="msg"></div>

      <!-- Personal details -->
      ${section('bi-person', 'Personal', [
          item('Initial', emp.empinital),
          item('Employee Name', emp.empnam),
          item('Sex', gender),
          item('Married', yn(emp.empmrdtst)),
          item('National ID', emp.empidno),
          item('Passport No', emp.emppasportno),
          item('Date of Birth', emp.empdob),
          item('Status', emp.empsts),
      ])}

      <!-- Job & Department details -->
      ${section('bi-briefcase', 'Job', [
          item('Category', CATEGORY[emp.empcat] ?? emp.empcat),
          item('Designation', emp.empdesig),
          item('Department', emp.department_name),
          item('Location', emp.location_name),
          item('Section', name(lookups?.sections, emp.empsecsno)),
          item('Area', name(lookups?.areas, emp.emparesno)),
          item('Cost Center', name(lookups?.costCenters, emp.empcossno, 'sysrno')),
          item('Basis', name(lookups?.basis, emp.empbasisno)),
          item('Date Joined', emp.empjoin),
          item('Date Left', emp.empleft),
          item('Map Code', emp.empmapcode),
          item('Active', yn(emp.empactflg)),
      ])}

      <!-- Salary and statutory records -->
      ${section('bi-cash-stack', 'Salary & Statutory', [
          item('Basic Salary', emp.empsal),
          item('E.P.F', yn(emp.empepfyn)),
          item('E.P.F #', emp.empepfno),
          item('PAYE', yn(emp.emppayeyn)),
          item('Tax Table No', emp.emptno),
          item('PAYE Relief', emp.empprl),
          item('Up To Date Gross Earnings', emp.empgin),
          item('Up To Date Tax', emp.emptax),
          item('TIN No', emp.emptin),
          item('Coin Op Bal', emp.empcob),
          item('Service Charge %', emp.empscgpcn),
      ])}

      <!-- Bank information -->
      ${section('bi-bank', 'Bank', [
          item('Bank A/C #', emp.empbnkacno),
          item('Bank Code', emp.empbnkcode),
          item('Bank Branch', emp.empbnkbranch),
          item('Bank Id', emp.empbnkid),
      ])}

      <!-- Contact details -->
      ${section('bi-telephone', 'Contact', [
          item('Address', [emp.empad1, emp.empad2, emp.empad3, emp.empad4].filter(Boolean).join(', ')),
          item('Email', emp.empemail),
          item('Telephone', emp.emptel),
      ])}

      <!-- Leave & attendance rules -->
      ${section('bi-calendar-check', 'Leave & Flags', [
          item('Annual', emp.empanual),
          item('Casual', emp.empcasal),
          item('L/L', emp.empleuleu),
          item('OT', yn(emp.empotflg)),
          item('No Pay', yn(emp.empnopflg)),
          item('Attendance Incentive', yn(emp.empattincflg)),
          item('Late', yn(emp.emplateflg)),
          item('Sat Leave', yn(emp.empnsatlflg)),
      ])}`;

    // Handle delete button click
    const deleteButton = el.querySelector<HTMLButtonElement>('#del');
    if (deleteButton) {
        deleteButton.onclick = async () => {
            // Ask for confirmation before removing this employee.
            const confirmed = await confirmModal({
                title: 'Delete employee',
                message: `Delete ${emp.empnam} (Emp No ${emp.empeno})? This cannot be undone.`
            });
            if (!confirmed) return;

            try {
                // Delete the record and return to the employee list.
                await api.remove(emp.empsno);
                ctx.navigate('/employees');
            } catch (e) {
                qs(el, '#msg').innerHTML = alertBox(errMsg(e));
            }
        };
    }
}
