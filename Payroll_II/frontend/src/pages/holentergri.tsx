import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { request } from '../services/api.ts';
import { errMsg } from '../utils/ui.ts';
import { AlertBox, Loading } from '../components/ui.tsx';
import Select from '../components/Select.tsx';
import { useAlive } from '../hooks.ts';
import { navigate } from '../router.tsx';

type HolidayType = {
    syssno: number;
    sysdes: string;
};

type RangeHoliday = {
    holsno: number;
    holddt: string;
    holtypsno: number;
    holotrate: number;
    sysdes: string | null;
};

type BulkResponse = {
    inserted: number;
    updated: number;
    message: string;
};

type GridRow = { type: string; rate: string };
type Grid = { from: string; to: string; dates: string[]; existing: Map<string, RangeHoliday>; values: Record<string, GridRow> };

// Shared API helper for holiday endpoints
const call = <T,>(path = '', method = 'GET', body?: unknown): Promise<T> => {
    return request<T>('/holidays' + path, {
        method,
        ...(body ? { body: JSON.stringify(body) } : {}),
    });
};

// Generate inclusive YYYY-MM-DD date list between from and to dates
function dateRange(from: string, to: string): string[] {
    const dates: string[] = [];
    const current = new Date(`${from}T00:00:00Z`);
    const last = new Date(`${to}T00:00:00Z`);

    while (current <= last) {
        dates.push(current.toISOString().slice(0, 10));
        current.setUTCDate(current.getUTCDate() + 1);
    }

    return dates;
}

// Render bulk holiday entry grid page (a_holentergrid)
export default function Holentergri() {
    const alive = useAlive();
    const [types, setTypes] = useState<HolidayType[] | null>(null);
    const [loadError, setLoadError] = useState('');
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const firstDay = `${year}-${month}-01`;
    const lastDay = `${year}-${month}-${String(new Date(year, today.getMonth() + 1, 0).getDate()).padStart(2, '0')}`;

    const [from, setFrom] = useState(firstDay);
    const [to, setTo] = useState(lastDay);
    const [grid, setGrid] = useState<Grid | null>(null);
    const [busy, setBusyState] = useState(false);
    const busyRef = useRef(false);
    const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);
    const gridRef = useRef<HTMLTableSectionElement>(null);

    const setBusy = (value: boolean): void => {
        busyRef.current = value;
        setBusyState(value);
    };

    useEffect(() => {
        let cancelled = false;
        call<HolidayType[]>('/types').then(
            (data) => {
                if (!cancelled) {
                    setTypes(data);
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

    if (!types) {
        return <Loading text="Loading holiday types..." />;
    }

    // Show status or error banner
    function notice(text: string, error = false): void {
        if (alive()) {
            setMessage({ text, error });
        }
    }

    // Load existing holidays for the selected range and render the grid
    async function loadRange(f: string, t: string): Promise<void> {
        const query = new URLSearchParams({ from: f, to: t });
        const rows = await call<RangeHoliday[]>('/range?' + query.toString());
        if (!alive()) {
            return;
        }

        const existing = new Map(rows.map((r) => [r.holddt, r]));
        const dates = dateRange(f, t);
        const values: Record<string, GridRow> = {};
        for (const d of dates) {
            const e = existing.get(d);
            values[d] = { type: e ? String(e.holtypsno) : '', rate: e ? String(e.holotrate) : '' };
        }
        setGrid({ from: f, to: t, dates, existing, values });
    }

    // Reload button
    async function onReload(): Promise<void> {
        if (busyRef.current) {
            return;
        }

        if (!from || !to || from > to || !grid) {
            navigate('/a_holentergrid', true);
            return;
        }

        setMessage(null);
        setBusy(true);

        try {
            await loadRange(from, to);
        } catch (error) {
            notice(errMsg(error), true);
        } finally {
            if (alive()) {
                setBusy(false);
            }
        }
    }

    // Handle date range display form submit
    async function onRange(event: FormEvent<HTMLFormElement>): Promise<void> {
        event.preventDefault();
        if (busyRef.current) {
            return;
        }

        if (!from || !to) {
            notice('From Date and To Date are required.', true);
            return;
        }

        if (from > to) {
            notice('To Date must be greater than or equal to From Date.', true);
            return;
        }

        setMessage(null);
        setBusy(true);

        try {
            await loadRange(from, to);
        } catch (error) {
            notice(errMsg(error), true);
        } finally {
            if (alive()) {
                setBusy(false);
            }
        }
    }

    // Handle bulk save of all selected holiday rows
    async function onBulk(event: FormEvent<HTMLFormElement>): Promise<void> {
        event.preventDefault();
        if (busyRef.current || !grid) {
            return;
        }

        const items: Array<{ holddt: string; holtypsno: string; holotrate: string }> = [];

        for (const holddt of grid.dates) {
            const row = grid.values[holddt];
            const holtypsno = row?.type ?? '';

            if (!holtypsno) {
                continue;
            }

            const rawRate = row.rate.trim();
            const holotrate = rawRate === '' ? '0' : rawRate;
            const rateNum = Number(holotrate);

            if (!Number.isFinite(rateNum) || rateNum < 0 || rateNum > 9999.99) {
                notice(`Invalid OT rate for ${holddt}. Enter a value between 0 and 9999.99.`, true);
                gridRef.current?.querySelector<HTMLInputElement>(`tr[data-date="${holddt}"] [data-field="holotrate"]`)?.focus();
                return;
            }

            items.push({ holddt, holtypsno, holotrate });
        }

        if (!items.length) {
            notice('Select a Holiday Type for at least one date before saving.', true);
            return;
        }

        setMessage(null);
        setBusy(true);

        try {
            const result = await call<BulkResponse>('/bulk', 'POST', { items });
            if (!alive()) {
                return;
            }

            notice(result.message);
            await loadRange(from, to);
        } catch (error) {
            notice(errMsg(error), true);
        } finally {
            if (alive()) {
                setBusy(false);
            }
        }
    }

    // Change one cell of the grid
    function setCell(date: string, change: Partial<GridRow>): void {
        setGrid((prev) => (prev ? { ...prev, values: { ...prev.values, [date]: { ...prev.values[date], ...change } } } : prev));
    }

    return (
        <>
            <div className="d-flex flex-wrap justify-content-between align-items-start gap-3 mb-4">
                <div>
                    <h3 className="mb-1">Add All Holidays</h3>
                    <p className="text-muted mb-0">Select a date range, assign holiday types and OT rates, then save all at once.</p>
                </div>
                <div className="d-flex gap-2">
                    <button type="button" className="btn btn-outline-secondary text-nowrap" id="btn-back" onClick={() => navigate('/a_holm')}>
                        <i className="bi bi-arrow-left me-1"></i>Back
                    </button>
                    <button type="button" className="btn btn-outline-primary text-nowrap" id="btn-reload" disabled={busy} onClick={() => void onReload()}>
                        <i className="bi bi-arrow-clockwise me-1"></i>Reload
                    </button>
                    <button type="button" className="btn btn-primary text-nowrap" id="btn-menu" onClick={() => navigate('/dashboard')}>
                        <i className="bi bi-grid-1x2-fill me-1"></i>Menu
                    </button>
                </div>
            </div>

            <div id="notice" role="status">
                {message ? (message.error ? <AlertBox message={message.text} /> : <div className="alert alert-success py-2">{message.text}</div>) : null}
            </div>

            <form id="range-form" className="card-soft p-4 mb-4" onSubmit={(e) => void onRange(e)}>
                <div className="row g-3 align-items-end">
                    <div className="col-sm-4">
                        <label className="form-label" htmlFor="frddt">From Date</label>
                        <input id="frddt" name="frddt" type="date" className="form-control" value={from} min="1900-01-01" max="9999-12-31" required onChange={(e) => setFrom(e.target.value)} />
                    </div>
                    <div className="col-sm-4">
                        <label className="form-label" htmlFor="toddt">To Date</label>
                        <input id="toddt" name="toddt" type="date" className="form-control" value={to} min="1900-01-01" max="9999-12-31" required onChange={(e) => setTo(e.target.value)} />
                    </div>
                    <div className="col-sm-4">
                        <button type="submit" className="btn btn-primary w-100" id="btn-display" disabled={busy}>
                            <i className="bi bi-table me-1"></i>Display
                        </button>
                    </div>
                </div>
            </form>

            <div id="grid-wrap" hidden={!grid}>
                <form id="bulk-form" className="card-soft overflow-hidden" onSubmit={(e) => void onBulk(e)}>
                    <div className="p-3 border-bottom d-flex flex-wrap justify-content-between align-items-center gap-2">
                        <strong id="grid-caption">{grid ? `Dates from ${grid.from} to ${grid.to}` : 'Holiday Grid'}</strong>
                        <span id="grid-count" className="text-muted">{grid ? `${grid.dates.length} days` : ''}</span>
                    </div>
                    <div className="table-responsive attendance-table">
                        <table className="table table-hover align-middle mb-0">
                            <thead>
                                <tr>
                                    <th>#</th>
                                    <th>Date</th>
                                    <th>Day</th>
                                    <th>Holiday Type</th>
                                    <th>OT Rate</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody id="grid-rows" ref={gridRef}>
                                {grid ? grid.dates.map((d, i) => {
                                    const existing = grid.existing.get(d);
                                    const dayName = new Date(`${d}T12:00:00`).toLocaleDateString('en', { weekday: 'long' });
                                    const v = grid.values[d];

                                    return (
                                        <tr key={d} data-date={d}>
                                            <td>{i + 1}</td>
                                            <td className="text-nowrap fw-semibold">{d}</td>
                                            <td>{dayName}</td>
                                            <td style={{ minWidth: '220px' }}>
                                                <Select className="form-select-sm" data-field="holtypsno" value={v.type} onChange={(e) => setCell(d, { type: e.target.value })}>
                                                    <option value="">----</option>
                                                    {types.map((t) => (
                                                        <option key={t.syssno} value={String(t.syssno)}>{t.sysdes}</option>
                                                    ))}
                                                </Select>
                                            </td>
                                            <td style={{ maxWidth: '140px' }}>
                                                <input type="number" className="form-control form-control-sm" data-field="holotrate" min="0" max="9999.99" step="any" placeholder="0" value={v.rate} onChange={(e) => setCell(d, { rate: e.target.value })} />
                                            </td>
                                            <td>
                                                {existing ? <span className="badge badge-soft-blue">Existing</span> : <span className="badge badge-soft-gray">Not set</span>}
                                            </td>
                                        </tr>
                                    );
                                }) : null}
                            </tbody>
                        </table>
                    </div>
                    <div className="p-3 border-top d-flex justify-content-end gap-2">
                        <button type="submit" className="btn btn-primary" id="btn-save" disabled={busy}>
                            <i className="bi bi-check-lg me-1"></i>Save All
                        </button>
                    </div>
                </form>
            </div>
        </>
    );
}
