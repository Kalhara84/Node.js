import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { CATEGORY, confirmModal, errMsg, money } from '../utils/ui';
import type { Employee, Paged } from '../types';

export default function Employees() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<Paged<Employee> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const requestId = useRef(0);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setPage(1);
    }, 350);

    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    void load();
  }, [search, page]);

  async function load() {
    const id = ++requestId.current;
    setLoading(true);
    setError('');

    try {
      const response = await api.list(search.trim(), page);

      if (id !== requestId.current) return;

      setResult(response);
    } catch (e) {
      if (id !== requestId.current) return;

      setError(errMsg(e));
      setResult(null);
    } finally {
      if (id === requestId.current) {
        setLoading(false);
      }
    }
  }

  async function deleteEmployee(employee: Employee) {
    const ok = await confirmModal({
      title: 'Delete employee',
      message:
        `Delete ${employee.empnam} (Emp No ${employee.empeno})? ` +
        'This cannot be undone.',
    });

    if (!ok) return;

    try {
      await api.remove(employee.empsno);

      if (result && result.data.length === 1 && page > 1) {
        setPage((p) => p - 1);
      } else {
        await load();
      }
    } catch (e) {
      setError(errMsg(e));
    }
  }

  return (
    <>
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-3">
        <div>
          <h4 className="page-title">Employees</h4>
          <div className="page-sub">
            {result ? `${result.total} employees in total` : '\u00a0'}
          </div>
        </div>

        <Link to="/employees/new" className="btn btn-primary">
          <i className="bi bi-plus-lg me-1" />
          Add Employee
        </Link>
      </div>

      {error && <div className="alert alert-danger py-2">{error}</div>}

      <div className="card-soft fade-in">
        <div
          style={{
            borderBottom: '1px solid var(--line)',
            padding: '16px 22px',
          }}
        >
          <div className="input-group" style={{ maxWidth: 420 }}>
            <span className="input-group-text">
              <i className="bi bi-search" />
            </span>

            <input
              className="form-control"
              placeholder="Search by name, employee no, NIC, designation"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
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

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="text-center text-muted py-5">
                    <div className="spinner-border text-primary mb-2" />
                    <div>Loading...</div>
                  </td>
                </tr>
              ) : result?.data.length ? (
                result.data.map((employee) => {
                  const active = employee.empactflg === 'Y';

                  return (
                    <tr key={employee.empsno}>
                      <td className="fw-semibold">{employee.empeno}</td>

                      <td>
                        <div className="d-flex align-items-center gap-2">
                          <span className={`avatar av${employee.empsno % 5}`}>
                            {(employee.empnam || '?').charAt(0).toUpperCase()}
                          </span>

                          <div>
                            <div
                              className="fw-semibold"
                              style={{ color: 'var(--ink)' }}
                            >
                              {employee.empnam}
                            </div>

                            <div className="text-muted small">
                              {employee.empidno || employee.empdesig || ''}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td>
                        <span className="badge badge-soft-blue">
                          {CATEGORY[employee.empcat] ?? employee.empcat}
                        </span>
                      </td>

                      <td>
                        <div>{employee.department_name ?? '-'}</div>
                        <div className="text-muted small">
                          {employee.location_name ?? ''}
                        </div>
                      </td>

                      <td>{employee.empdesig || '-'}</td>

                      <td className="text-end">
                        {money(employee.empsal, 2)}
                      </td>

                      <td>
                        <span
                          className={`badge ${
                            active ? 'badge-soft-green' : 'badge-soft-red'
                          }`}
                        >
                          <i className="dot" />
                          {active ? 'Active' : 'Inactive'}
                        </span>
                      </td>

                      <td className="text-end text-nowrap">
                        <Link
                          to={`/employees/${employee.empsno}`}
                          className="btn btn-outline-secondary btn-sm icon-btn me-1"
                          title="View"
                        >
                          <i className="bi bi-eye" />
                        </Link>

                        <Link
                          to={`/employees/${employee.empsno}/edit`}
                          className="btn btn-outline-primary btn-sm icon-btn me-1"
                          title="Edit"
                        >
                          <i className="bi bi-pencil" />
                        </Link>

                        <button
                          type="button"
                          className="btn btn-outline-danger btn-sm icon-btn"
                          title="Delete"
                          onClick={() => void deleteEmployee(employee)}
                        >
                          <i className="bi bi-trash" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={8}>
                    <div className="empty-state">
                      <div className="t">No employees found</div>
                      <div className="small">
                        Try a different search term.
                      </div>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {result && result.totalPages > 1 && (
          <div className="card-body-pad d-flex justify-content-between align-items-center">
            <div className="text-muted small">
              Page {result.page} of {result.totalPages}
            </div>

            <div className="btn-group">
              <button
                type="button"
                className="btn btn-outline-secondary btn-sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                <i className="bi bi-chevron-left" /> Prev
              </button>

              <button
                type="button"
                className="btn btn-outline-secondary btn-sm"
                disabled={page >= result.totalPages}
                onClick={() =>
                  setPage((p) => Math.min(result.totalPages, p + 1))
                }
              >
                Next <i className="bi bi-chevron-right" />
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
