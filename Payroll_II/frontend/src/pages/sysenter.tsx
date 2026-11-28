import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { request } from '../services/api.ts';
import { can } from '../services/auth.ts';
import { errMsg } from '../utils/ui.ts';
import { AlertBox, Loading, confirmModal } from '../components/ui.tsx';
import Select from '../components/Select.tsx';
import { useAlive } from '../App.tsx';

type SysMasterRow = {
    syssno: number;
    sysrtp: number;
    sysrno: string;
    sysdes: string;
    sysdes1: string | null;
    sysdes2: string | null;
    sysucdnew: string | null;
    sysentddt: string | null;
    sysenttime: string | null;
    sysucdame: string | null;
    sysameddt: string | null;
    sysametime: string | null;
};

const call = <T,>(path = '', method = 'GET', body?: unknown): Promise<T> => {
    return request<T>('/sysenter' + path, {
        method,
        ...(body ? { body: JSON.stringify(body) } : {}),
    });
};

function Editor({
    row,
    view,
    rows,
    busy,
    onSubmit,
    onCancel,
}: {
    row: SysMasterRow | null;
    view: boolean;
    rows: SysMasterRow[];
    busy: boolean;
    onSubmit: (body: Record<string, FormDataEntryValue>, formError: (m: string) => void) => void;
    onCancel: () => void;
}) {
    const cardRef = useRef<HTMLDivElement>(null);
    const [formError, setFormError] = useState('');
    const [sysrtp, setSysrtp] = useState(row ? String(row.sysrtp) : '');
    const [sysrno, setSysrno] = useState(row?.sysrno ?? '');

    useEffect(() => {
        cardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, []);

    function submit(event: FormEvent<HTMLFormElement>): void {
        event.preventDefault();
        if (view || busy) return;

        const body = Object.fromEntries(new FormData(event.currentTarget));
        const rtpRaw = String(body.sysrtp ?? '').trim();
        const rno = String(body.sysrno ?? '').trim().toUpperCase();
        const des = String(body.sysdes ?? '').trim();

        if (!rtpRaw || !/^\d+$/.test(rtpRaw) || Number(rtpRaw) < 1 || Number(rtpRaw) > 999999) {
            setFormError('Record Type must be a number between 1 and 999999.');
            return;
        }
        if (!rno) {
            setFormError('Record No is required.');
            return;
        }
        if (!des) {
            setFormError('Description is required.');
            return;
        }
        if (!row && rows.some((r) => r.sysrtp === Number(rtpRaw) && r.sysrno.trim().toUpperCase() === rno)) {
            setFormError('Record already exists.');
            return;
        }

        body.sysrtp = rtpRaw;
        body.sysrno = rno;
        body.sysdes = des;
        setFormError('');
        onSubmit(body, setFormError);
    }

    return (
        <div className="card-soft p-4 mb-4" ref={cardRef}>
            <h5>{view ? 'View System Record' : row ? 'Edit System Record' : 'Add System Record'}</h5>
            <form onSubmit={submit}>
                <fieldset disabled={view}>
                    <div className="row g-3">
                        <div className="col-md-3">
                            <label className="form-label" htmlFor="sysrtp">Record Type *</label>
                            <input
                                className="form-control"
                                id="sysrtp"
                                name="sysrtp"
                                type="text"
                                inputMode="numeric"
                                maxLength={6}
                                value={sysrtp}
                                onChange={(e) => setSysrtp(e.target.value.replace(/\D/g, ''))}
                                required
                                readOnly={!!row}
                            />
                        </div>
                        <div className="col-md-3">
                            <label className="form-label" htmlFor="sysrno">Record No *</label>
                            <input
                                className="form-control"
                                id="sysrno"
                                name="sysrno"
                                type="text"
                                maxLength={10}
                                value={sysrno}
                                onChange={(e) => setSysrno(e.target.value.toUpperCase())}
                                style={{ textTransform: 'uppercase' }}
                                required
                                readOnly={!!row}
                            />
                        </div>
                        <div className="col-md-6">
                            <label className="form-label" htmlFor="sysdes">Description *</label>
                            <input
                                className="form-control"
                                id="sysdes"
                                name="sysdes"
                                type="text"
                                maxLength={40}
                                defaultValue={row?.sysdes ?? ''}
                                required
                            />
                        </div>
                        <div className="col-md-6">
                            <label className="form-label" htmlFor="sysdes1">Description 1</label>
                            <input
                                className="form-control"
                                id="sysdes1"
                                name="sysdes1"
                                type="text"
                                maxLength={40}
                                defaultValue={row?.sysdes1 ?? ''}
                            />
                        </div>
                        <div className="col-md-6">
                            <label className="form-label" htmlFor="sysdes2">Description 2</label>
                            <input
                                className="form-control"
                                id="sysdes2"
                                name="sysdes2"
                                type="text"
                                maxLength={30}
                                defaultValue={row?.sysdes2 ?? ''}
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

// Render System Master (p_sysmast) page
export default function Sysenter() {
    const alive = useAlive();
    const [rows, setRows] = useState<SysMasterRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');
    const [typeFilter, setTypeFilter] = useState('');
    const [search, setSearch] = useState('');
    const [mode, setMode] = useState<'add' | 'edit' | 'view' | null>(null);
    const [activeRow, setActiveRow] = useState<SysMasterRow | null>(null);
    const [busy, setBusy] = useState(false);

    async function load(): Promise<void> {
        setLoading(true);
        setError('');
        try {
            const list = await call<SysMasterRow[]>();
            if (!alive()) return;
            setRows(list);
        } catch (e) {
            if (!alive()) return;
            setError(errMsg(e));
        } finally {
            if (alive()) setLoading(false);
        }
    }

    useEffect(() => {
        void load();
    }, []);

    function openAdd(): void {
        if (!can('sysenter', 'add')) return;
        setNotice('');
        setError('');
        setActiveRow(null);
        setMode('add');
    }

    function openRow(row: SysMasterRow, nextMode: 'edit' | 'view'): void {
        if (!can('sysenter', nextMode === 'edit' ? 'amend' : 'view')) return;
        setNotice('');
        setError('');
        setActiveRow(row);
        setMode(nextMode);
    }

    async function handleSave(body: Record<string, FormDataEntryValue>, setFormError: (m: string) => void): Promise<void> {
        if (!can('sysenter', activeRow ? 'amend' : 'add')) return;
        setBusy(true);
        setNotice('');
        try {
            if (activeRow) {
                await call(`/${activeRow.syssno}`, 'PUT', body);
                if (!alive()) return;
                setNotice('System record updated.');
            } else {
                await call('', 'POST', body);
                if (!alive()) return;
                setNotice('System record inserted.');
            }
            setMode(null);
            setActiveRow(null);
            await load();
        } catch (e) {
            if (!alive()) return;
            setFormError(errMsg(e));
        } finally {
            if (alive()) setBusy(false);
        }
    }

    async function handleDelete(row: SysMasterRow): Promise<void> {
        if (!can('sysenter', 'delete')) return;
        const ok = await confirmModal({
            title: 'Delete System Record',
            message: `Delete record Type ${row.sysrtp} / No ${row.sysrno} (${row.sysdes})?`,
            confirmText: 'Delete',
        });
        if (!ok) return;

        setBusy(true);
        setNotice('');
        setError('');
        try {
            await call(`/${row.syssno}`, 'DELETE');
            if (!alive()) return;
            if (activeRow?.syssno === row.syssno) {
                setMode(null);
                setActiveRow(null);
            }
            setNotice('System record deleted.');
            await load();
        } catch (e) {
            if (!alive()) return;
            setError(errMsg(e));
        } finally {
            if (alive()) setBusy(false);
        }
    }

    const recordTypes = Array.from(new Set(rows.map((r) => r.sysrtp))).sort((a, b) => a - b);
    const q = search.trim().toLowerCase();
    const filtered = rows.filter((r) => {
        if (typeFilter && String(r.sysrtp) !== typeFilter) return false;
        if (!q) return true;
        return (
            String(r.sysrtp).includes(q) ||
            r.sysrno.toLowerCase().includes(q) ||
            r.sysdes.toLowerCase().includes(q) ||
            (r.sysdes1 ?? '').toLowerCase().includes(q) ||
            (r.sysdes2 ?? '').toLowerCase().includes(q)
        );
    });

    const canAdd = can('sysenter', 'add');
    const canAmend = can('sysenter', 'amend');
    const canDelete = can('sysenter', 'delete');

    return (
        <div className="fade-in">
            <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-3">
                <div>
                    <h4 className="mb-0 fw-semibold">System Master</h4>
                    <div className="text-muted small">Manage payroll system parameters (p_sysmast)</div>
                </div>
                {canAdd ? (
                    <button type="button" className="btn btn-primary" onClick={openAdd} disabled={busy}>
                        <i className="bi bi-plus-lg me-1"></i>Add Record
                    </button>
                ) : null}
            </div>

            {error ? <AlertBox message={error} /> : null}
            {notice ? <div className="alert alert-success py-2">{notice}</div> : null}

            {mode ? (
                <Editor
                    key={activeRow ? `${mode}-${activeRow.syssno}` : 'add'}
                    row={activeRow}
                    view={mode === 'view'}
                    rows={rows}
                    busy={busy}
                    onSubmit={(body, formErr) => void handleSave(body, formErr)}
                    onCancel={() => {
                        setMode(null);
                        setActiveRow(null);
                    }}
                />
            ) : null}

            <div className="card-soft">
                <div className="card-head d-flex flex-wrap justify-content-between align-items-center gap-2">
                    <span>
                        <i className="bi bi-gear me-1"></i>System Records ({filtered.length})
                    </span>
                    <div className="d-flex flex-wrap align-items-center gap-2">
                        <div style={{ minWidth: '170px' }}>
                            <Select
                                id="typeFilter"
                                value={typeFilter}
                                onChange={(e) => setTypeFilter(e.target.value)}
                            >
                                <option value="">All Record Types</option>
                                {recordTypes.map((t) => (
                                    <option key={t} value={String(t)}>
                                        Type {t}
                                    </option>
                                ))}
                            </Select>
                        </div>
                        <input
                            type="search"
                            className="form-control form-control-sm"
                            style={{ width: '220px' }}
                            placeholder="Search..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                </div>

                {loading ? (
                    <Loading />
                ) : (
                    <div className="table-responsive">
                        <table className="table table-sm table-hover align-middle mb-0">
                            <thead>
                                <tr>
                                    <th style={{ width: '70px' }}>Sno</th>
                                    <th style={{ width: '110px' }}>Record Type</th>
                                    <th style={{ width: '110px' }}>Record No</th>
                                    <th>Description</th>
                                    <th>Description 1</th>
                                    <th>Description 2</th>
                                    <th style={{ width: '130px' }} className="text-end">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="text-center text-muted py-4">
                                            No records found
                                        </td>
                                    </tr>
                                ) : (
                                    filtered.map((r) => (
                                        <tr key={r.syssno}>
                                            <td className="text-muted">{r.syssno}</td>
                                            <td>{r.sysrtp}</td>
                                            <td className="fw-medium">{r.sysrno}</td>
                                            <td>{r.sysdes}</td>
                                            <td>{r.sysdes1 ?? ''}</td>
                                            <td>{r.sysdes2 ?? ''}</td>
                                            <td className="text-end">
                                                <div className="btn-group btn-group-sm">
                                                    <button
                                                        type="button"
                                                        className="btn btn-outline-secondary"
                                                        title="View"
                                                        onClick={() => openRow(r, 'view')}
                                                    >
                                                        <i className="bi bi-eye"></i>
                                                    </button>
                                                    {canAmend ? (
                                                        <button
                                                            type="button"
                                                            className="btn btn-outline-primary"
                                                            title="Edit"
                                                            onClick={() => openRow(r, 'edit')}
                                                        >
                                                            <i className="bi bi-pencil"></i>
                                                        </button>
                                                    ) : null}
                                                    {canDelete ? (
                                                        <button
                                                            type="button"
                                                            className="btn btn-outline-danger"
                                                            title="Delete"
                                                            disabled={busy}
                                                            onClick={() => void handleDelete(r)}
                                                        >
                                                            <i className="bi bi-trash"></i>
                                                        </button>
                                                    ) : null}
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
