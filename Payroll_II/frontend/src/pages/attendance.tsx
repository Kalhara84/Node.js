import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { request } from '../services/api.ts';
import { can } from '../services/auth.ts';
import { errMsg } from '../utils/ui.ts';
import { AlertBox, Loading, confirmModal } from '../components/ui.tsx';
import Select from '../components/Select.tsx';
import DateInput from '../components/DateInput.tsx';
import { useAlive } from '../App.tsx';

type Row = Record<string, string | number | null>;
type Selection = { employee: string; year: string; month: string };

// Shared API helper for attendance endpoints
const call = <T,>(path = '', method = 'GET', body?: unknown): Promise<T> => {
    return request<T>('/attendance' + path, {
        method,
        ...(body ? { body: JSON.stringify(body) } : {}),
    });
};

// Cell text (empty for null)
const t = (v: unknown): string => String(v ?? '');

// Format HH:MM from row hour/minute columns
const time = (row: Row, prefix: string): string => {
    return `${String(row[prefix + 'hh'] ?? 0).padStart(2, '0')}:${String(row[prefix + 'mm'] ?? 0).padStart(2, '0')}`;
};

// One input of the record form
function Field({ name, label, type, value, ...attrs }: {
    name: string;
    label: string;
    type: string;
    value: unknown;
    min?: string | number;
    max?: string | number;
    step?: string | number;
}) {
    return (
        <div className="col-sm-6 col-lg-3">
            <label className="form-label" htmlFor={`att-${name}`}>{label}</label>
            {type === 'date' ? (
                <DateInput id={`att-${name}`} name={name} defaultValue={t(value)} {...attrs} required />
            ) : (
                <input className="form-control" id={`att-${name}`} name={name} type={type} defaultValue={t(value)} {...attrs} required />
            )}
        </div>
    );
}

// Add, edit, or view attendance record form
function Editor({ row, view, selection, busy, onSubmit, onCancel }: {
    row: Row | null;
    view: boolean;
    selection: Selection;
    busy: boolean;
    onSubmit: (form: HTMLFormElement, formError: (m: string) => void) => void;
    onCancel: () => void;
}) {
    const cardRef = useRef<HTMLDivElement>(null);
    const [formError, setFormError] = useState('');
    const r: Row = row ?? {};

    useEffect(() => {
        cardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, []);

    return (
        <div className="card-soft p-4 mb-4" ref={cardRef}>
            <h5>{view ? 'View' : row ? 'Edit' : 'Add'} attendance record</h5>
            <form
                id="record-form"
                onSubmit={(e: FormEvent<HTMLFormElement>) => {
                    e.preventDefault();
                    if (view || busy) {
                        return;
                    }
                    onSubmit(e.currentTarget, (m) => setFormError(m));
                }}
            >
                <fieldset disabled={view}>
                    <div className="row g-3">
                        <Field name="denddt" label="Date" type="date" value={r.denddt ?? `${selection.year}-${selection.month.padStart(2, '0')}-01`} min="1900-01-01" max="9999-12-31" />
                        <Field name="in" label="In time" type="time" value={row ? time(r, 'dlyactin') : '08:00'} />
                        <Field name="out" label="Out time" type="time" value={row ? time(r, 'dlyactout') : '17:00'} />
                        {['denot1', 'denot2', 'denlatemin'].map((key, i) => (
                            <Field
                                key={key}
                                name={key}
                                label={['OT1', 'OT2', 'Late minutes'][i]}
                                type="number"
                                value={r[key] ?? 0}
                                min={0}
                                max={i === 2 ? 2147483647 : 999999}
                                step={i === 2 ? 1 : 'any'}
                            />
                        ))}
                        {['dennoot', 'nolatflg'].map((key, i) => (
                            <div className="col-sm-6 col-lg-3" key={key}>
                                <label className="form-label" htmlFor={`att-${key}`}>{i ? 'No late deduction' : 'No overtime'}</label>
                                <Select id={`att-${key}`} name={key} defaultValue={String(r[key] ?? 'N')}>
                                    {['', 'N', 'Y', 'n', 'y'].map((flag) => (
                                        <option key={flag} value={flag}>
                                            {flag === '' ? 'Not set' : flag.toUpperCase() === 'Y' ? 'Yes' : 'No'}{flag === 'y' || flag === 'n' ? ' (legacy)' : ''}
                                        </option>
                                    ))}
                                </Select>
                            </div>
                        ))}
                    </div>
                </fieldset>
                {row ? (
                    <p className="small text-muted mt-3">
                        Entered by {t(r.denucdnew)} · {t(r.denentddt)} {t(r.denenttime)}
                        {r.denucdame ? <><br />Updated by {t(r.denucdame)} · {t(r.denameddt)} {t(r.denametime)}</> : null}
                    </p>
                ) : null}
                <div id="form-error" className="mt-3" role="alert">{formError ? <AlertBox message={formError} /> : null}</div>
                <div className="d-flex gap-2 mt-3">
                    {view ? null : <button className="btn btn-primary" type="submit" disabled={busy}>Save record</button>}
                    <button className="btn btn-light" type="button" id="cancel" onClick={onCancel}>{view ? 'Close' : 'Cancel'}</button>
                </div>
            </form>
        </div>
    );
}

// Render monthly attendance correction page
export default function Attendance() {
    const alive = useAlive();
    const [employees, setEmployees] = useState<Row[] | null>(null);
    const [loadError, setLoadError] = useState('');
    const [rows, setRows] = useState<Row[]>([]);
    const [selection, setSelection] = useState<Selection | null>(null);
    const [caption, setCaption] = useState('Monthly attendance');
    const [editor, setEditor] = useState<{ row: Row | null; view: boolean; n: number } | null>(null);
    const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);
    const [busy, setBusyState] = useState(false);
    const busyRef = useRef(false);
    const version = useRef(0);
    const selectionRef = useRef<Selection | null>(null);

    const setBusy = (value: boolean): void => {
        busyRef.current = value;
        setBusyState(value);
    };

    useEffect(() => {
        let cancelled = false;
        call<Row[]>('/employees').then(
            (data) => {
                if (!cancelled) {
                    setEmployees(data);
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

    if (!employees) {
        return <Loading text="Loading employees..." />;
    }

    const now = new Date();

    // Show status or error banner
    function notice(text: string, error = false): void {
        if (alive()) {
            setMessage({ text, error });
        }
    }

    // Load attendance records for the given selection
    async function load(sel: Selection): Promise<void> {
        const current = ++version.current;
        const data = await call<Row[]>('?' + new URLSearchParams(sel));
        if (!alive() || current !== version.current) {
            return;
        }

        setRows(data);
        const employee = employees!.find((r) => String(r.empsno) === sel.employee);
        setCaption(`${employee?.empnam ?? ''} · ${sel.year}-${sel.month.padStart(2, '0')}`);
    }

    // Handle filter form submit
    async function onFilters(event: FormEvent<HTMLFormElement>): Promise<void> {
        event.preventDefault();
        if (busyRef.current) {
            return;
        }

        const sel = Object.fromEntries(new FormData(event.currentTarget)) as Selection;
        selectionRef.current = sel;
        setSelection(sel);
        setRows([]);
        setEditor(null);
        setMessage(null);
        setBusy(true);

        try {
            await load(sel);
        } catch (error) {
            notice(errMsg(error), true);
        } finally {
            setBusy(false);
        }
    }

    // Open add, edit, or view attendance record form
    function openEditor(row: Row | null, view = false): void {
        if (!selection || busyRef.current) {
            return;
        }
        setEditor((prev) => ({ row, view, n: (prev?.n ?? 0) + 1 }));
    }

    // Save the record form
    async function onSave(row: Row | null, form: HTMLFormElement, formError: (m: string) => void): Promise<void> {
        const sel = selectionRef.current;
        if (!sel) {
            return;
        }

        const data = Object.fromEntries(new FormData(form));
        const [ih, im] = String(data.in).split(':');
        const [oh, om] = String(data.out).split(':');

        if (Number(ih) * 60 + Number(im) >= Number(oh) * 60 + Number(om)) {
            formError('Out time must be later than in time.');
            return;
        }

        setBusy(true);

        try {
            await call(row ? '/' + row.densno : '', row ? 'PUT' : 'POST', {
                ...data,
                employee: sel.employee,
                dlyactinhh: ih,
                dlyactinmm: im,
                dlyactouthh: oh,
                dlyactoutmm: om,
            });

            if (!alive()) {
                return;
            }

            setEditor(null);
            notice('Attendance saved.');
            await load(sel);
        } catch (error) {
            notice(errMsg(error), true);
        } finally {
            setBusy(false);
        }
    }

    // Handle row delete button
    async function onDelete(row: Row): Promise<void> {
        const sel = selectionRef.current;
        if (!sel || busyRef.current) {
            return;
        }

        setBusy(true);

        try {
            const confirmed = await confirmModal({
                title: 'Delete attendance record?',
                message: `Delete the attendance record for ${row.denddt}? This cannot be undone.`,
            });
            if (!confirmed || !alive()) {
                return;
            }

            await call('/' + row.densno, 'DELETE');
            if (!alive()) {
                return;
            }

            setEditor(null);
            notice('Attendance deleted.');
            await load(sel);
        } catch (error) {
            notice(errMsg(error), true);
        } finally {
            setBusy(false);
        }
    }

    return (
        <>
            <div className="d-flex justify-content-between align-items-start gap-3 mb-4">
                <div>
                    <h3 className="mb-1">Attendance Correction</h3>
                    <p className="text-muted mb-0">Review monthly attendance and correct recorded times, overtime and late minutes.</p>
                </div>
                {can('a_inqempatt', 'add') ? (
                    <button className="btn btn-primary text-nowrap" id="add" disabled={!selection || busy} onClick={() => openEditor(null)}>
                        <i className="bi bi-plus-lg me-1"></i>
                            Add record
                    </button>
                ) : null}
            </div>
            <div id="notice" role="status">
                {message ? (message.error ? <AlertBox message={message.text} /> : <div className="alert alert-success py-2">{message.text}</div>) : null}
            </div>
            <form id="filters" className="card-soft p-4 mb-4" onSubmit={(e) => void onFilters(e)}>
                <div className="row g-3 align-items-end">
                    <div className="col-lg-6">
                        <label htmlFor="employee" className="form-label">Employee</label>
                        <Select id="employee" name="employee" required defaultValue="">
                            <option value="">Select employee</option>
                            {employees.map((r) => (
                                <option key={t(r.empsno)} value={t(r.empsno)}>{t(r.empepfno)} - {t(r.empnam)} - {t(r.locnam)}</option>
                            ))}
                        </Select>
                    </div>
                    <div className="col-sm-4 col-lg-2">
                        <label htmlFor="year" className="form-label">Year</label>
                        <input id="year" name="year" className="form-control" type="number" min="1900" max="9998" defaultValue={now.getFullYear()} required />
                    </div>
                    <div className="col-sm-4 col-lg-2">
                        <label htmlFor="month" className="form-label">Month</label>
                        <Select id="month" name="month" defaultValue={String(now.getMonth() + 1)}>
                            {Array.from({ length: 12 }, (_, i) => (
                                <option key={i} value={i + 1}>{new Date(2024, i, 1).toLocaleString('en', { month: 'long' })}</option>
                            ))}
                        </Select>
                    </div>
                    <div className="col-sm-4 col-lg-2">
                        <button className="btn btn-primary w-100" id="check" disabled={busy}>Check</button>
                    </div>
                </div>
            </form>
            <div id="editor">
                {editor && selection ? (
                    <Editor
                        key={editor.n}
                        row={editor.row}
                        view={editor.view}
                        selection={selection}
                        busy={busy}
                        onSubmit={(form, formError) => void onSave(editor.row, form, formError)}
                        onCancel={() => {
                            if (!busyRef.current) {
                                setEditor(null);
                            }
                        }}
                    />
                ) : null}
            </div>
            <div className="card-soft overflow-hidden">
                <div className="p-3 border-bottom d-flex justify-content-between gap-3">
                    <strong id="caption">{caption}</strong>
                    <span id="count" className="text-muted">{rows.length} records</span>
                </div>
                <div className="table-responsive attendance-table">
                    <table className="table table-hover align-middle mb-0 text-nowrap">
                        <thead>
                            <tr>{['#', 'Date', 'In', 'Out', 'OT1', 'OT2', 'Late min', 'No OT', 'No LT', 'Entry user', 'Entry date', 'Entry time', 'Actions'].map((h) => <th key={h}>{h}</th>)}</tr>
                        </thead>
                        <tbody id="rows">
                            {rows.length ? rows.map((r, i) => (
                                <tr key={t(r.densno) || i}>
                                    <td>{i + 1}</td>
                                    <td>{t(r.denddt)}</td>
                                    <td>{time(r, 'dlyactin')}</td>
                                    <td>{time(r, 'dlyactout')}</td>
                                    <td>{t(r.denot1)}</td>
                                    <td>{t(r.denot2)}</td>
                                    <td>{t(r.denlatemin)}</td>
                                    <td>{String(r.dennoot).toUpperCase() === 'Y' ? 'Yes' : 'No'}</td>
                                    <td>{String(r.nolatflg).toUpperCase() === 'Y' ? 'Yes' : 'No'}</td>
                                    <td>{t(r.denucdnew)}</td>
                                    <td>{t(r.denentddt)}</td>
                                    <td>{t(r.denenttime)}</td>
                                    <td>
                                        <button className="btn btn-sm btn-outline-secondary" onClick={() => openEditor(r, true)}>View</button>
                                        {' '}
                                        {can('a_inqempatt', 'amend') ? <button className="btn btn-sm btn-outline-primary" onClick={() => openEditor(r)}>Edit</button> : null}
                                        {' '}
                                        {can('a_inqempatt', 'delete') ? <button className="btn btn-sm btn-outline-danger" onClick={() => void onDelete(r)}>Delete</button> : null}
                                    </td>
                                </tr>
                            )) : (
                                <tr><td colSpan={13} className="text-center text-muted py-5">{selection ? 'No attendance records for this employee and month.' : 'Select an employee and month, then click Check.'}</td></tr>
                            )}
                        </tbody>
                        <tfoot id="totals">
                            {selection ? (
                                <tr>
                                    <th colSpan={4}>Monthly totals</th>
                                    {['denot1', 'denot2', 'denlatemin'].map((k) => (
                                        <th key={k}>{rows.reduce((sum, r) => sum + Number(r[k] || 0), 0).toLocaleString('en-LK', { maximumFractionDigits: 2 })}</th>
                                    ))}
                                    <td colSpan={6}></td>
                                </tr>
                            ) : null}
                        </tfoot>
                    </table>
                </div>
            </div>
        </>
    );
}
