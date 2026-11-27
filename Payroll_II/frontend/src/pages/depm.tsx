import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { request } from '../services/api.ts';
import { can } from '../services/auth.ts';
import { errMsg } from '../utils/ui.ts';
import { AlertBox, Loading, confirmModal } from '../components/ui.tsx';
import { useAlive } from '../App.tsx';

type DepartmentRow = {
    depsno: number;
    depdep: string;
    depdes: string | null;
    depucdnew: string | null;
    depentddt: string | null;
    depenttime: string | null;
    depucdame: string | null;
    depameddt: string | null;
    depametime: string | null;
};

// Shared API helper for department endpoints
const call = <T,>(path = '', method = 'GET', body?: unknown): Promise<T> => {
    return request<T>('/depm' + path, {
        method,
        ...(body ? { body: JSON.stringify(body) } : {}),
    });
};

// Add, edit, or view department form
function Editor({
    row,
    view,
    rows,
    busy,
    onSubmit,
    onCancel,
}: {
    row: DepartmentRow | null;
    view: boolean;
    rows: DepartmentRow[];
    busy: boolean;
    onSubmit: (body: Record<string, FormDataEntryValue>, formError: (m: string) => void) => void;
    onCancel: () => void;
}) {
    const cardRef = useRef<HTMLDivElement>(null);
    const [formError, setFormError] = useState('');
    const [code, setCode] = useState(row?.depdep ?? '');

    useEffect(() => {
        cardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, []);

    function submit(event: FormEvent<HTMLFormElement>): void {
        event.preventDefault();
        if (view || busy) {
            return;
        }

        const body = Object.fromEntries(new FormData(event.currentTarget));
        const normalizedCode = String(body.depdep ?? '').trim().toUpperCase();
        const desc = String(body.depdes ?? '').trim();

        if (!normalizedCode) {
            setFormError('Department code is required.');
            return;
        }

        if (!desc) {
            setFormError('Description is required.');
            return;
        }

        if (!row && rows.some((r) => r.depdep.trim().toUpperCase() === normalizedCode)) {
            setFormError('Record already exists.');
            return;
        }

        body.depdep = normalizedCode;
        body.depdes = desc;
        setFormError('');
        onSubmit(body, setFormError);
    }

    return (
        <div className="card-soft p-4 mb-4" ref={cardRef}>
            <h5>{view ? 'View Department' : row ? 'Edit Department' : 'Add Department'}</h5>
            <form id="depm-form" onSubmit={submit}>
                <fieldset disabled={view}>
                    <div className="row g-3">
                        <div className="col-md-4">
                            <label className="form-label" htmlFor="depdep">Department Code</label>
                            <input
                                className="form-control"
                                id="depdep"
                                name="depdep"
                                type="text"
                                maxLength={6}
                                value={code}
                                onChange={(e) => setCode(e.target.value.toUpperCase())}
                                style={{ textTransform: 'uppercase' }}
                                required
                                readOnly={!!row}
                            />
                            {row ? <div className="form-text">Department code stays fixed when editing.</div> : null}
                        </div>
                        <div className="col-md-8">
                            <label className="form-label" htmlFor="depdes">Description</label>
                            <input
                                className="form-control"
                                id="depdes"
                                name="depdes"
                                type="text"
                                maxLength={30}
                                defaultValue={row?.depdes ?? ''}
                                required
                            />
                        </div>
                    </div>
                </fieldset>

                {formError ? (
                    <div className="mt-3">
                        <AlertBox message={formError} />
                    </div>
                ) : null}

                <div className="d-flex justify-content-end gap-2 mt-4">
                    <button type="button" className="btn btn-light" onClick={onCancel}>
                        {view ? 'Close' : 'Cancel'}
                    </button>
                    {!view ? (
                        <button type="submit" className="btn btn-primary" disabled={busy}>
                            {busy ? 'Saving...' : row ? 'Update' : 'Save'}
                        </button>
                    ) : null}
                </div>
            </form>
        </div>
    );
}

// Render Department Master page
export default function Depm() {
    const alive = useAlive();
    const [rows, setRows] = useState<DepartmentRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');
    const [search, setSearch] = useState('');
    const [mode, setMode] = useState<'add' | 'edit' | 'view' | null>(null);
    const [activeRow, setActiveRow] = useState<DepartmentRow | null>(null);
    const [busy, setBusy] = useState(false);

    async function load(): Promise<void> {
        setLoading(true);
        setError('');
        try {
            const list = await call<DepartmentRow[]>();
            if (!alive()) return;
            setRows(list);
        } catch (e) {
            if (!alive()) return;
            setError(errMsg(e));
        } finally {
            if (alive()) {
                setLoading(false);
            }
        }
    }

    useEffect(() => {
        void load();
    }, []);

    function openAdd(): void {
        if (!can('depm', 'add')) return;
        setNotice('');
        setError('');
        setActiveRow(null);
        setMode('add');
    }

    function openRow(row: DepartmentRow, nextMode: 'edit' | 'view'): void {
        if (!can('depm', nextMode === 'edit' ? 'amend' : 'view')) return;
        setNotice('');
        setError('');
        setActiveRow(row);
        setMode(nextMode);
    }

    async function handleSave(body: Record<string, FormDataEntryValue>, setFormError: (m: string) => void): Promise<void> {
        if (!can('depm', activeRow ? 'amend' : 'add')) return;
        setBusy(true);
        setNotice('');
        try {
            if (activeRow) {
                await call(`/${activeRow.depsno}`, 'PUT', body);
                if (!alive()) return;
                setNotice('Department updated.');
            } else {
                await call('', 'POST', body);
                if (!alive()) return;
                setNotice('Department created.');
            }
            setMode(null);
            setActiveRow(null);
            await load();
        } catch (e) {
            if (!alive()) return;
            setFormError(errMsg(e));
        } finally {
            if (alive()) {
                setBusy(false);
            }
        }
    }

    async function handleDelete(row: DepartmentRow): Promise<void> {
        if (!can('depm', 'delete')) return;
        const ok = await confirmModal({
            title: 'Delete Department',
            message: `Delete department ${row.depdep}${row.depdes ? ` (${row.depdes})` : ''}?`,
            confirmText: 'Delete',
        });
        if (!ok) return;

        setBusy(true);
        setNotice('');
        setError('');
        try {
            await call(`/${row.depsno}`, 'DELETE');
            if (!alive()) return;
            if (activeRow?.depsno === row.depsno) {
                setMode(null);
                setActiveRow(null);
            }
            setNotice('Department deleted.');
            await load();
        } catch (e) {
            if (!alive()) return;
            setError(errMsg(e));
        } finally {
            if (alive()) {
                setBusy(false);
            }
        }
    }

    const q = search.trim().toLowerCase();
    const filtered = q
        ? rows.filter(
              (r) =>
                  r.depdep.toLowerCase().includes(q) ||
                  (r.depdes ?? '').toLowerCase().includes(q)
          )
        : rows;

    return (
        <div className="fade-in">
            <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-3">
                <div>
                    <h4 className="page-title">Department Master</h4>
                    <div className="page-sub">Manage department codes and descriptions</div>
                </div>
                <div className="d-flex gap-2">
                    {can('depm', 'add') ? <button type="button" className="btn btn-primary" onClick={openAdd}>
                        <i className="bi bi-plus-lg me-1"></i>Add Department
                    </button> : null}
                </div>
            </div>

            {error ? <AlertBox message={error} /> : null}
            {notice ? <div className="alert alert-success py-2">{notice}</div> : null}

            {mode ? (
                <Editor
                    key={activeRow ? `${mode}-${activeRow.depsno}` : 'add'}
                    row={activeRow}
                    view={mode === 'view' || !can('depm', activeRow ? 'amend' : 'add')}
                    rows={rows}
                    busy={busy}
                    onSubmit={handleSave}
                    onCancel={() => {
                        setMode(null);
                        setActiveRow(null);
                    }}
                />
            ) : null}

            <div className="card-soft">
                <div className="card-head d-flex flex-wrap justify-content-between align-items-center gap-2">
                    <span>
                        <i className="bi bi-diagram-3 me-2"></i>Departments ({filtered.length})
                    </span>
                    <input
                        type="search"
                        className="form-control form-control-sm"
                        style={{ maxWidth: '240px' }}
                        placeholder="Search code or description..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
                <div className="table-responsive">
                    {loading ? (
                        <div className="p-4"><Loading /></div>
                    ) : filtered.length === 0 ? (
                        <div className="p-4 text-center text-muted">No departments found.</div>
                    ) : (
                        <table className="table table-hover table-clean align-middle mb-0">
                            <thead>
                                <tr>
                                    <th>Code</th>
                                    <th>Description</th>
                                    <th>Created By</th>
                                    <th>Created Date</th>
                                    <th className="text-end">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map((r) => (
                                    <tr key={r.depsno}>
                                        <td className="fw-semibold">{r.depdep}</td>
                                        <td>{r.depdes || '-'}</td>
                                        <td>{r.depucdnew || '-'}</td>
                                        <td>{r.depentddt || '-'}</td>
                                        <td className="text-end">
                                            <div className="btn-group btn-group-sm">
                                                <button
                                                    type="button"
                                                    className="btn btn-light"
                                                    title="View"
                                                    onClick={() => openRow(r, 'view')}
                                                >
                                                    <i className="bi bi-eye"></i>
                                                </button>
                                                <button
                                                    type="button"
                                                    className="btn btn-light"
                                                    title="Edit"
                                                    hidden={!can('depm', 'amend')}
                                                    onClick={() => openRow(r, 'edit')}
                                                >
                                                    <i className="bi bi-pencil"></i>
                                                </button>
                                                <button
                                                    type="button"
                                                    className="btn btn-light text-danger"
                                                    title="Delete"
                                                    hidden={!can('depm', 'delete')}
                                                    disabled={busy}
                                                    onClick={() => void handleDelete(r)}
                                                >
                                                    <i className="bi bi-trash"></i>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    );
}
