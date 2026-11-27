import { useEffect, useRef, useState } from 'react';
import { canEmployee } from '../services/auth.ts';
import { api } from '../services/api.ts';
import { money, errMsg, CATEGORY } from '../utils/ui.ts';
import { AlertBox, EmptyState, confirmModal } from '../components/ui.tsx';
import { Link } from 'react-router-dom';
import type { Employee, Paged } from '../types.ts';

// Generate single employee table row
function EmployeeRow({ e, onDelete }: { e: Employee; onDelete: (e: Employee) => void }) {
    const isActive = e.empactflg === 'Y';
    const statusClass = isActive ? 'badge-soft-green' : 'badge-soft-red';
    const statusText = isActive ? 'Active' : 'Inactive';

    return (
        <tr>
            <td className="fw-semibold">{e.empeno}</td>
            <td>
                <div className="d-flex align-items-center gap-2">
                    <span className={`avatar av${e.empsno % 5}`}>{(e.empnam || '?').charAt(0).toUpperCase()}</span>
                    <div>
                        <div className="fw-semibold" style={{ color: 'var(--ink)' }}>{e.empnam}</div>
                        <div className="text-muted small">{e.empidno || e.empdesig || ''}</div>
                    </div>
                </div>
            </td>
            <td><span className="badge badge-soft-blue">{CATEGORY[e.empcat] ?? e.empcat}</span></td>
            <td>
                <div>{e.department_name ?? '-'}</div>
                <div className="text-muted small">{e.location_name ?? ''}</div>
            </td>
            <td>{e.empdesig || '-'}</td>
            <td className="text-end">{money(e.empsal, 2)}</td>
            <td><span className={`badge ${statusClass}`}><i className="dot"></i>{statusText}</span></td>
            <td className="text-end text-nowrap">
                <Link to={`/employees/${e.empsno}`} className="btn btn-outline-secondary btn-sm icon-btn me-1" title="View"><i className="bi bi-eye"></i></Link>
                {canEmployee('amend') ? (
                    <Link to={`/employees/${e.empsno}/edit`} className="btn btn-outline-primary btn-sm icon-btn me-1" title="Edit"><i className="bi bi-pencil"></i></Link>
                ) : null}
                {canEmployee('delete') ? (
                    <button className="btn btn-outline-danger btn-sm icon-btn" title="Delete" onClick={() => onDelete(e)}><i className="bi bi-trash"></i></button>
                ) : null}
            </td>
        </tr>
    );
}

// Render employee list page with search and pagination
export default function Employees() {
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [reload, setReload] = useState(0);
    const [result, setResult] = useState<Paged<Employee> | null>(null);
    const [loading, setLoading] = useState(true);
    const [err, setErr] = useState('');
    const timer = useRef<number | undefined>(undefined);

    // Fetch employee data from API
    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        setErr('');
        api.list(search, page).then(
            (r) => {
                if (cancelled) {
                    return;
                }
                setResult(r);
                setLoading(false);
            },
            (e) => {
                if (cancelled) {
                    return;
                }
                setErr(errMsg(e));
                setLoading(false);
            }
        );
        return () => {
            cancelled = true;
        };
    }, [search, page, reload]);

    useEffect(() => () => clearTimeout(timer.current), []);

    // Debounced search input handler
    function onSearch(value: string): void {
        clearTimeout(timer.current);
        const trimmed = value.trim();
        timer.current = window.setTimeout(() => {
            setSearch(trimmed);
            setPage(1);
            setReload((n) => n + 1);
        }, 350);
    }

    // Delete button click handler
    async function onDelete(emp: Employee): Promise<void> {
        const confirmed = await confirmModal({
            title: 'Delete employee',
            message: `Delete ${emp.empnam} (Emp No ${emp.empeno})? This cannot be undone.`
        });
        if (!confirmed) {
            return;
        }

        try {
            await api.remove(emp.empsno);
            if (result && result.data.length === 1 && page > 1) {
                setPage(page - 1);
            } else {
                setReload((n) => n + 1);
            }
        } catch (error) {
            setErr(errMsg(error));
        }
    }

    // Rows body: loading, error (empty), rows or empty state
    let body;
    if (loading) {
        body = <tr><td colSpan={8} className="text-center text-muted py-5">Loading...</td></tr>;
    } else if (!result || err) {
        body = null;
    } else if (result.data.length) {
        body = result.data.map((e) => <EmployeeRow key={e.empsno} e={e} onDelete={(x) => void onDelete(x)} />);
    } else {
        body = <tr><td colSpan={8}><EmptyState title="No employees found" sub="Try a different search term." /></td></tr>;
    }

    return (
        <>
            <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-3">
                <div>
                    <h4 className="page-title">Employees</h4>
                    <div className="page-sub" id="count">{result ? `${result.total} employees in total` : '\u00a0'}</div>
                </div>
                <div className="d-flex align-items-center gap-2">
                    <Link to="/employees/view" className="btn btn-outline-primary" title="View all employees"><i className="bi bi-eye me-1"></i> View</Link>
                    {canEmployee('add') ? (
                        <Link to="/employees/new" className="btn btn-primary"><i className="bi bi-plus-lg me-1"></i> Add Employee</Link>
                    ) : null}
                </div>
            </div>
            <div id="err">{err ? <AlertBox message={err} /> : null}</div>
            <div className="card-soft fade-in">
                <div style={{ borderBottom: '1px solid var(--line)', padding: '16px 22px' }}>
                    <div className="input-group" style={{ maxWidth: '420px' }}>
                        <span className="input-group-text"><i className="bi bi-search"></i></span>
                        <input
                            id="search"
                            className="form-control"
                            placeholder="Search by name, employee no, NIC, designation"
                            onChange={(e) => onSearch(e.target.value)}
                        />
                    </div>
                </div>
                <div className="table-responsive">
                    <table className="table table-clean">
                        <thead>
                            <tr>
                                <th>Emp No</th>
                                <th>Name</th>
                                <th>Category</th>
                                <th>Department</th>
                                <th>Designation</th>
                                <th className="text-end">Basic Salary</th>
                                <th>Status</th>
                                <th className="text-end">Actions</th>
                            </tr>
                        </thead>
                        <tbody id="rows">{body}</tbody>
                    </table>
                </div>
                <div id="pager">
                    {result && result.totalPages > 1 ? (
                        <div className="card-body-pad d-flex justify-content-between align-items-center">
                            <div className="text-muted small">Page {result.page} of {result.totalPages}</div>
                            <div className="btn-group">
                                <button className="btn btn-outline-secondary btn-sm" disabled={result.page <= 1} onClick={() => setPage(result.page - 1)}><i className="bi bi-chevron-left"></i> Prev</button>
                                <button className="btn btn-outline-secondary btn-sm" disabled={result.page >= result.totalPages} onClick={() => setPage(result.page + 1)}>Next <i className="bi bi-chevron-right"></i></button>
                            </div>
                        </div>
                    ) : null}
                </div>
            </div>
        </>
    );
}
