import { useEffect, useRef, useState } from 'react';
import { request } from '../services/api.ts';
import { alertBox, errMsg, esc, loading, markup, useLoad, useAlive } from '../utils/ui.tsx';
type Usd = {
  usdsno: number; 
  usdusd: string; 
  usdnam: string 
};

type UsrFlag = 'usryn' | 'usraddyn' | 'usrameyn' | 'usrdelyn';

type Prg = {
    prgnam: string;
    prgdes: string;
    prgorder: string;
    prglvl: string;
    module: string | null;
    submodule: string | null;
} & Record<UsrFlag, string | null>;

type Scope = {
    usrusdsno: string;
    modopt: string;
    smodopt: string;
};

type Checked = {
    rows: Prg[];
    usdadmin: boolean;
    usdnam: string;
    usrusdsnoauto: string;
};

const flags: UsrFlag[] = ['usryn', 'usraddyn', 'usrameyn', 'usrdelyn'];
const labels = ['View', 'Add', 'Amend', 'Delete'];
const api = '/administration/usrenter';


export default function Inquiry() {
    const alive = useAlive();
    const version = useRef(0);
    const initial = useLoad(() => request<Usd[]>(api + '/users'));
    const [user, setUser] = useState('');
    const [program, setProgram] = useState('');
    const [result, setResult] = useState<Checked | null>(null);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    useEffect(() => {
        const current = ++version.current;
        setResult(null); setProgram(''); setError('');
        if (!user) { setBusy(false); return; }
        setBusy(true);
        const scope: Scope = { usrusdsno: user, modopt: 'A', smodopt: 'A' };
        void request<Checked>(api + '?' + new URLSearchParams(scope)).then((data) => {
            if (!alive.current || current !== version.current) return;
            data = { ...data, rows: data.rows.filter((row) => row.usryn === 'y' || (row.prglvl === 'M' && flags.some((flag) => row[flag] === 'y'))) };
            setResult(data); setProgram(data.rows.length ? 'all' : '');
        }).catch((reason: unknown) => { if (alive.current && current === version.current) setError(errMsg(reason)); })
          .finally(() => { if (alive.current && current === version.current) setBusy(false); });
    }, [user]);
    if (initial.error) return <>{markup(alertBox(initial.error))}</>;
    if (!initial.data) return <>{markup(loading('Loading users...'))}</>;
    const users = initial.data;
    const te_scope = user ? { usrusdsno: user } : null;
    const te_rows = result?.rows ?? [];
    const rows = program && program !== 'all' ? te_rows.filter((row) => row.prgnam === program) : te_rows;
    const matrix = busy ? loading('Loading user rights...') : error ? '<div class="usr-empty"><h6>Select a user to try again.</h6></div>' : !result ? '<div class="usr-empty"><i class="bi bi-shield-check"></i><h6>Select a user to view their rights.</h6></div>' : !te_rows.length ? '<div class="usr-empty"><i class="bi bi-grid"></i><h6>No programs for this user</h6></div>' : `
              <divclass="table-responsive usr-table-wrap">
                <table class="table table-clean usr-table">
                  <caption class="visually-hidden">Program rights for ${esc(users.find((user) => String(user.usdsno) === te_scope?.usrusdsno)?.usdusd)}</caption>
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Module / Submodule</th>
                      <th>Order</th>
                      <th>Program name</th>
                      <th>Description</th>
                      ${labels.map((label) => `<th class="text-center">${label}</th>`).join('')}
                    </tr>
                  </thead>
                  <tbody>
                    ${rows.map((row, index) => `
                    <tr>
                      <td>${index + 1}</td>
                      <td>${esc(row.module)}<small class="d-block text-muted">${esc(row.submodule)}</small></td>
                      <td>${esc(row.prgorder)}</td>
                      <td><code>${esc(row.prgnam)}</code><span class="usr-level">${row.prglvl === 'S' ? 'Single' : row.prglvl === 'M' ? 'Multiple' : 'Unspecified'}</span></td>
                      <td class="usr-description">${esc(row.prgdes)}</td>
                      ${flags.map((flag, flagIndex) => `<td class="text-center">
                        <input type="checkbox" class="form-check-input" disabled
                          ${(row.prglvl === 'M' || (row.prglvl === 'S' && flag === 'usryn')) && row[flag] === 'y' ? 'checked' : ''}
                          aria-label="${labels[flagIndex]}: ${esc(row.prgdes || row.prgnam)}">
                      </td>`).join('')}
                    </tr>`).join('')}
                  </tbody>
                </table>
              </div>`;
    return <>{markup(`
      <divclass="admin-banner d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
        <div class="d-flex align-items-center gap-3">
          <span class="admin-banner-icon"><i class="bi bi-search" aria-hidden="true"></i></span>
          <div>
            <div class="admin-eyebrow">Administration</div>
            <h4 class="page-title">inquire User Rights-Given User</h4>
          </div>
        </div>
        <a href="/usrenter" data-link class="btn btn-outline-primary">
          <i class="bi bi-arrow-left me-2" aria-hidden="true"></i>Back
        </a>
      </div>
      <form name="inqurgr" id="inqurgr" class="card-soft p-4 mb-4 admin-records" novalidate>
        <div class="admin-records-heading"><h5>1. Select user and program</h5></div>
        <div class="row g-3 align-items-end">
          <div class="col-md-6">
            <label class="form-label" for="usrusdsno">User</label>
            <select id="usrusdsno" name="usrusdsno" class="form-select" required>
              <option value="">Select a user...</option>
              ${users.map((user) => `<option value="${esc(user.usdsno)}">${esc(user.usdusd)} - ${esc(user.usdnam)}</option>`).join('')}
            </select>
          </div>
          <div class="col-md-6">
            <label class="form-label" for="usr-program">Program</label>
            <select id="usr-program" name="program" class="form-select" disabled>
              <option value="">Select a user first...</option>
            </select>
          </div>
        </div>
        ${users.length ? '' : '<p class="text-muted mt-3 mb-0">No users available.</p>'}
      </form>
      <div id="notice" role="status" aria-live="polite"></div>
      <section class="card-soft p-3 admin-records">
        <div class="admin-records-heading">
          <h5>2. View program rights</h5>
          <span id="usr-summary" aria-live="polite">No user selected</span>
        </div>
        <p class="text-muted small">Single: View only &middot; Multi: View / Add / Amend / Delete</p>
        <div id="usr-admin-note"></div>
        <div id="usr-matrix">
          <div class="usr-empty">
            <i class="bi bi-shield-check"></i>
            <h6>Select a user to view their rights.</h6>
          </div>
        </div>
      </section>`, {
        inqurgr: { onSubmit: (event: React.FormEvent) => event.preventDefault(), 'aria-busy': busy },
        usrusdsno: { value: user, disabled: busy || !users.length, onChange: (event: React.ChangeEvent<HTMLSelectElement>) => setUser(event.target.value) },
        'usr-program': { value: program, disabled: busy || !te_rows.length, onChange: (event: React.ChangeEvent<HTMLSelectElement>) => setProgram(event.target.value), children: te_rows.length ? <><option value="all">All programs</option>{te_rows.map((row) => <option key={row.prgnam} value={row.prgnam}>{row.prgnam} - {row.prgdes}</option>)}</> : <option value="">{result ? 'No programs for this user' : 'Select a user first...'}</option> },
        notice: { children: markup(error ? alertBox(error) : '') },
        'usr-summary': { children: busy ? 'Loading user rights...' : error ? 'Unable to load user rights' : result ? result.usrusdsnoauto + ' - ' + result.usdnam + ' | ' + te_rows.length + ' programs' : 'No user selected' },
        'usr-admin-note': { children: result?.usdadmin ? <div className="alert alert-info py-2 small">Administrator account: saved rights below override default access.</div> : null },
        'usr-matrix': { children: markup(matrix) }
    })}</>;
}
