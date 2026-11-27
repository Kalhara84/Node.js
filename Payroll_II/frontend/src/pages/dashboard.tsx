import { useCallback, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { api } from '../services/api.ts';
import { currentUser, canEmployee } from '../services/auth.ts';
import { money, errMsg, CATEGORY, GENDER } from '../utils/ui.ts';
import { AlertBox, EmptyState, Loading } from '../components/ui.tsx';
import { BarList, ColumnChart, DonutChart, PALETTE } from '../components/charts.tsx';
import { useAlive } from '../hooks.ts';
import { Link } from '../router.tsx';
import type { DashboardData } from '../types.ts';

// Stat card helper
function Stat({ icon, tone, label, value }: { icon: string; tone: string; label: string; value: string | number }) {
    return (
        <div className="col">
            <div className="card-soft stat-card">
                <span className={`stat-icon tone-${tone}`}><i className={`bi ${icon}`}></i></span>
                <div>
                    <div className="stat-value">{value}</div>
                    <div className="stat-label">{label}</div>
                </div>
            </div>
        </div>
    );
}

// Chart container card helper
function ChartCard({ title, icon, children }: { title: string; icon: string; children: ReactNode }) {
    return (
        <div className="card-soft h-100">
            <div className="card-head"><i className={`bi ${icon}`}></i> {title}</div>
            <div className="card-body-pad">{children}</div>
        </div>
    );
}

// Dashboard data view
function DashboardView({ d }: { d: DashboardData }) {
    const t = d.totals;
    const salary = (value: number): string => `LKR ${money(value, 2)}`;
    const updated = new Date(d.asOf).toLocaleString('en-GB');

    return (
        <div className="fade-in">
            <p className="text-muted small">Updated: {updated} ? Employee master summary. Salary figures are recorded basic salaries, not processed payroll.</p>
            {/* Top statistics row */}
            <div className="row row-cols-1 row-cols-sm-2 row-cols-xl-3 g-3 mb-3">
                <Stat icon="bi-people-fill" tone="blue" label="Total employees" value={t.total} />
                <Stat icon="bi-person-check-fill" tone="green" label="Active employees" value={t.active} />
                <Stat icon="bi-person-dash-fill" tone="red" label="Inactive employees" value={t.inactive} />
                <Stat icon="bi-person-question" tone="amber" label="Status not set" value={t.unknownStatus} />
                <Stat icon="bi-cash-stack" tone="amber" label="Recorded basic salary total (active)" value={salary(t.payroll)} />
                <Stat icon="bi-graph-up-arrow" tone="purple" label="Average basic salary (active)" value={salary(t.avgSalary)} />
                <Stat icon="bi-person-plus-fill" tone="teal" label="Joined this year" value={t.joinedThisYear} />
            </div>

            {/* Category & Gender charts */}
            <div className="row g-3 mb-3">
                <div className="col-lg-6">
                    <ChartCard title="Active employees by category" icon="bi-pie-chart">
                        <DonutChart
                            items={d.byCategory.map((c) => ({
                                label: CATEGORY[String(c.label)] ?? String(c.label),
                                value: c.value
                            }))}
                            centerLabel="Active"
                        />
                    </ChartCard>
                </div>
                <div className="col-lg-6">
                    <ChartCard title="Active employees by gender" icon="bi-gender-ambiguous">
                        <DonutChart
                            items={d.byGender.map((g, i) => ({
                                label: GENDER[String(g.label)] ?? String(g.label),
                                value: g.value,
                                color: i === 0 ? '#6d4aff' : '#ff7a3d'
                            }))}
                            centerLabel="Active"
                        />
                    </ChartCard>
                </div>
            </div>

            {/* Department charts */}
            <div className="row g-3 mb-3">
                <div className="col-lg-6"><ChartCard title="Active employees by department" icon="bi-diagram-3"><BarList items={d.byDepartment} /></ChartCard></div>
                <div className="col-lg-6"><ChartCard title="Recorded basic salary by department (active)" icon="bi-cash-coin"><BarList items={d.payrollByDepartment} format={salary} color={PALETTE[1]} /></ChartCard></div>
            </div>

            {/* Joiners per year and location */}
            <div className="row g-3 mb-3">
                <div className="col-lg-7"><ChartCard title="New joiners per year" icon="bi-bar-chart-line"><ColumnChart items={d.joinsByYear.slice(-8)} /></ChartCard></div>
                <div className="col-lg-5"><ChartCard title="Active employees by location" icon="bi-geo-alt"><BarList items={d.byLocation} color={PALETTE[3]} /></ChartCard></div>
            </div>

            {/* Recent employees table */}
            <div className="card-soft">
                <div className="card-head justify-content-between">
                    <span className="d-flex align-items-center gap-2"><i className="bi bi-clock-history"></i>Recently added employees</span>
                    <Link href="/employees" className="small text-decoration-none">View all</Link>
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
                            {d.recent.length ? d.recent.map((r) => (
                                <tr key={r.empsno}>
                                    <td className="fw-semibold">{r.empeno}</td>
                                    <td>
                                        <Link href={`/employees/${r.empsno}`} className="text-decoration-none d-flex align-items-center gap-2 fw-semibold">
                                            <span className={`avatar av${r.empsno % 5}`} style={{ width: '32px', height: '32px', fontSize: '.78rem' }}>
                                                {(r.empnam || '?').charAt(0).toUpperCase()}
                                            </span>
                                            {r.empnam}
                                        </Link>
                                    </td>
                                    <td>{r.empdesig || '-'}</td>
                                    <td>{r.department_name ?? '-'}</td>
                                    <td>{r.empjoin ?? '-'}</td>
                                </tr>
                            )) : (
                                <tr><td colSpan={5}><EmptyState title="No employees yet" /></td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

type State = { kind: 'loading' } | { kind: 'error'; message: string } | { kind: 'ok'; data: DashboardData };

// Render main dashboard page
export default function Dashboard() {
    const alive = useAlive();
    const user = currentUser();
    const [state, setState] = useState<State>({ kind: 'loading' });
    const [spin, setSpin] = useState(false);
    const requestNumber = useRef(0);

    const today = new Date().toLocaleDateString('en-GB', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    });

    // Fetch and display dashboard stats and charts
    const load = useCallback(async (): Promise<void> => {
        const currentRequest = ++requestNumber.current;
        setSpin(true);
        setState({ kind: 'loading' });
        try {
            const data = await api.dashboard();
            if (!alive() || currentRequest !== requestNumber.current) {
                return;
            }
            setState({ kind: 'ok', data });
        } catch (e) {
            if (alive() && currentRequest === requestNumber.current) {
                setState({ kind: 'error', message: errMsg(e) });
            }
        } finally {
            if (currentRequest === requestNumber.current) {
                setSpin(false);
            }
        }
    }, [alive]);

    useEffect(() => {
        void load();
    }, [load]);

    if (!user) {
        return null;
    }

    return (
        <>
            <div className="hero-banner d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4 fade-in">
                <div>
                    <div className="sub small mb-1"><i className="bi bi-calendar3 me-1"></i>{today}</div>
                    <h3>Hello, {user.name} 👋</h3>
                    <div className="sub">Here is a summary of your employees and payroll.</div>
                </div>
                <div className="d-flex gap-2">
                    <button className="btn btn-ghost" id="refresh" onClick={() => void load()}>
                        <i className={`bi bi-arrow-clockwise me-1${spin ? ' spin' : ''}`}></i>Refresh
                    </button>
                    {canEmployee('add') ? (
                        <Link href="/employees/new" className="btn btn-light"><i className="bi bi-plus-lg me-1"></i>Add Employee</Link>
                    ) : null}
                </div>
            </div>
            <div id="dash-body">
                {state.kind === 'loading' ? <Loading text="Loading dashboard..." /> : null}
                {state.kind === 'error' ? <AlertBox message={state.message} /> : null}
                {state.kind === 'ok' ? <DashboardView d={state.data} /> : null}
            </div>
        </>
    );
}
