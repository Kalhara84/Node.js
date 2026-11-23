import { api } from '../services/api.ts';
import { currentUser, canEmployee } from '../services/auth.ts';
import { esc, money, errMsg, qs, CATEGORY, GENDER, loading, alertBox, emptyState } from '../utils/ui.ts';
import type { DashboardData, PageContext } from '../types.ts';
import { donutChart, barList, columnChart, PALETTE } from '../utils/charts.ts';

// Stat card markup helper
const stat = (icon: string, tone: string, label: string, value: string | number): string => `
  <div class="col">
    <div class="card-soft stat-card">
      <span class="stat-icon tone-${tone}"><i class="bi ${icon}"></i></span>
      <div>
        <div class="stat-value">${esc(value)}</div>
        <div class="stat-label">${esc(label)}</div>
      </div>
    </div>
  </div>`;

// Chart container card helper
const chartCard = (title: string, icon: string, body: string): string => `
  <div class="card-soft h-100">
    <div class="card-head"><i class="bi ${icon}"></i> ${esc(title)}</div>
    <div class="card-body-pad">${body}</div>
  </div>`;

// Render main dashboard page
export async function render(el: HTMLElement, ctx: PageContext): Promise<void> {
    const user = currentUser();
    if (!user) {
        return;
    }

    const today = new Date().toLocaleDateString('en-GB', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    });

    el.innerHTML = `
      <div class="hero-banner d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4 fade-in">
        <div>
          <div class="sub small mb-1"><i class="bi bi-calendar3 me-1"></i>${esc(today)}</div>
          <h3>Hello, ${esc(user.name)} 👋</h3>
          <div class="sub">Here is a summary of your employees and payroll.</div>
        </div>
        <div class="d-flex gap-2">
          <button class="btn btn-ghost" id="refresh"><i class="bi bi-arrow-clockwise me-1"></i>Refresh</button>
          ${canEmployee('add') ? '<a href="/employees/new" data-link class="btn btn-light"><i class="bi bi-plus-lg me-1"></i>Add Employee</a>' : ''}
        </div>
      </div>
      <div id="dash-body"></div>`;

    const body = qs(el, '#dash-body');
    const icon = qs(el, '#refresh i');

    // Fetch and display dashboard stats and charts
    let requestNumber = 0;
    async function load(): Promise<void> {
        const currentRequest = ++requestNumber;
        icon.classList.add('spin');
        body.innerHTML = loading('Loading dashboard...');
        try {
            const data = await api.dashboard();
            if (!ctx.alive() || currentRequest !== requestNumber) {
                return;
            }
            body.innerHTML = view(data);
        } catch (e) {
            if (ctx.alive() && currentRequest === requestNumber) {
                body.innerHTML = alertBox(errMsg(e));
            }
        } finally {
            if (currentRequest === requestNumber) {
                icon.classList.remove('spin');
            }
        }
    }

    qs(el, '#refresh').onclick = load;
    await load();
}

// Generate HTML view for dashboard data
function view(d: DashboardData): string {
    const t = d.totals;
    const salary = (value: number): string => `LKR ${money(value, 2)}`;
    const updated = new Date(d.asOf).toLocaleString('en-GB');
    const recent = d.recent.length
        ? d.recent.map((r) => `
            <tr>
              <td class="fw-semibold">${r.empeno}</td>
              <td>
                <a href="/employees/${r.empsno}" data-link class="text-decoration-none d-flex align-items-center gap-2 fw-semibold">
                  <span class="avatar av${r.empsno % 5}" style="width:32px;height:32px;font-size:.78rem">
                    ${esc((r.empnam || '?').charAt(0).toUpperCase())}
                  </span>
                  ${esc(r.empnam)}
                </a>
              </td>
              <td>${esc(r.empdesig || '-')}</td>
              <td>${esc(r.department_name ?? '-')}</td>
              <td>${esc(r.empjoin ?? '-')}</td>
            </tr>`).join('')
        : `<tr><td colspan="5">${emptyState('No employees yet')}</td></tr>`;

    return `
      <div class="fade-in">
        <p class="text-muted small">Updated: ${esc(updated)} ? Employee master summary. Salary figures are recorded basic salaries, not processed payroll.</p>
        <!-- Top statistics row -->
        <div class="row row-cols-1 row-cols-sm-2 row-cols-xl-3 g-3 mb-3">
          ${stat('bi-people-fill', 'blue', 'Total employees', t.total)}
          ${stat('bi-person-check-fill', 'green', 'Active employees', t.active)}
          ${stat('bi-person-dash-fill', 'red', 'Inactive employees', t.inactive)}
          ${stat('bi-person-question', 'amber', 'Status not set', t.unknownStatus)}
          ${stat('bi-cash-stack', 'amber', 'Recorded basic salary total (active)', salary(t.payroll))}
          ${stat('bi-graph-up-arrow', 'purple', 'Average basic salary (active)', salary(t.avgSalary))}
          ${stat('bi-person-plus-fill', 'teal', 'Joined this year', t.joinedThisYear)}
        </div>

        <!-- Category & Gender charts -->
        <div class="row g-3 mb-3">
          <div class="col-lg-6">
            ${chartCard('Active employees by category', 'bi-pie-chart', donutChart(d.byCategory.map((c) => ({
        label: CATEGORY[String(c.label)] ?? String(c.label),
        value: c.value
    })), 'Active'))}
          </div>
          <div class="col-lg-6">
            ${chartCard('Active employees by gender', 'bi-gender-ambiguous', donutChart(d.byGender.map((g, i) => ({
        label: GENDER[String(g.label)] ?? String(g.label),
        value: g.value,
        color: i === 0 ? '#6d4aff' : '#ff7a3d'
    })), 'Active'))}
          </div>
        </div>

        <!-- Department charts -->
        <div class="row g-3 mb-3">
          <div class="col-lg-6">${chartCard('Active employees by department', 'bi-diagram-3', barList(d.byDepartment))}</div>
          <div class="col-lg-6">${chartCard('Recorded basic salary by department (active)', 'bi-cash-coin', barList(d.payrollByDepartment, { format: salary, color: PALETTE[1] }))}</div>
        </div>

        <!-- Joiners per year and location -->
        <div class="row g-3 mb-3">
          <div class="col-lg-7">${chartCard('New joiners per year', 'bi-bar-chart-line', columnChart(d.joinsByYear.slice(-8)))}</div>
          <div class="col-lg-5">${chartCard('Active employees by location', 'bi-geo-alt', barList(d.byLocation, { color: PALETTE[3] }))}</div>
        </div>

        <!-- Recent employees table -->
        <div class="card-soft">
          <div class="card-head justify-content-between">
            <span class="d-flex align-items-center gap-2"><i class="bi bi-clock-history"></i>Recently added employees</span>
            <a href="/employees" data-link class="small text-decoration-none">View all</a>
          </div>
          <div class="table-responsive">
            <table class="table table-clean">
              <thead>
                <tr>
                  <th>Emp No</th>
                  <th>Name</th>
                  <th>Designation</th>
                  <th>Department</th>
                  <th>Joined</th>
                </tr>
              </thead>
              <tbody>${recent}</tbody>
            </table>
          </div>
        </div>
      </div>`;
}
