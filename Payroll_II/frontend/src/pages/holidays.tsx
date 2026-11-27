import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { request } from '../services/api.ts';
import { can } from '../services/auth.ts';
import { errMsg } from '../utils/ui.ts';
import { AlertBox, Loading, confirmModal } from '../components/ui.tsx';
import Select from '../components/Select.tsx';
import { useAlive } from '../App.tsx';
import { useNavigate } from 'react-router-dom';

type Holiday = {
    holsno: number;
    holddt: string;
    holtypsno: number;
    holotrate: number;
    sysdes: string | null;
    holucdnew: string;
    holentddt: string | null;
    holenttime: string;
    holucdame: string;
    holameddt: string | null;
    holametime: string;
};

type HolidayType = {
    syssno: number;
    sysdes: string;
};

// Shared API helper for holiday endpoints
const call = <T,>(path = '', method = 'GET', body?: unknown): Promise<T> => {
    return request<T>('/holidays' + path, {
        method,
        ...(body ? { body: JSON.stringify(body) } : {}),
    });
};

// Add, edit, or view holiday form
function Editor({ row, view, rows, types, busy, onSubmit, onCancel }: {
    row: Holiday | null;
    view: boolean;
    rows: Holiday[];
    types: HolidayType[];
    busy: boolean;
    onSubmit: (body: Record<string, FormDataEntryValue>, formError: (m: string) => void) => void;
    onCancel: () => void;
}) {
    const cardRef = useRef<HTMLDivElement>(null);
    const [formError, setFormError] = useState('');
    const today = new Date();
    const date =
        row?.holddt ??
        `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    useEffect(() => {
        cardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, []);

    function submit(event: FormEvent<HTMLFormElement>): void {
        event.preventDefault();
        if (view || busy) {
            return;
        }

        const body = Object.fromEntries(new FormData(event.currentTarget));

        if (!row && rows.some((r) => r.holddt === body.holddt)) {
            setFormError('A holiday already exists for this date.');
            return;
        }

        setFormError('');
        onSubmit(body, setFormError);
    }

    return (
        <div className="card-soft p-4 mb-4" ref={cardRef}>
            <h5>{view ? 'View holiday' : row ? 'Edit holiday' : 'Add holiday'}</h5>
            <form id="holiday-form" onSubmit={submit}>
                <fieldset disabled={view}>
                    <div className="row g-3">
                        <div className="col-md-4">
                            <label className="form-label" htmlFor="holddt">Date</label>
                            <input className="form-control" id="holddt" name="holddt" type="date" defaultValue={date} min="1900-01-01" max="9999-12-31" required readOnly={!!row} />
                            {row ? <div className="form-text">The holiday date stays fixed when editing.</div> : null}
                        </div>
                        <div className="col-md-4">
                            <label className="form-label" htmlFor="holtypsno">Holiday type</label>
                            <Select id="holtypsno" name="holtypsno" required defaultValue={row ? String(row.holtypsno) : ''}>
                                <option value="">Select holiday type</option>
                                {row && !types.some((t) => t.syssno === row.holtypsno) ? (
                                    <option value={row.holtypsno} disabled>Unknown type ({row.holtypsno}) — choose a valid type</option>
                                ) : null}
                                {types.map((t) => (
                                    <option key={t.syssno} value={t.syssno}>{t.sysdes}</option>
                                ))}
                            </Select>
                        </div>
                        <div className="col-md-4">
                            <label className="form-label" htmlFor="holotrate">OT rate</label>
                            <input className="form-control" id="holotrate" name="holotrate" type="number" min="0" max="9999.99" step="any" defaultValue={String(row?.holotrate ?? '')} placeholder="e.g. 1.5 or 2.0" required />
                            <div className="form-text">Overtime multiplier, for example 1.5 or 2.0.</div>
                        </div>
                    </div>
                </fieldset>
                {row ? (
                    <div className="small text-muted mt-3">
                        Entered by {row.holucdnew || '—'} · {row.holentddt ?? ''} {row.holenttime ?? ''}
                        {row.holucdame ? <><br />Updated by {row.holucdame} · {row.holameddt ?? ''} {row.holametime ?? ''}</> : null}
                    </div>
                ) : null}
                <div id="form-error" className="mt-3" role="alert">{formError ? <AlertBox message={formError} /> : null}</div>
                <div className="d-flex gap-2 mt-3">
                    {view ? null : (
                        <>
                            <button className="btn btn-primary" type="submit" disabled={busy}>Save holiday</button>
                            <button className="btn btn-outline-secondary" type="reset" disabled={busy}>Reset</button>
                        </>
                    )}
                    <button className="btn btn-light" id="cancel" type="button" disabled={busy} onClick={onCancel}>{view ? 'Close' : 'Cancel'}</button>
                </div>
            </form>
        </div>
    );
}

// Render holiday master management page
export default function Holidays() {
    const navigate = useNavigate();
    const alive = useAlive();
    const [rows, setRows] = useState<Holiday[]>([]);
    const [types, setTypes] = useState<HolidayType[]>([]);
    const [ready, setReady] = useState(false);
    const [loadError, setLoadError] = useState('');
    const [busy, setBusyState] = useState(false);
    const busyRef = useRef(false);
    const [search, setSearch] = useState('');
    const [year, setYear] = useState('');
    const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);
    const [editor, setEditor] = useState<{ row: Holiday | null; view: boolean; n: number } | null>(null);

    const setBusy = (value: boolean): void => {
        busyRef.current = value;
        setBusyState(value);
    };

    useEffect(() => {
        let cancelled = false;
        Promise.all([
            call<Holiday[]>(),
            call<HolidayType[]>('/types'),
        ]).then(
            ([r, t]) => {
                if (!cancelled) {
                    setRows(r);
                    setTypes(t);
                    setReady(true);
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

    if (!ready) {
        return <Loading text="Loading holidays..." />;
    }

    // Show status or error banner
    function notice(text: string, error = false): void {
        if (alive()) {
            setMessage({ text, error });
        }
    }

    // Year filter options from loaded holidays
    const years = [...new Set(rows.map((r) => r.holddt?.slice(0, 4)).filter(Boolean))]
        .sort()
        .reverse() as string[];
    const selectedYear = years.includes(year) ? year : '';

    // Filter holiday rows
    const needle = search.toLowerCase().trim();
    const list = rows.filter(
        (r) =>
            (!selectedYear || r.holddt?.startsWith(selectedYear)) &&
            `${r.holddt ?? ''} ${r.sysdes ?? ''}`.toLowerCase().includes(needle)
    );

    // Reload holidays from backend
    async function refresh(): Promise<void> {
        const data = await call<Holiday[]>();
        if (alive()) {
            setRows(data);
        }
    }

    // Save the holiday form
    async function onSave(row: Holiday | null, body: Record<string, FormDataEntryValue>, formError: (m: string) => void): Promise<void> {
        setBusy(true);

        let saved = false;
        try {
            await call(row ? '/' + row.holsno : '', row ? 'PUT' : 'POST', body);
            saved = true;
            if (!alive()) {
                return;
            }

            setEditor(null);
            setSearch('');
            setYear('');
            notice('Holiday saved.');
            await refresh();
        } catch (error) {
            if (alive()) {
                if (saved) {
                    notice('Holiday saved, but the list could not reload. Use Reload to try again.', true);
                } else {
                    formError(errMsg(error));
                }
            }
        } finally {
            setBusy(false);
        }
    }

    // Handle reload button click
    async function onReload(): Promise<void> {
        if (busyRef.current) {
            return;
        }

        setBusy(true);

        try {
            await refresh();
        } catch (error) {
            notice(errMsg(error), true);
        } finally {
            setBusy(false);
        }
    }

    // Open add, edit, or view holiday form
    function openEditor(row: Holiday | null, view = false): void {
        if (busyRef.current) {
            return;
        }
        setEditor((prev) => ({ row, view, n: (prev?.n ?? 0) + 1 }));
    }

    // Handle row delete button
    async function onDelete(row: Holiday): Promise<void> {
        if (busyRef.current) {
            return;
        }

        setBusy(true);
        let deleted = false;

        try {
            const confirmed = await confirmModal({
                title: 'Delete holiday?',
                message: `Delete the holiday on ${row.holddt}? This cannot be undone.`,
            });
            if (!confirmed || !alive()) {
                return;
            }

            await call('/' + row.holsno, 'DELETE');
            deleted = true;
            if (!alive()) {
                return;
            }

            setEditor(null);
            setRows((prev) => prev.filter((r) => r.holsno !== row.holsno));
            notice('Holiday deleted.');
            await refresh();
        } catch (error) {
            notice(
                deleted
                    ? 'Holiday deleted, but the list could not reload. Use Reload to try again.'
                    : errMsg(error),
                true
            );
        } finally {
            setBusy(false);
        }
    }

    return (
        <>
            <div className="d-flex justify-content-between align-items-start gap-3 mb-4">
                <div>
                    <h3 className="mb-1">Holiday Master</h3>
                    <p className="text-muted mb-0">Manage holiday dates, holiday types and overtime rates.</p>
                </div>
                {can('a_holm', 'add') ? (
                    <div className="d-flex gap-2">
                        <button className="btn btn-outline-primary text-nowrap" id="add-all" disabled={busy} onClick={() => navigate('/a_holentergrid')}><i className="bi bi-calendar-plus me-1"></i>Add All</button>
                        <button className="btn btn-primary text-nowrap" id="add" disabled={busy} onClick={() => openEditor(null)}><i className="bi bi-plus-lg me-1"></i>Add holiday</button>
                    </div>
                ) : null}
            </div>
            <div id="notice" role="status">
                {message ? (message.error ? <AlertBox message={message.text} /> : <div className="alert alert-success py-2">{message.text}</div>) : null}
            </div>
            <div id="editor">
                {editor ? (
                    <Editor
                        key={editor.n}
                        row={editor.row}
                        view={editor.view}
                        rows={rows}
                        types={types}
                        busy={busy}
                        onSubmit={(body, formError) => void onSave(editor.row, body, formError)}
                        onCancel={() => {
                            if (!busyRef.current) {
                                setEditor(null);
                            }
                        }}
                    />
                ) : null}
            </div>
            <div className="card-soft p-4 mb-4">
                <div className="row g-3 align-items-end">
                    <div className="col-md-6">
                        <label className="form-label" htmlFor="search">Search holidays</label>
                        <input id="search" type="search" className="form-control" placeholder="Search by date or holiday type" value={search} onChange={(e) => setSearch(e.target.value)} />
                    </div>
                    <div className="col-md-4">
                        <label className="form-label" htmlFor="year">Year</label>
                        <Select id="year" value={selectedYear} onChange={(e) => setYear(e.target.value)}>
                            <option value="">All years</option>
                            {years.map((y) => (
                                <option key={y} value={y}>{y}</option>
                            ))}
                        </Select>
                    </div>
                    <div className="col-md-2">
                        <button className="btn btn-outline-primary w-100" id="reload" disabled={busy} onClick={() => void onReload()}><i className="bi bi-arrow-clockwise me-1"></i>Reload</button>
                    </div>
                </div>
            </div>
            <div className="card-soft overflow-hidden">
                <div className="p-3 border-bottom d-flex justify-content-between">
                    <strong>Holiday calendar</strong>
                    <span id="count" className="text-muted">{list.length} of {rows.length} holidays</span>
                </div>
                <div className="table-responsive">
                    <table className="table table-hover align-middle mb-0">
                        <thead>
                            <tr><th>#</th><th>Date</th><th>Day</th><th>Holiday type</th><th>OT rate</th><th>Actions</th></tr>
                        </thead>
                        <tbody id="rows">
                            {list.length ? list.map((r, i) => (
                                <tr key={r.holsno}>
                                    <td>{i + 1}</td>
                                    <td className="text-nowrap">{r.holddt ?? ''}</td>
                                    <td>{r.holddt ? new Date(`${r.holddt}T12:00:00`).toLocaleDateString('en', { weekday: 'long' }) : '—'}</td>
                                    <td>{r.sysdes ?? `Unknown type (${r.holtypsno})`}</td>
                                    <td>{Number(r.holotrate).toLocaleString('en-LK', { maximumFractionDigits: 4 })}</td>
                                    <td className="text-nowrap">
                                        <button className="btn btn-sm btn-outline-secondary" disabled={busy} onClick={() => openEditor(r, true)}>View</button>
                                        {' '}
                                        {can('a_holm', 'amend') ? <button className="btn btn-sm btn-outline-primary" disabled={busy} onClick={() => openEditor(r)}>Edit</button> : null}
                                        {' '}
                                        {can('a_holm', 'delete') ? <button className="btn btn-sm btn-outline-danger" disabled={busy} onClick={() => void onDelete(r)}>Delete</button> : null}
                                    </td>
                                </tr>
                            )) : (
                                <tr><td colSpan={6} className="text-center text-muted py-5">No holidays found. Try another year or search.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </>
    );
}
