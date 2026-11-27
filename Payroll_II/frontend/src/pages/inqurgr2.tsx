import { useRef, useState, useEffect } from 'react';
import { request } from '../services/api.ts';
import { errMsg } from '../utils/ui.ts';
import { AlertBox, Loading } from '../components/ui.tsx';
import Select from '../components/Select.tsx';
import { useAlive } from '../hooks.ts';
import { Link } from '../router.tsx';

type Usd = {
    usdsno: number;
    usdusd: string;
    usdnam: string;
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

type Checked = {
    rows: Prg[];
    usdadmin: boolean;
    usdnam: string;
    usrusdsnoauto: string;
};

const flags: UsrFlag[] = ['usryn', 'usraddyn', 'usrameyn', 'usrdelyn'];
const labels = ['View', 'Add', 'Amend', 'Delete'];
const api = '/administration/usrenter';

type MatrixState = 'initial' | 'cleared' | 'loading' | 'error' | 'ready';

// Render User Rights inquiry page (view only)
export default function Inqurgr2() {
    const alive = useAlive();
    const [users, setUsers] = useState<Usd[] | null>(null);
    const [loadError, setLoadError] = useState('');
    const [userId, setUserId] = useState('');
    const [allRows, setAllRows] = useState<Prg[]>([]);
    const [program, setProgram] = useState('');
    const [scopeUser, setScopeUser] = useState('');
    const [summary, setSummary] = useState('No user selected');
    const [admin, setAdmin] = useState(false);
    const [notice, setNotice] = useState('');
    const [matrix, setMatrix] = useState<MatrixState>('initial');
    const [busy, setBusy] = useState(false);
    const version = useRef(0);

    useEffect(() => {
        let cancelled = false;
        request<Usd[]>(`${api}/users`).then(
            (data) => {
                if (!cancelled) {
                    setUsers(data);
                }
            },
            (error) => {
                if (!cancelled) {
                    setLoadError(errMsg(error));
                }
            }
        );
        return () => {
            cancelled = true;
        };
    }, []);

    if (loadError) {
        return <AlertBox message={loadError} />;
    }

    if (!users) {
        return <Loading text="Loading users..." />;
    }

    // Reset table when the selected user changes
    function invalidate(): void {
        version.current++;
        setScopeUser('');
        setAllRows([]);
        setProgram('');
        setNotice('');
        setAdmin(false);
        setSummary('No user selected');
        setMatrix('cleared');
    }

    // Load saved rights for the chosen user
    async function load(user: string): Promise<void> {
        const current = ++version.current;
        const result = await request<Checked>(`${api}?${new URLSearchParams({ usrusdsno: user, modopt: 'A', smodopt: 'A' })}`);
        if (!alive() || current !== version.current) {
            return;
        }

        setScopeUser(user);
        const granted = result.rows.filter((row) => row.usryn === 'y'
            || (row.prglvl === 'M' && flags.some((flag) => row[flag] === 'y')));
        setAllRows(granted);
        setProgram(granted.length ? 'all' : '');
        setSummary(`${result.usrusdsnoauto} - ${result.usdnam} | ${granted.length} programs`);
        setAdmin(result.usdadmin);
        setMatrix('ready');
    }

    // Load rights immediately when a user is selected.
    async function onUser(value: string): Promise<void> {
        setUserId(value);
        invalidate();
        if (!value) {
            return;
        }

        setSummary('Loading user rights...');
        setMatrix('loading');
        setBusy(true);

        try {
            await load(value);
        } catch (error) {
            if (alive()) {
                invalidate();
                setSummary('Unable to load user rights');
                setMatrix('error');
                setNotice(errMsg(error));
            }
        } finally {
            if (alive()) {
                setBusy(false);
            }
        }
    }

    const rows = program && program !== 'all' ? allRows.filter((row) => row.prgnam === program) : allRows;

    let body;
    if (matrix === 'initial') {
        body = (
            <div className="usr-empty">
                <i className="bi bi-shield-check"></i>
                <h6>Select a user to view their rights.</h6>
            </div>
        );
    } else if (matrix === 'cleared') {
        body = <div className="usr-empty"><h6>Select a user to view their rights.</h6></div>;
    } else if (matrix === 'loading') {
        body = <Loading text="Loading user rights..." />;
    } else if (matrix === 'error') {
        body = <div className="usr-empty"><h6>Select a user to try again.</h6></div>;
    } else if (allRows.length === 0) {
        body = <div className="usr-empty"><i className="bi bi-grid"></i><h6>No programs for this user</h6></div>;
    } else {
        body = (
            <div className="table-responsive usr-table-wrap">
                <table className="table table-clean usr-table">
                    <caption className="visually-hidden">Program rights for {users.find((user) => String(user.usdsno) === scopeUser)?.usdusd}</caption>
                    <thead>
                        <tr>
                            <th>#</th>
                            <th>Module / Submodule</th>
                            <th>Order</th>
                            <th>Program name</th>
                            <th>Description</th>
                            {labels.map((label) => <th key={label} className="text-center">{label}</th>)}
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((row, index) => (
                            <tr key={index}>
                                <td>{index + 1}</td>
                                <td>{row.module}<small className="d-block text-muted">{row.submodule}</small></td>
                                <td>{row.prgorder}</td>
                                <td><code>{row.prgnam}</code><span className="usr-level">{row.prglvl === 'S' ? 'Single' : row.prglvl === 'M' ? 'Multiple' : 'Unspecified'}</span></td>
                                <td className="usr-description">{row.prgdes}</td>
                                {flags.map((flag, flagIndex) => (
                                    <td key={flag} className="text-center">
                                        <input
                                            type="checkbox"
                                            className="form-check-input"
                                            disabled
                                            checked={(row.prglvl === 'M' || (row.prglvl === 'S' && flag === 'usryn')) && row[flag] === 'y'}
                                            readOnly
                                            aria-label={`${labels[flagIndex]}: ${row.prgdes || row.prgnam}`}
                                        />
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        );
    }

    return (
        <>
            <div className="admin-banner d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
                <div className="d-flex align-items-center gap-3">
                    <span className="admin-banner-icon"><i className="bi bi-search" aria-hidden="true"></i></span>
                    <div>
                        <div className="admin-eyebrow">Administration</div>
                        <h4 className="page-title">inquire User Rights-Given User</h4>
                    </div>
                </div>
                <Link href="/usrenter" className="btn btn-outline-primary">
                    <i className="bi bi-arrow-left me-2" aria-hidden="true"></i>Back
                </Link>
            </div>
            <form name="inqurgr" id="inqurgr" className="card-soft p-4 mb-4 admin-records" noValidate aria-busy={busy} onSubmit={(e) => e.preventDefault()}>
                <div className="admin-records-heading"><h5>1. Select user and program</h5></div>
                <div className="row g-3 align-items-end">
                    <div className="col-md-6">
                        <label className="form-label" htmlFor="usrusdsno">User</label>
                        <Select id="usrusdsno" name="usrusdsno" required value={userId} disabled={busy || users.length === 0} onChange={(e) => void onUser(e.target.value)}>
                            <option value="">Select a user...</option>
                            {users.map((user) => (
                                <option key={user.usdsno} value={String(user.usdsno)}>{user.usdusd} - {user.usdnam}</option>
                            ))}
                        </Select>
                    </div>
                    <div className="col-md-6">
                        <label className="form-label" htmlFor="usr-program">Program</label>
                        <Select id="usr-program" name="program" value={program} disabled={busy || allRows.length === 0} onChange={(e) => setProgram(e.target.value)}>
                            {allRows.length ? (
                                <>
                                    <option value="all">All programs</option>
                                    {allRows.map((row, index) => (
                                        <option key={index} value={row.prgnam}>{row.prgnam} - {row.prgdes}</option>
                                    ))}
                                </>
                            ) : (
                                <option value="">{matrix === 'ready' ? 'No programs for this user' : 'Select a user first...'}</option>
                            )}
                        </Select>
                    </div>
                </div>
                {users.length ? null : <p className="text-muted mt-3 mb-0">No users available.</p>}
            </form>
            <div id="notice" role="status" aria-live="polite">{notice ? <AlertBox message={notice} /> : null}</div>
            <section className="card-soft p-3 admin-records">
                <div className="admin-records-heading">
                    <h5>2. View program rights</h5>
                    <span id="usr-summary" aria-live="polite">{summary}</span>
                </div>
                <p className="text-muted small">Single: View only · Multi: View / Add / Amend / Delete</p>
                <div id="usr-admin-note">
                    {admin ? <div className="alert alert-info py-2 small">Administrator account: saved rights below override default access.</div> : null}
                </div>
                <div id="usr-matrix">{body}</div>
            </section>
        </>
    );
}
