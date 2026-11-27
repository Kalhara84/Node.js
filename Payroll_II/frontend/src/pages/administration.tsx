import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { request } from '../services/api.ts';
import { can, currentUser } from '../services/auth.ts';
import { errMsg } from '../utils/ui.ts';
import { AlertBox, Loading, confirmModal } from '../components/ui.tsx';
import Select from '../components/Select.tsx';
import { useAlive } from '../App.tsx';

type Row = Record<string, string | number | boolean | null>;
type Lookups = { modules: Row[]; submodules: Row[]; locations: Row[] };

const flags = ['usryn', 'usraddyn', 'usrameyn', 'usrdelyn'];
const flagLabels = ['View', 'Add', 'Amend', 'Delete'];

// API helper for administration endpoints
const call = <T,>(path: string, method = 'GET', body?: unknown) =>
    request<T>('/administration' + path, {
        method,
        ...(body ? { body: JSON.stringify(body) } : {})
    });

// User form fields config: [database_field, label, max_length]
const userFields: [string, string, number][] = [
    ['usdusd', 'User code', 8],
    ['usdnam', 'Full name', 50],
    ['usduno', 'User number', 3],
    ['usdad1', 'Address line 1', 50],
    ['usdad2', 'Address line 2', 50],
    ['usdad3', 'Address line 3', 50],
    ['usdtel', 'Telephone', 25],
    ['usdfax', 'Fax', 25],
    ['usdmail', 'Email', 25],
    ['usdnic', 'NIC number', 10],
    ['usddes', 'Designation', 25]
];

// Cell text (empty for null)
const t = (v: unknown): string => String(v ?? '');

// Generate dropdown <option> tags
function Options({ rows, value, label, first = 'Select…' }: { rows: Row[]; value: string; label: string; first?: string }) {
    return (
        <>
            <option value="">{first}</option>
            {rows.map((r) => (
                <option key={t(r[value])} value={t(r[value])}>{t(r[label])}</option>
            ))}
        </>
    );
}

// Default dropdown value (the old code selected the option matching the stored value)
const sel = (v: unknown): string => (v === null || v === undefined ? '' : String(v));

// <input> field of the add/edit form
function Input({ name, label, value, max, required = false, type = 'text', readOnly = false }: {
    name: string;
    label: string;
    value: unknown;
    max: number;
    required?: boolean;
    type?: string;
    readOnly?: boolean;
}) {
    return (
        <div className="col-md-6">
            <label className="form-label" htmlFor={name}>{label}</label>
            <input
                className="form-control"
                id={name}
                name={name}
                type={type}
                maxLength={max}
                defaultValue={t(value)}
                required={required}
                readOnly={readOnly}
                autoComplete={type === 'password' ? 'new-password' : undefined}
            />
        </div>
    );
}

// Open add/edit record form
function Editor({ row, users, mode, lookups, onLookups, onSaved, onCancel, notice }: {
    row: Row | null;
    users: boolean;
    mode: string;
    lookups: Lookups;
    onLookups: (l: Lookups) => void;
    onSaved: (rows: Row[]) => void;
    onCancel: () => void;
    notice: (text: string, error?: boolean) => void;
}) {
    const alive = useAlive();
    const cardRef = useRef<HTMLDivElement>(null);
    const [saving, setSaving] = useState(false);
    const [lookupBusy, setLookupBusy] = useState(false);
    const [formError, setFormError] = useState('');
    const r: Row = row ?? {};

    useEffect(() => {
        cardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, []);

    async function onSubmit(e: FormEvent<HTMLFormElement>): Promise<void> {
        e.preventDefault();
        const form = e.currentTarget;
        const body = Object.fromEntries(new FormData(form));
        setSaving(true);

        try {
            await call(`/${mode}${row ? '/' + row[users ? 'usdsno' : 'prgsno'] : ''}`, row ? 'PUT' : 'POST', body);
            const fresh = await call<Row[]>('/' + mode);
            if (!alive()) {
                return;
            }
            onSaved(fresh);
        } catch (err) {
            if (alive()) {
                setFormError(errMsg(err));
            }
        } finally {
            setSaving(false);
        }
    }

    async function onLookupSubmit(e: FormEvent<HTMLFormElement>): Promise<void> {
        e.preventDefault();
        const form = e.currentTarget;
        setLookupBusy(true);

        try {
            await call('/lookups', 'POST', Object.fromEntries(new FormData(form)));
            const fresh = await call<Lookups>('/lookups');
            if (!alive()) {
                return;
            }
            onLookups(fresh);
            form.reset();
            notice('Lookup added.');
        } catch (err) {
            notice(errMsg(err), true);
        } finally {
            setLookupBusy(false);
        }
    }

    return (
        <div className="card-soft p-4 mb-4 admin-editor" ref={cardRef}>
            <div className="admin-records-heading">
                <h5>{row ? 'Edit' : 'Add'} {users ? 'user' : 'program'} {row ? t(users ? r.usdusd : r.prgsno) : ''}</h5>
                <span>{users ? 'Profile, contact details and sign-in settings' : 'Module, display order and program details'}</span>
            </div>
            <form id="form" onSubmit={(e) => void onSubmit(e)}>
                <div className="row g-3">
                    {users ? (
                        <>
                            {userFields.map(([k, l, max]) => (
                                <Input key={k} name={k} label={l} value={r[k]} max={max} required={k === 'usdusd'} type={k === 'usdmail' ? 'email' : 'text'} readOnly={k === 'usdusd' && !!row} />
                            ))}
                            <Input name="usdpwd" label={row ? 'New password (leave blank to keep current)' : 'Password'} value="" max={256} required={!row} type="password" />
                            <div className="col-md-6">
                                <label className="form-label" htmlFor="usdcomsno">Location</label>
                                <Select id="usdcomsno" name="usdcomsno" defaultValue={sel(r.usdcomsno)}>
                                    <Options rows={lookups.locations} value="locsno" label="locnam" first="No location" />
                                </Select>
                            </div>
                            <div className="col-md-6">
                                <label className="form-label" htmlFor="usdactive">Status</label>
                                <Select id="usdactive" name="usdactive" defaultValue={r.usdactive === 'N' ? 'N' : 'Y'}>
                                    <option value="Y">Active</option>
                                    <option value="N">Inactive</option>
                                </Select>
                            </div>
                            {currentUser()?.access?.admin ? (
                                <div className="col-md-6">
                                    <label className="form-label" htmlFor="usdadmin">Role</label>
                                    <Select id="usdadmin" name="usdadmin" defaultValue={r.usdadmin === true ? 'true' : 'false'}>
                                        <option value="false">User</option>
                                        <option value="true">Administrator</option>
                                    </Select>
                                </div>
                            ) : null}
                        </>
                    ) : (
                        <>
                            <div className="col-md-6">
                                <label className="form-label" htmlFor="prgmodsno">Module</label>
                                <Select id="prgmodsno" name="prgmodsno" required defaultValue={sel(r.prgmodsno)}>
                                    <Options rows={lookups.modules} value="syssno" label="sysdes" />
                                </Select>
                            </div>
                            <div className="col-md-6">
                                <label className="form-label" htmlFor="prgsmdsno">Submodule</label>
                                <Select id="prgsmdsno" name="prgsmdsno" required defaultValue={sel(r.prgsmdsno)}>
                                    <Options rows={lookups.submodules} value="syssno" label="sysdes" />
                                </Select>
                            </div>
                            <Input name="prgorder" label="Order" value={r.prgorder} max={5} required />
                            <div className="col-md-6">
                                <label className="form-label" htmlFor="prglvl">Permissions</label>
                                <Select id="prglvl" name="prglvl" defaultValue={r.prglvl === 'S' ? 'S' : 'M'}>
                                    <option value="S">View only</option>
                                    <option value="M">View, Add, Amend and Delete</option>
                                </Select>
                            </div>
                            <Input name="prgnam" label="Program key (example: attendance)" value={r.prgnam} max={35} required />
                            <Input name="prgdes" label="Description" value={r.prgdes} max={60} required />
                        </>
                    )}
                </div>
                <div id="form-error" className="mt-3" role="alert">{formError ? <AlertBox message={formError} /> : null}</div>
                <div className="d-flex gap-2 mt-3">
                    <button className="btn btn-primary" type="submit" disabled={saving}>Save</button>
                    <button className="btn btn-light" type="button" id="cancel" onClick={onCancel}>Cancel</button>
                </div>
            </form>
            {!users ? (
                <details className="mt-3">
                    <summary>Add a module or submodule</summary>
                    <form id="lookup-form" className="row g-2 mt-2" onSubmit={(e) => void onLookupSubmit(e)}>
                        <div className="col-md-3"><Select name="sysrtp" aria-label="Type"><option value="32">Module</option><option value="33">Submodule</option></Select></div>
                        <div className="col-md-3"><input name="sysrno" className="form-control" placeholder="Code" aria-label="Code" maxLength={10} required /></div>
                        <div className="col-md-4"><input name="sysdes" className="form-control" placeholder="Description" aria-label="Description" maxLength={40} required /></div>
                        <div className="col-md-2"><button className="btn btn-outline-primary" disabled={lookupBusy}>Add</button></div>
                    </form>
                </details>
            ) : null}
        </div>
    );
}

// Render administration page (Programs, Users, Rights)
export default function Administration() {
    const alive = useAlive();
    const mode = useRef(location.pathname.split('/').pop()!).current;
    const rights = mode === 'rights';
    const users = mode === 'users';
    const title = rights ? 'User Rights' : users ? 'User Master' : 'Program Master';

    const [phase, setPhase] = useState<'loading' | 'error' | 'ready'>('loading');
    const [loadError, setLoadError] = useState('');
    const [rows, setRows] = useState<Row[]>([]);
    const [userList, setUserList] = useState<Row[]>([]);
    const [lookups, setLookups] = useState<Lookups>({ modules: [], submodules: [], locations: [] });
    const [editor, setEditor] = useState<{ row: Row | null; n: number } | null>(null);
    const [selectedUser, setSelectedUser] = useState('');
    const [search, setSearch] = useState('');
    const [moduleFilter, setModuleFilter] = useState('');
    const [submoduleFilter, setSubmoduleFilter] = useState('');
    const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);
    const [pending, setPending] = useState('');
    const version = useRef(0);
    const selectedUserRef = useRef('');

    useEffect(() => {
        let cancelled = false;

        void (async () => {
            try {
                const result = await Promise.all([
                    call<Lookups>('/lookups'),
                    call<Row[]>(users || rights ? '/users' : '/programs')
                ]);
                if (cancelled) {
                    return;
                }
                setLookups(result[0]);
                setUserList(result[1]);
                setRows(rights ? [] : result[1]);
                setPhase('ready');
            } catch (e) {
                if (!cancelled) {
                    setLoadError(errMsg(e));
                    setPhase('error');
                }
            }
        })();

        return () => {
            cancelled = true;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const notice = (text: string, error = false): void => {
        setMessage({ text, error });
    };

    if (phase === 'loading') {
        return <Loading />;
    }

    if (phase === 'error') {
        return <AlertBox message={loadError} />;
    }

    // Filter visible rows based on search and selected modules
    function visible(): Row[] {
        const needle = search.toLowerCase();
        const module = users ? '' : moduleFilter;
        const submodule = users ? '' : submoduleFilter;

        return rows.filter((r) => {
            const matchesModule = !module || String(r.prgmodsno) === module;
            const matchesSubmodule = !submodule || String(r.prgsmdsno) === submodule;
            const matchesSearch = Object.values(r).some((v) => String(v ?? '').toLowerCase().includes(needle));
            return matchesModule && matchesSubmodule && matchesSearch;
        });
    }

    const shown = visible();
    const list = rights && !selectedUser ? [] : shown;

    // Rights: which rows a column / bulk change applies to
    const columnRows = (column: string): Row[] =>
        list.filter((r) => (column === 'usryn' ? r.prglvl === 'S' || r.prglvl === 'M' : r.prglvl === 'M'));

    function setRowFlags(target: Row[], change: (r: Row) => Row): void {
        setRows((prev) => prev.map((r) => (target.includes(r) ? change(r) : r)));
    }

    // Checkbox column header (select all shown)
    function onColumn(column: string, checked: boolean): void {
        setRowFlags(shown.filter((r) => (column === 'usryn' ? r.prglvl === 'S' || r.prglvl === 'M' : r.prglvl === 'M')), (r) => ({
            ...r,
            [column]: checked ? 'y' : 'n'
        }));
    }

    // Single permission checkbox
    function onFlag(id: unknown, flag: string, checked: boolean): void {
        setRows((prev) => prev.map((r) => (String(r.prgsno) === String(id) ? { ...r, [flag]: checked ? 'y' : 'n' } : r)));
    }

    // Select all shown / Clear shown
    function onBulk(value: string): void {
        setRowFlags(shown, (r) => {
            const next = { ...r };
            flags.forEach((f, i) => {
                if (r.prglvl === 'M' || (i === 0 && r.prglvl === 'S')) {
                    next[f] = value;
                }
            });
            return next;
        });
    }

    // Rights: choose a user and load the program rights
    async function onUser(value: string): Promise<void> {
        const current = ++version.current;
        selectedUserRef.current = value;
        setSelectedUser(value);
        setRows([]);
        if (!value) {
            return;
        }

        try {
            const data = await call<Row[]>('/rights/' + value);
            if (alive() && current === version.current) {
                setRows(data);
            }
        } catch (err) {
            if (alive() && current === version.current) {
                notice(errMsg(err), true);
            }
        }
    }

    // Delete a program
    async function onDelete(id: unknown): Promise<void> {
        const key = 'delete-' + t(id);
        try {
            const confirmed = await confirmModal({
                title: 'Delete program?',
                message: 'This removes the program and its assigned user rights.'
            });
            if (!confirmed) {
                return;
            }
            setPending(key);

            await call('/programs/' + id, 'DELETE');
            const fresh = await call<Row[]>('/programs');
            if (alive()) {
                setRows(fresh);
                notice('Program deleted.');
            }
        } catch (err) {
            if (alive()) {
                notice(errMsg(err), true);
            }
        } finally {
            setPending('');
        }
    }

    // Save or delete the shown rights
    async function onSaveRights(clear: boolean): Promise<void> {
        const key = clear ? 'delete-rights' : 'save-rights';
        try {
            const user = selectedUser;
            const selected = shown.map((r) => ({
                prgsno: r.prgsno,
                ...Object.fromEntries(flags.map((f) => [f, r[f] === 'y' ? 'y' : 'n']))
            }));

            if (clear) {
                const confirmed = await confirmModal({
                    title: 'Delete shown rights?',
                    message: `Remove rights for these ${selected.length} programs? Other programs remain unchanged.`
                });
                if (!confirmed) {
                    return;
                }
            }

            setPending(key);
            await call('/rights/' + user, 'PUT', { rows: selected, clear });
            if (alive() && selectedUserRef.current === user) {
                const fresh = await call<Row[]>('/rights/' + user);
                setRows(fresh);
                notice('User rights saved.');
            }
        } catch (err) {
            if (alive()) {
                notice(errMsg(err), true);
            }
        } finally {
            setPending('');
        }
    }

    const headers = users
        ? ['Code', 'Name', 'Location', 'Telephone', 'Email', 'Role', 'Status', 'Actions']
        : rights
            ? ['Program', 'Module / submodule', ...flagLabels]
            : ['Code', 'Name / description', 'Module', 'Submodule', 'Order', 'Level', 'Actions'];

    return (
        <>
            <div className="admin-banner d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
                <div className="d-flex align-items-center gap-3">
                    <span className="admin-banner-icon"><i className={`bi ${rights ? 'bi-shield-lock' : users ? 'bi-people' : 'bi-grid'}`} aria-hidden="true"></i></span>
                    <div>
                        <div className="admin-eyebrow">Administration</div>
                        <h4 className="page-title">{title}</h4>
                        <div className="page-sub">{rights ? 'Manage access by user, module and program' : users ? 'Manage user profiles and sign-in details' : 'Register app pages here, then assign each user View, Add, Amend and Delete rights in User Rights'}</div>
                    </div>
                </div>
                {rights ? (
                    <span className="admin-banner-note">Choose a user to manage permissions</span>
                ) : can(users ? 'users' : 'programs', 'add') ? (
                    <button id="add" className="btn btn-primary" onClick={() => setEditor((prev) => ({ row: null, n: (prev?.n ?? 0) + 1 }))}>
                        <i className="bi bi-plus-lg me-1"></i>Add {users ? 'user' : 'program'}
                    </button>
                ) : null}
            </div>

            <div id="notice" role="status" aria-live="polite">
                {message ? (message.error ? <AlertBox message={message.text} /> : <div className="alert alert-success">{message.text}</div>) : null}
            </div>
            <div id="editor">
                {editor ? (
                    <Editor
                        key={editor.n}
                        row={editor.row}
                        users={users}
                        mode={mode}
                        lookups={lookups}
                        onLookups={setLookups}
                        notice={notice}
                        onCancel={() => setEditor(null)}
                        onSaved={(fresh) => {
                            setRows(fresh);
                            setEditor(null);
                            notice('Record saved.');
                        }}
                    />
                ) : null}
            </div>

            <div className="card-soft fade-in p-3 admin-records">
                <div className="admin-records-heading">
                    <h5>{rights ? 'Permission matrix' : users ? 'User directory' : 'Program directory'}</h5>
                    <span>{rights ? 'Changes apply to the programs shown below' : 'Search records or select Edit to make changes'}</span>
                </div>

                <div id="filters" className="row g-3 mb-3">
                    {rights ? (
                        <div className="col-md-6">
                            <label className="form-label" htmlFor="user">User</label>
                            <Select id="user" name="user" required value={selectedUser} onChange={(e) => void onUser(e.target.value)}>
                                <Options rows={userList} value="usdsno" label="usdusd" first="Select a user" />
                            </Select>
                        </div>
                    ) : null}
                    {!users ? (
                        <>
                            <div className="col-md-6">
                                <label className="form-label" htmlFor="module">Module</label>
                                <Select id="module" name="module" value={moduleFilter} onChange={(e) => setModuleFilter(e.target.value)}>
                                    <Options rows={lookups.modules} value="syssno" label="sysdes" first="All modules" />
                                </Select>
                            </div>
                            <div className="col-md-6">
                                <label className="form-label" htmlFor="submodule">Submodule</label>
                                <Select id="submodule" name="submodule" value={submoduleFilter} onChange={(e) => setSubmoduleFilter(e.target.value)}>
                                    <Options rows={lookups.submodules} value="syssno" label="sysdes" first="All submodules" />
                                </Select>
                            </div>
                        </>
                    ) : null}
                    <div className="col-md-6">
                        <label htmlFor="search" className="form-label">Search</label>
                        <input id="search" className="form-control" placeholder={`Search ${users ? 'users' : 'programs'}`} value={search} onChange={(e) => setSearch(e.target.value)} />
                    </div>
                </div>

                <div id="tools" className="d-flex flex-wrap gap-2 mb-3">
                    {rights ? (
                        <>
                            <button className="btn btn-outline-primary" disabled={!selectedUser || pending !== ''} onClick={() => onBulk('y')}>Select all shown</button>
                            <button className="btn btn-outline-secondary" disabled={!selectedUser || pending !== ''} onClick={() => onBulk('n')}>Clear shown</button>
                            <button className="btn btn-primary" id="save-rights" disabled={!list.length || pending === 'save-rights'} onClick={() => void onSaveRights(false)}>Save shown rights</button>
                            <button className="btn btn-outline-danger" id="delete-rights" disabled={!list.length || pending === 'delete-rights'} onClick={() => void onSaveRights(true)}>Delete shown rights</button>
                        </>
                    ) : null}
                </div>
                <div className="table-responsive">
                    <table className="table table-clean">
                        <thead id="head">
                            <tr>
                                {headers.map((h, i) => {
                                    if (!(rights && i > 1)) {
                                        return <th key={h}>{h}</th>;
                                    }
                                    const column = flags[i - 2];
                                    const applicable = columnRows(column);
                                    return (
                                        <th key={h}>
                                            <label className="d-flex align-items-center gap-2">
                                                <input
                                                    className="form-check-input"
                                                    type="checkbox"
                                                    aria-label={`Select all shown ${h} permissions`}
                                                    checked={!!(list.length && applicable.length && applicable.every((r) => r[column] === 'y'))}
                                                    onChange={(e) => onColumn(column, e.target.checked)}
                                                />
                                                {h}
                                            </label>
                                        </th>
                                    );
                                })}
                            </tr>
                        </thead>
                        <tbody id="rows">
                            {list.length ? list.map((r, index) => {
                                if (users) {
                                    const locationName = lookups.locations.find((l) => String(l.locsno) === String(r.usdcomsno))?.locnam || '—';
                                    return (
                                        <tr key={t(r.usdsno) || index}>
                                            <td>{t(r.usdusd)}</td>
                                            <td>{t(r.usdnam)}</td>
                                            <td>{t(locationName)}</td>
                                            <td>{t(r.usdtel)}</td>
                                            <td>{t(r.usdmail)}</td>
                                            <td>{r.usdadmin ? 'Administrator' : 'User'}</td>
                                            <td><span className={`badge ${r.usdactive === 'Y' ? 'bg-success' : 'bg-secondary'}`}>{r.usdactive === 'Y' ? 'Active' : 'Inactive'}</span></td>
                                            <td>{can('users', 'amend') ? <button className="btn btn-sm btn-outline-primary" onClick={() => setEditor((prev) => ({ row: r, n: (prev?.n ?? 0) + 1 }))}>Edit</button> : null}</td>
                                        </tr>
                                    );
                                }
                                if (rights) {
                                    return (
                                        <tr key={t(r.prgsno) || index}>
                                            <td>{t(r.prgdes)}<div className="small text-muted">{t(r.prgnam)} · {r.prglvl === 'M' ? 'Multi' : 'Single'}</div></td>
                                            <td>{t(r.module)} / {t(r.submodule)}</td>
                                            {flags.map((f, i) => (
                                                <td key={f}>
                                                    <input
                                                        type="checkbox"
                                                        className="form-check-input"
                                                        aria-label={`${flagLabels[i]} ${t(r.prgdes)}`}
                                                        checked={r[f] === 'y'}
                                                        disabled={r.prglvl === 'S' && i > 0}
                                                        onChange={(e) => onFlag(r.prgsno, f, e.target.checked)}
                                                    />
                                                </td>
                                            ))}
                                        </tr>
                                    );
                                }
                                return (
                                    <tr key={t(r.prgsno) || index}>
                                        <td>{r.prgsno}</td>
                                        <td>{t(r.prgnam)}<div className="small text-muted">{t(r.prgdes)}</div></td>
                                        <td>{t(r.module)}</td>
                                        <td>{t(r.submodule)}</td>
                                        <td>{t(r.prgorder)}</td>
                                        <td>{r.prglvl === 'M' ? 'Multi' : 'Single'}</td>
                                        <td className="text-nowrap">
                                            {can('programs', 'amend') ? <button className="btn btn-sm btn-outline-primary" onClick={() => setEditor((prev) => ({ row: r, n: (prev?.n ?? 0) + 1 }))}>Edit</button> : null}
                                            {' '}
                                            {can('programs', 'delete') ? <button className="btn btn-sm btn-outline-danger" disabled={pending === 'delete-' + t(r.prgsno)} onClick={() => void onDelete(r.prgsno)}>Delete</button> : null}
                                        </td>
                                    </tr>
                                );
                            }) : (
                                <tr><td colSpan={users ? 8 : 7} className="text-center py-5 text-muted">{rights && !selectedUser ? 'Select a user to load program rights.' : 'No records found.'}</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
                <div id="count" className="text-muted small">{list.length} records</div>
            </div>
        </>
    );
}
