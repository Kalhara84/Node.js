import { useEffect, useRef, useState } from 'react';
import { canEmployee } from '../services/auth.ts';
import { api } from '../services/api.ts';
import { esc, money, errMsg, CATEGORY, emptyState, confirmModal, markup, useAlive } from '../utils/ui.tsx';
import type { Employee, Paged } from '../types.ts';

export default function Employees() {
    const [search, setSearch] = useState('');
    const [query, setQuery] = useState('');
    const [page, setPage] = useState(1);
    const [result, setResult] = useState<Paged<Employee> | null>(null);
    const [busy, setBusy] = useState(true);
    const [error, setError] = useState('');
    const [revision, setRevision] = useState(0);
    const alive = useAlive();
    const version = useRef(0);
    useEffect(() => {
        const timer = window.setTimeout(() => { setQuery(search.trim()); setPage(1); }, 350);
        return () => clearTimeout(timer);
    }, [search]);
    useEffect(() => {
        const current = ++version.current;
        setBusy(true); setError('');
        void api.list(query, page).then((data) => {
            if (alive.current && current === version.current) setResult(data);
        }).catch((error: unknown) => {
            if (alive.current && current === version.current) setError(errMsg(error));
        }).finally(() => {
            if (alive.current && current === version.current) setBusy(false);
        });
    }, [query, page, revision]);
    async function remove(id: number): Promise<void> {
        const employee = result?.data.find((row) => row.empsno === id);
        if (!employee) return;
        const confirmed = await confirmModal({ title: 'Delete employee', message: `Delete ${employee.empnam} (Emp No ${employee.empeno})? This cannot be undone.` });
        if (!confirmed || !alive.current) return;
        try {
            await api.remove(id);
            if (!alive.current) return;
            if (result?.data.length === 1 && page > 1) setPage(page - 1);
            else setRevision((value) => value + 1);
        } catch (error) { if (alive.current) setError(errMsg(error)); }
    }
    const row = (e: Employee): string => {
        const isActive = e.empactflg === 'Y';
        const statusClass = isActive ? 'badge-soft-green' : 'badge-soft-red';
        const statusText = isActive ? 'Active' : 'Inactive';

        return `
          <tr>
            <td class="fw-semibold">${e.empeno}</td>
            <td>
              <div class="d-flex align-items-center gap-2">
                <span class="avatar av${e.empsno % 5}">${esc((e.empnam || '?').charAt(0).toUpperCase())}</span>
                <div>
                  <div class="fw-semibold" style="color:var(--ink)">${esc(e.empnam)}</div>
                  <div class="text-muted small">${esc(e.empidno || e.empdesig || '')}</div>
                </div>
              </div>
            </td>
            <td><span class="badge badge-soft-blue">${esc(CATEGORY[e.empcat] ?? e.empcat)}</span></td>
            <td>
              <div>${esc(e.department_name ?? '-')}</div>
              <div class="text-muted small">${esc(e.location_name ?? '')}</div>
            </td>
            <td>${esc(e.empdesig || '-')}</td>
            <td class="text-end">${money(e.empsal, 2)}</td>
            <td><span class="badge ${statusClass}"><i class="dot"></i>${statusText}</span></td>
            <td class="text-end text-nowrap">
              <a href="/employees/${e.empsno}" data-link class="btn btn-outline-secondary btn-sm icon-btn me-1" title="View"><i class="bi bi-eye"></i></a>
              ${canEmployee('amend') ? `<a href="/employees/${e.empsno}/edit" data-link class="btn btn-outline-primary btn-sm icon-btn me-1" title="Edit"><i class="bi bi-pencil"></i></a>` : ''}
              ${canEmployee('delete') ? `<button class="btn btn-outline-danger btn-sm icon-btn" title="Delete" data-del="${e.empsno}"><i class="bi bi-trash"></i></button>` : ''}
            </td>
          </tr>`;
    };
    const rows = busy ? '<tr><td colspan="8" class="text-center text-muted py-5">Loading...</td></tr>' : error ? '' : result?.data.length ? result.data.map(row).join('') : `<tr><td colspan="8">${emptyState('No employees found', 'Try a different search term.')}</td></tr>`;
    return <>{markup(`
      <div class="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-3">
        <div>
          <h4 class="page-title">Employees</h4>
          <div class="page-sub" id="count">&nbsp;</div>
        </div>
        <div class="d-flex align-items-center gap-2">
          <a href="/employees/view" data-link class="btn btn-outline-primary" title="View all employees"><i class="bi bi-eye me-1"></i> View</a>
          ${canEmployee('add') ? `<a href="/employees/new" data-link class="btn btn-primary"><i class="bi bi-plus-lg me-1"></i> Add Employee</a>` : ''}
        </div>
      </div>
      <div id="err"></div>
      <div class="card-soft fade-in">
        <div style="border-bottom:1px solid var(--line);padding:16px 22px">
          <div class="input-group" style="max-width:420px">
            <span class="input-group-text"><i class="bi bi-search"></i></span>
            <input id="search" class="form-control" placeholder="Search by name, employee no, NIC, designation" />
          </div>
        </div>
        <div class="table-responsive">
          <table class="table table-clean">
            <thead>
              <tr>
                <th>Emp No</th>
                <th>Name</th>
                <th>Category</th>
                <th>Department</th>
                <th>Designation</th>
                <th class="text-end">Basic Salary</th>
                <th>Status</th>
                <th class="text-end">Actions</th>
              </tr>
            </thead>
            <tbody id="rows"></tbody>
          </table>
        </div>
        <div id="pager"></div>
      </div>`, {
        search: { value: search, onChange: (event: React.ChangeEvent<HTMLInputElement>) => setSearch(event.target.value) },
        count: { children: result ? result.total + ' employees in total' : '\u00a0' },
        err: { children: error ? <div className="alert alert-danger py-2">{error}</div> : null },
        rows: { children: markup(rows, (element) => element.attribs['data-del'] ? { onClick: () => remove(Number(element.attribs['data-del'])) } : {}) },
        pager: { children: result && result.totalPages > 1 ? <div className="card-body-pad d-flex justify-content-between align-items-center"><div className="text-muted small">Page {result.page} of {result.totalPages}</div><div className="btn-group"><button className="btn btn-outline-secondary btn-sm" disabled={busy || page <= 1} onClick={() => setPage(page - 1)}><i className="bi bi-chevron-left" /> Prev</button><button className="btn btn-outline-secondary btn-sm" disabled={busy || page >= result.totalPages} onClick={() => setPage(page + 1)}>Next <i className="bi bi-chevron-right" /></button></div></div> : null }
    })}</>;
}
