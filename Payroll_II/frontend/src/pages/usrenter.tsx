import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { request } from '../services/api.ts';
import { can } from '../services/auth.ts';
import { errMsg } from '../utils/ui.ts';
import { AlertBox, Loading, confirmModal } from '../components/ui.tsx';
import Select from '../components/Select.tsx';
import { useAlive } from '../App.tsx';
import { Link } from 'react-router-dom';

type Lookup = { syssno: number; sysdes: string };
type Usd = { usdsno: number; usdusd: string; usdnam: string };
type UsrFlag = 'usryn' | 'usraddyn' | 'usrameyn' | 'usrdelyn';
type Prg = {
    prgsno: number;
    prgnam: string;
    prgdes: string;
    prgorder: string;
    prglvl: string;
    module: string | null;
    submodule: string | null;
} & Record<UsrFlag, string | null>;

type Scope = {
    usrusdsno: string;
    usrusdsnoauto: string;
    modopt: string;
    smodopt: string;
    modsno: string;
    modsnoauto: string;
    submodsno: string;
    submodsnoauto: string;
};

type Checked = {
    rows: Prg[];
    usdadmin: boolean;
    usdnam: string;
    usrusdsnoauto: string;
};

const flags: UsrFlag[] = ['usryn', 'usraddyn', 'usrameyn', 'usrdelyn'];
const labels = ['View', 'Add', 'Amend', 'Delete'];
const api = '/program/usrenter';

// Check if permission flag is editable based on Single or Multiple program level
const editable = (row: Prg, flag: UsrFlag): boolean =>
    row.prglvl === 'M' || (row.prglvl === 'S' && flag === 'usryn');

// Text of the selected <option> ("Select..." when nothing is chosen)
const optionText = (rows: Lookup[], value: string): string =>
    value ? rows.find((row) => String(row.syssno) === value)?.sysdes ?? '' : 'Select...';

// Scope filter component (All vs Select radio buttons with dropdown)
function ScopePicker({ name, field, label, rows, option, value, onOption, onValue }: {
    name: string;
    field: string;
    label: string;
    rows: Lookup[];
    option: string;
    value: string;
    onOption: (v: string) => void;
    onValue: (v: string) => void;
}) {
    const selected = option === 'S';
    return (
        <div className="col-md-6">
            <div className="d-flex justify-content-between gap-2 mb-2">
                <span className="form-label mb-0" id={`${name}-label`}>{label}</span>
                <div className="d-flex gap-3" role="group" aria-labelledby={`${name}-label`}>
                    <label className="small"><input className="form-check-input me-1" type="radio" name={name} value="A" checked={option === 'A'} onChange={() => onOption('A')} />All</label>
                    <label className="small"><input className="form-check-input me-1" type="radio" name={name} value="S" checked={selected} onChange={() => onOption('S')} />Select</label>
                </div>
            </div>
            <Select name={field} id={field} aria-labelledby={`${name}-label`} disabled={!selected} required={selected} value={value} onChange={(e) => onValue(e.target.value)}>
                <option value="">Select...</option>
                {rows.map((row) => <option key={row.syssno} value={String(row.syssno)}>{row.sysdes}</option>)}
            </Select>
        </div>
    );
}

// Column header checkbox (select all / indeterminate)
function ColumnCheck({ flag, index, rows, onChange }: { flag: UsrFlag; index: number; rows: Prg[]; onChange: (checked: boolean) => void }) {
    const applicable = rows.filter((row) => editable(row, flag));
    const checkedCount = applicable.filter((row) => row[flag] === 'y').length;
    return (
        <th className="text-center">
            <label>
                <input
                    className="form-check-input d-block mx-auto mb-2"
                    type="checkbox"
                    data-column={flag}
                    aria-label={`Select all ${labels[index]} rights`}
                    disabled={!can('rights', 'amend') || applicable.length === 0}
                    checked={applicable.length > 0 && checkedCount === applicable.length}
                    ref={(el) => {
                        if (el) {
                            el.indeterminate = checkedCount > 0 && checkedCount < applicable.length;
                        }
                    }}
                    onChange={(e) => onChange(e.target.checked)}
                />
                {labels[index]}
            </label>
        </th>
    );
}

// Render legacy User Rights permission matrix page
export default function Usrenter() {
    const alive = useAlive();
    const [data, setData] = useState<{ lookups: { modules: Lookup[]; submodules: Lookup[] }; users: Usd[] } | null>(null);
    const [loadError, setLoadError] = useState('');

    const [userId, setUserId] = useState('');
    const [modopt, setModopt] = useState('A');
    const [modsno, setModsno] = useState('');
    const [smodopt, setSmodopt] = useState('A');
    const [submodsno, setSubmodsno] = useState('');

    const [scope, setScope] = useState<Scope | null>(null);
    const [rows, setRows] = useState<Prg[]>([]);
    const [saved, setSaved] = useState<Prg[]>([]);
    const [summary, setSummary] = useState('No user checked');
    const [admin, setAdmin] = useState(false);
    const [matrix, setMatrix] = useState<'begin' | 'updated' | 'ready'>('begin');
    const [notice, setNotice] = useState<{ text: string; error: boolean } | null>(null);
    const [busy, setBusyState] = useState(false);
    const busyRef = useRef(false);
    const version = useRef(0);
    const scopeRef = useRef<Scope | null>(null);
    const rowsRef = useRef<Prg[]>([]);

    const setBusy = (value: boolean): void => {
        busyRef.current = value;
        setBusyState(value);
    };

    const putRows = (next: Prg[]): void => {
        rowsRef.current = next;
        setRows(next);
    };

    useEffect(() => {
        let cancelled = false;
        Promise.all([
            request<{ modules: Lookup[]; submodules: Lookup[] }>('/program/lookups'),
            request<Usd[]>('/program/usrenter/users')
        ]).then(
            ([lookups, users]) => {
                if (!cancelled) {
                    setData({ lookups, users });
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

    if (!data) {
        return <Loading text="Loading user rights..." />;
    }

    const { lookups, users } = data;
    const user = users.find((row) => String(row.usdsno) === userId);

    // Reset table when filter changes
    function invalidate(): void {
        version.current++;
        scopeRef.current = null;
        setScope(null);
        putRows([]);
        setSaved([]);
        setAdmin(false);
        setSummary('Press CHECK to load this selection');
        setMatrix('updated');
        setNotice(null);
    }

    // Build scope object from current form values
    function selectedScope(): Scope {
        return {
            usrusdsno: userId,
            usrusdsnoauto: user?.usdusd ?? '',
            modopt,
            smodopt,
            modsno,
            modsnoauto: optionText(lookups.modules, modsno),
            submodsno,
            submodsnoauto: optionText(lookups.submodules, submodsno)
        };
    }

    // Load rights for the chosen scope
    async function load(next: Scope): Promise<void> {
        const current = ++version.current;
        const result = await request<Checked>(`${api}?${new URLSearchParams(next)}`);
        if (!alive() || current !== version.current) {
            return;
        }

        scopeRef.current = next;
        setScope(next);
        putRows(result.rows);
        setSaved(result.rows.map((row) => ({ ...row })));
        setSummary(`${result.usrusdsnoauto} - ${result.usdnam} | ${result.rows.length} programs`);
        setAdmin(result.usdadmin);
        setMatrix('ready');
    }

    // Any filter control changed
    const onFilter = (change: () => void) => (): void => {
        change();
        invalidate();
    };

    // Handle form submit (CHECK action)
    async function onSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
        event.preventDefault();
        if (busyRef.current || !event.currentTarget.reportValidity()) {
            return;
        }

        const next = selectedScope();
        setNotice(null);
        setBusy(true);

        try {
            await load(next);
        } catch (error) {
            if (alive()) {
                invalidate();
                setNotice({ text: errMsg(error), error: true });
            }
        } finally {
            if (alive()) {
                setBusy(false);
            }
        }
    }

    // Check or uncheck an entire column
    function checkCol(checkyn: boolean, colnam: UsrFlag): void {
        if (!can('rights', 'amend')) return;
        putRows(rows.map((row) => (editable(row, colnam) ? { ...row, [colnam]: checkyn ? 'y' : 'n' } : row)));
    }

    // Check or uncheck all applicable flags
    function checkAll(checkyn: boolean): void {
        if (!can('rights', 'amend')) return;
        putRows(rows.map((row) => {
            const next = { ...row };
            for (const flag of flags) {
                if (editable(row, flag)) {
                    next[flag] = checkyn ? 'y' : 'n';
                }
            }
            return next;
        }));
    }

    // Single permission checkbox
    function setFlag(index: number, flag: UsrFlag, checked: boolean): void {
        putRows(rows.map((row, i) => (i === index ? { ...row, [flag]: checked ? 'y' : 'n' } : row)));
    }

    // Save or delete permissions
    async function save(remove: boolean): Promise<void> {
        if (!can('rights', remove ? 'delete' : 'amend')) {
            return;
        }
        const currentScope = scopeRef.current;
        const currentRows = rowsRef.current;
        if (busyRef.current || !currentScope || !currentRows.length) {
            return;
        }
        const target = { ...currentScope };
        const startVersion = version.current;

        if (remove) {
            const confirmed = await confirmModal({
                title: 'Delete user rights?',
                message: `Remove all rights for ${target.usrusdsnoauto} in the checked selection (${currentRows.length} programs)?`,
                confirmText: 'Delete rights'
            });
            if (!confirmed) {
                return;
            }
        }

        if (!alive() || startVersion !== version.current || busyRef.current) {
            return;
        }

        const payload = {
            ...target,
            save: !remove,
            delete: remove,
            hcount: currentRows.length,
            hcountmod: 0,
            prgsno: currentRows.map((row) => row.prgsno),
            ...Object.fromEntries(
                flags.map((flag) => [flag, currentRows.map((row) => (editable(row, flag) && row[flag] === 'y' ? 'y' : 'n'))])
            )
        };

        setBusy(true);
        setNotice(null);

        try {
            const result = await request<{ message: string }>(api, {
                method: 'POST',
                body: JSON.stringify(payload)
            });
            if (!alive()) {
                return;
            }

            try {
                await load(target);
            } catch {
                invalidate();
                setNotice({ text: `${result.message}. Press CHECK to reload the saved rights.`, error: true });
                return;
            }

            if (alive()) {
                setNotice({ text: result.message, error: false });
            }
        } catch (error) {
            if (alive()) {
                setNotice({ text: errMsg(error), error: true });
            }
        } finally {
            if (alive()) {
                setBusy(false);
            }
        }
    }

    // Number of programs with unsaved changes
    let changed = 0;
    for (const [index, row] of rows.entries()) {
        if (flags.some((flag) => editable(row, flag) && (row[flag] === 'y') !== (saved[index]?.[flag] === 'y'))) {
            changed++;
        }
    }

    let body;
    if (matrix === 'begin') {
        body = (
            <div className="usr-empty">
                <i className="bi bi-shield-check"></i>
                <h6>Check a user's programs to begin</h6>
                <p>Select a user and press CHECK to load their saved rights.</p>
            </div>
        );
    } else if (matrix === 'updated') {
        body = <div className="usr-empty"><i className="bi bi-arrow-repeat"></i><h6>Selection updated</h6><p>Press CHECK to load the saved rights.</p></div>;
    } else if (rows.length === 0) {
        body = (
            <div className="usr-empty">
                <i className="bi bi-grid"></i>
                <h6>No programs in this selection</h6>
                <p>Change the module / submodule and press CHECK.</p>
            </div>
        );
    } else {
        body = (
            <div className="table-responsive usr-table-wrap">
                <table className="table table-clean usr-table">
                    <caption className="visually-hidden">Program rights for {scope?.usrusdsnoauto}</caption>
                    <thead>
                        <tr>
                            <th>#</th>
                            <th>Module / Submodule</th>
                            <th>Order</th>
                            <th>Program name</th>
                            <th>Description</th>
                            {flags.map((flag, index) => (
                                <ColumnCheck key={flag} flag={flag} index={index} rows={rows} onChange={(checked) => checkCol(checked, flag)} />
                            ))}
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
                                            id={`${flag}[${index}]`}
                                            name={`${flag}[${index}]`}
                                            disabled={!can('rights', 'amend') || !editable(row, flag)}
                                            checked={editable(row, flag) && row[flag] === 'y'}
                                            aria-label={`${labels[flagIndex]}: ${row.prgdes || row.prgnam}`}
                                            onChange={(e) => setFlag(index, flag, e.target.checked)}
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
            <div className="program-banner d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
                <div className="d-flex align-items-center gap-3">
                    <span className="program-banner-icon"><i className="bi bi-shield-lock"></i></span>
                    <div>
                        <div className="program-eyebrow">Program</div>
                        <h4 className="page-title">User Rights</h4>
                        <div className="page-sub">Assign program access to any user, regardless of their account role.</div>
                    </div>
                </div>
                <div className="d-flex flex-wrap align-items-center gap-2">
                    <Link to="/inqurgr" id="inquire-user-rights" className="btn btn-primary">
                        <i className="bi bi-search me-2" aria-hidden="true"></i>inquire User Rights-Given User
                    </Link>
                    <Link to="/inqurgr2" id="inquire-user-rights" className="btn btn-primary">
                        <i className="bi bi-search me-2" aria-hidden="true"></i>inquire User Rights-Given User2
                    </Link>
                </div>
            </div>

            <div id="notice" role="status" aria-live="polite">
                {notice ? (notice.error ? <AlertBox message={notice.text} /> : <div className="alert alert-success py-2">{notice.text}</div>) : null}
            </div>

            <form name="usrenter" id="usrenter" aria-busy={busy} onSubmit={(e) => void onSubmit(e)}>
                <fieldset id="usrenter-controls" disabled={busy}>
                    {/* Step 1: User & Scope filter */}
                    <section className="card-soft p-4 mb-4 program-records">
                        <div className="program-records-heading">
                            <h5>1. Select user and programs</h5>
                            <span>All modules or a selected module / submodule</span>
                        </div>
                        <div className="row g-3">
                            <div className="col-md-6">
                                <label htmlFor="usrusdsno" className="form-label">User code</label>
                                <Select id="usrusdsno" name="usrusdsno" required value={userId} onChange={(e) => onFilter(() => setUserId(e.target.value))()}>
                                    <option value="">Select a user...</option>
                                    {users.map((row) => (
                                        <option key={row.usdsno} value={String(row.usdsno)}>{row.usdusd} - {row.usdnam}</option>
                                    ))}
                                </Select>
                            </div>
                            <div className="col-md-6">
                                <label htmlFor="usdnam" className="form-label">User name</label>
                                <input className="form-control" id="usdnam" readOnly placeholder="Select a user" value={user?.usdnam ?? ''} />
                            </div>
                            <ScopePicker name="modopt" field="modsno" label="Module" rows={lookups.modules} option={modopt} value={modsno}
                                onOption={(v) => onFilter(() => setModopt(v))()} onValue={(v) => onFilter(() => setModsno(v))()} />
                            <ScopePicker name="smodopt" field="submodsno" label="Submodule" rows={lookups.submodules} option={smodopt} value={submodsno}
                                onOption={(v) => onFilter(() => setSmodopt(v))()} onValue={(v) => onFilter(() => setSubmodsno(v))()} />
                        </div>
                        <div className="d-flex flex-wrap justify-content-between gap-3 align-items-center mt-4">
                            <span className="text-muted small">Select CHECK after changing the user or scope.</span>
                            <button className="btn btn-primary" name="ok" type="submit"><i className="bi bi-search me-2"></i>CHECK</button>
                        </div>
                    </section>

                    {/* Step 2: Permission Matrix */}
                    <section className="card-soft p-3 program-records">
                        <div className="program-records-heading">
                            <h5>2. Assign program rights</h5>
                            <span id="usr-summary" aria-live="polite">{summary}</span>
                        </div>
                        <div id="usr-tools" className="d-flex flex-wrap gap-2 mb-3" hidden={rows.length === 0}>
                            <button type="button" className="btn btn-sm btn-outline-primary" name="check_all" onClick={() => checkAll(true)}>Check all</button>
                            <button type="button" className="btn btn-sm btn-outline-secondary" name="clear_all" onClick={() => checkAll(false)}>Clear all</button>
                            <span className="text-muted small align-self-center ms-md-auto">Single: View only · Multi: View / Add / Amend / Delete</span>
                        </div>
                        <div id="usr-program-note">
                            <div className="alert alert-info py-2 small">
                                {admin ? 'Administrator account: saved rights override default access. ' : 'User account: tick the programs and actions this user can access. '}
                                To let this user assign access to others, enable View and Amend on User Rights. Enable Delete only if they may clear assigned rights.
                            </div>
                        </div>
                        <div id="usr-matrix">{body}</div>

                        <div id="usr-actions" className="usr-actions mt-3 pt-3 d-flex flex-wrap justify-content-between align-items-center gap-3" hidden={rows.length === 0}>
                            <span id="usr-changes" className="text-muted small" aria-live="polite">
                                {rows.length ? (changed ? `${changed} program(s) with unsaved changes` : 'Saved rights loaded') : ''}
                            </span>
                            <div className="d-flex flex-wrap gap-2">
                                <button type="button" name="delete" className="btn btn-outline-danger" disabled={!can('rights', 'delete')} onClick={() => void save(true)}><i className="bi bi-trash me-1"></i>DELETE</button>
                                <button
                                    type="button"
                                    name="reset"
                                    className="btn btn-light"
                                    onClick={() => {
                                        putRows(saved.map((row) => ({ ...row })));
                                        setNotice(null);
                                    }}
                                >RESET</button>
                                <button type="button" name="save" className="btn btn-primary" disabled={!can('rights', 'amend')} onClick={() => void save(false)}><i className="bi bi-check2 me-1"></i>SAVE</button>
                            </div>
                        </div>
                    </section>
                </fieldset>
            </form>
        </>
    );
}
