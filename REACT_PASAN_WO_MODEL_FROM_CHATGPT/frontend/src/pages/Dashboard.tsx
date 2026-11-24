import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { currentUser } from '../services/auth';
import { CATEGORY, GENDER, errMsg, money } from '../utils/ui';
import { barList, columnChart, donutChart, PALETTE } from '../utils/charts';
import type { DashboardData } from '../types';

function Stat({
  icon,
  tone,
  label,
  value,
}: {
  icon: string;
  tone: string;
  label: string;
  value: string | number;
}) {
  return (
    <div className="col">
      <div className="card-soft stat-card">
        <span className={`stat-icon tone-${tone}`}>
          <i className={`bi ${icon}`} />
        </span>
        <div>
          <div className="stat-value">{value}</div>
          <div className="stat-label">{label}</div>
        </div>
      </div>
    </div>
  );
}

function ChartCard({
  title,
  icon,
  html,
}: {
  title: string;
  icon: string;
  html: string;
}) {
  return (
    <div className="card-soft h-100">
      <div className="card-head">
        <i className={`bi ${icon}`} />
        {title}
      </div>
      <div
        className="card-body-pad"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
}

export default function Dashboard() {
  const user = currentUser();
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const result = await api.dashboard();
      setData(result);
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (!user) return null;

  const today = new Date().toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <>
      <div className="hero-banner d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4 fade-in">
        <div>
          <div className="sub small mb-1">
            <i className="bi bi-calendar3 me-1" />
            {today}
          </div>

          <h3>Hello, {user.name} 👋</h3>

          <div className="sub">
            Here is a summary of your employees and payroll.
          </div>
        </div>

        <div className="d-flex gap-2">
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => void load()}
            disabled={loading}
          >
            <i className={`bi bi-arrow-clockwise me-1 ${loading ? 'spin' : ''}`} />
            Refresh
          </button>

          <Link to="/employees/new" className="btn btn-light">
            <i className="bi bi-plus-lg me-1" />
            Add Employee
          </Link>
        </div>
      </div>

      {error && <div className="alert alert-danger py-2">{error}</div>}

      {loading && !data ? (
        <div className="text-center text-muted py-5">
          <div className="spinner-border text-primary mb-2" />
          <div>Loading dashboard...</div>
        </div>
      ) : data ? (
        <div className="fade-in">
          <div className="row row-cols-1 row-cols-sm-2 row-cols-xl-3 g-3 mb-3">
            <Stat icon="bi-people-fill" tone="blue" label="Total employees" value={data.totals.total} />
            <Stat icon="bi-person-check-fill" tone="green" label="Active employees" value={data.totals.active} />
            <Stat icon="bi-person-dash-fill" tone="red" label="Inactive employees" value={data.totals.inactive} />
            <Stat icon="bi-cash-stack" tone="amber" label="Basic payroll (active, per month)" value={money(data.totals.payroll)} />
            <Stat icon="bi-graph-up-arrow" tone="purple" label="Average basic salary" value={money(data.totals.avgSalary)} />
            <Stat icon="bi-person-plus-fill" tone="teal" label="Joined this year" value={data.totals.joinedThisYear} />
          </div>

          <div className="row g-3 mb-3">
            <div className="col-lg-6">
              <ChartCard
                title="Active employees by category"
                icon="bi-pie-chart"
                html={donutChart(
                  data.byCategory.map((c) => ({
                    label: CATEGORY[String(c.label)] ?? String(c.label),
                    value: c.value,
                  })),
                  'Active',
                )}
              />
            </div>

            <div className="col-lg-6">
              <ChartCard
                title="Gender"
                icon="bi-gender-ambiguous"
                html={donutChart(
                  data.byGender.map((g, i) => ({
                    label: GENDER[String(g.label)] ?? String(g.label),
                    value: g.value,
                    color: i === 0 ? '#6d4aff' : '#ff7a3d',
                  })),
                  'Active',
                )}
              />
            </div>
          </div>

          <div className="row g-3 mb-3">
            <div className="col-lg-6">
              <ChartCard
                title="Employees by department"
                icon="bi-diagram-3"
                html={barList(data.byDepartment)}
              />
            </div>

            <div className="col-lg-6">
              <ChartCard
                title="Basic salary by department"
                icon="bi-cash-coin"
                html={barList(data.payrollByDepartment, {
                  format: money,
                  color: PALETTE[1],
                })}
              />
            </div>
          </div>

          <div className="row g-3 mb-3">
            <div className="col-lg-7">
              <ChartCard
                title="New joiners per year"
                icon="bi-bar-chart-line"
                html={columnChart(data.joinsByYear.slice(-8))}
              />
            </div>

            <div className="col-lg-5">
              <ChartCard
                title="Employees by location"
                icon="bi-geo-alt"
                html={barList(data.byLocation, { color: PALETTE[3] })}
              />
            </div>
          </div>

          <div className="card-soft">
            <div className="card-head justify-content-between">
              <span className="d-flex align-items-center gap-2">
                <i className="bi bi-clock-history" />
                Recently added employees
              </span>

              <Link to="/employees" className="small text-decoration-none">
                View all
              </Link>
            </div>

            <div className="table-responsive">
              <table className="table table-clean">
                <thead>
                  <tr>
                    <th>Emp No</th>
                    <th>Name</th>
                    <th>Designation</th>
                    <th>Department</th>
                    <th>Joined</th>
                  </tr>
                </thead>

                <tbody>
                  {data.recent.length ? (
                    data.recent.map((r) => (
                      <tr key={r.empsno}>
                        <td className="fw-semibold">{r.empeno}</td>
                        <td>
                          <Link
                            to={`/employees/${r.empsno}`}
                            className="text-decoration-none d-flex align-items-center gap-2 fw-semibold"
                          >
                            <span
                              className={`avatar av${r.empsno % 5}`}
                              style={{
                                width: 32,
                                height: 32,
                                fontSize: '.78rem',
                              }}
                            >
                              {(r.empnam || '?').charAt(0).toUpperCase()}
                            </span>
                            {r.empnam}
                          </Link>
                        </td>
                        <td>{r.empdesig || '-'}</td>
                        <td>{r.department_name ?? '-'}</td>
                        <td>{r.empjoin ?? '-'}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5}>
                        <div className="empty-state">
                          <div className="t">No employees yet</div>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
