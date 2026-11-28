import { useEffect, useRef, useState } from 'react';
import type { FormEvent, KeyboardEvent } from 'react';
import { request } from '../services/api.ts';
import { can } from '../services/auth.ts';
import { errMsg } from '../utils/ui.ts';
import { AlertBox, Loading } from '../components/ui.tsx';
import Select from '../components/Select.tsx';
import { useAlive } from '../App.tsx';

type TypeOption = { 
    sysrno: string; 
    sysdes: string 
};
type LocationOption = { 
    locsno: number; 
    locnam: string | null 
};
type DepartmentOption = { 
    depsno: number; depdes: 
    string | null 
};
type SysOption = { 
    syssno: number; 
    sysdes: string 
};

type OptionsData = {
    types: TypeOption[];
    locations: LocationOption[];
    departments: DepartmentOption[];
    sections: SysOption[];
    areas: SysOption[];
    period: string | null;
};

type GridRow = {
    empsno: number;
    empeno: number;
    empnam: string;
    empepfno: number | string | null;
    trnamt: number | string | null;
    needs_add: boolean;
    needs_amend: boolean;
};

// Shared API helper for direct transaction endpoints
const call = <T,>(path: string, method = 'GET', body?: unknown): Promise<T> => {
    return request<T>('/noptrn' + path, {
        method,
        ...(body ? { body: JSON.stringify(body) } : {}),
    });
};

// Format YYYY-MM-DD as MMM-YYYY (matching PHP substr($te_frddtf, -8))
function formatPeriod(period: string | null): string {
    if (!period) return '';
    const d = new Date(`${period}T00:00:00`);
    if (Number.isNaN(d.getTime())) return period;
    return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

// Column header for amount/days/minutes based on selected type
function amountLabel(sysrno: string): string {
    if (sysrno === '112') return 'Days';
    if (sysrno === '110' || sysrno === '111') return 'MIN';
    return 'Amount';
}

// Render Entry Direct Transaction page
export default function Noptrn() {
    const alive = useAlive();
    const [options, setOptions] = useState<OptionsData | null>(null);
    const [loadingOptions, setLoadingOptions] = useState(true);
    const [loadingGrid, setLoadingGrid] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');

    // Filter states
    const [sysrno, setSysrno] = useState('');
    const [locMode, setLocMode] = useState<'all' | 'select'>('all');
    const [locsno, setLocsno] = useState('');
    const [depMode, setDepMode] = useState<'all' | 'select'>('all');
    const [depsno, setDepsno] = useState('');
    const [secMode, setSecMode] = useState<'all' | 'select'>('all');
    const [secsno, setSecsno] = useState('');
    const [areMode, setAreMode] = useState<'all' | 'select'>('all');
    const [aresno, setAresno] = useState('');

    // Displayed grid state
    const [displayedType, setDisplayedType] = useState('');
    const [rows, setRows] = useState<GridRow[] | null>(null);
    const [amounts, setAmounts] = useState<Record<number, string>>({});
    const inputRefs = useRef<Array<HTMLInputElement | null>>([]);
    const saveBtnRef = useRef<HTMLButtonElement | null>(null);

    function canSaveRow(row: GridRow): boolean {
        return (row.needs_add || row.needs_amend)
            && (!row.needs_add || can('noptrn', 'add'))
            && (!row.needs_amend || can('noptrn', 'amend'));
    }
    const editableRows = rows?.filter(canSaveRow) ?? [];
    const canSave = editableRows.length > 0;

    useEffect(() => {
        void (async () => {
            try {
                const data = await call<OptionsData>('/options');
                if (!alive()) return;
                setOptions(data);
            } catch (e) {
                if (!alive()) return;
                setError(errMsg(e));
            } finally {
                if (alive()) setLoadingOptions(false);
            }
        })();
    }, [alive]);

    function clearGrid(): void {
        setRows(null);
        setDisplayedType('');
    }

    async function handleDisplay(event: FormEvent): Promise<void> {
        event.preventDefault();
        setNotice('');
        setError('');

        if (!sysrno) {
            setError('Please select a Transaction Type.');
            return;
        }
        if (locMode === 'select' && !locsno) {
            setError('Please select a Location.');
            return;
        }
        if (depMode === 'select' && !depsno) {
            setError('Please select a Department.');
            return;
        }
        if (secMode === 'select' && !secsno) {
            setError('Please select a Section.');
            return;
        }
        if (areMode === 'select' && !aresno) {
            setError('Please select an Area.');
            return;
        }

        const params = new URLSearchParams({ sysrno });
        if (locMode === 'select' && locsno) params.set('locsno', locsno);
        if (depMode === 'select' && depsno) params.set('depsno', depsno);
        if (secMode === 'select' && secsno) params.set('secsno', secsno);
        if (areMode === 'select' && aresno) params.set('aresno', aresno);

        setLoadingGrid(true);
        try {
            const list = await call<GridRow[]>(`/display?${params.toString()}`);
            if (!alive()) return;
            const initial: Record<number, string> = {};
            for (const r of list) {
                initial[r.empsno] =
                    r.trnamt !== null && r.trnamt !== undefined ? String(r.trnamt) : '';
            }
            setAmounts(initial);
            setRows(list);
            setDisplayedType(sysrno);
        } catch (e) {
            if (!alive()) return;
            setError(errMsg(e));
        } finally {
            if (alive()) setLoadingGrid(false);
        }
    }

    async function handleSave(): Promise<void> {
        if (!rows || !canSave || !displayedType || saving) return;

        setError('');
        setNotice('');

        for (let i = 0; i < rows.length; i++) {
            if (!canSaveRow(rows[i])) continue;
            const raw = (amounts[rows[i].empsno] ?? '').replace(/,/g, '').trim();
            if (raw !== '') {
                const n = Number(raw);
                if (!Number.isFinite(n) || n < 0 || n > 9999999999.99) {
                    setError(`Invalid value for ${rows[i].empnam}. Enter a number between 0 and 9999999999.99.`);
                    inputRefs.current[i]?.focus();
                    return;
                }
            }
        }

        setSaving(true);
        try {
            const payload = {
                sysrno: displayedType,
                rows: editableRows.map((r) => ({
                    empsno: r.empsno,
                    trnamt: amounts[r.empsno] ?? '',
                })),
            };
            const res = await call<{ count: number; message: string }>('/save', 'POST', payload);
            if (!alive()) return;
            setNotice(res.message);
            const saved = new Set(editableRows.map(row => row.empsno));
            setRows(current => current?.map(row => saved.has(row.empsno)
                ? { ...row, needs_add: false, needs_amend: true }
                : row) ?? null);
        } catch (e) {
            if (!alive()) return;
            setError(errMsg(e));
        } finally {
            if (alive()) setSaving(false);
        }
    }

    function handleAmountKeyDown(index: number, e: KeyboardEvent<HTMLInputElement>): void {
        if (e.key === 'Enter') {
            e.preventDefault();
            if (rows && index + 1 < rows.length) {
                inputRefs.current[index + 1]?.focus();
            } else {
                saveBtnRef.current?.focus();
            }
        }
    }

    if (loadingOptions) {
        return <Loading />;
    }

    const periodLabel = formatPeriod(options?.period ?? null);

    return (
        <div className="fade-in">
            <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-3">
                <div>
                    <h4 className="page-title">
                        Enter Direct Transaction{periodLabel ? ` - ${periodLabel}` : ''}
                    </h4>
                    <div className="page-sub">Select transaction type and employee filters to enter values</div>
                </div>
                <button
                    type="button"
                    className="btn btn-light"
                    onClick={() => {
                        setSysrno('');
                        setLocMode('all');
                        setLocsno('');
                        setDepMode('all');
                        setDepsno('');
                        setSecMode('all');
                        setSecsno('');
                        setAreMode('all');
                        setAresno('');
                        setError('');
                        setNotice('');
                        clearGrid();
                    }}
                >
                    <i className="bi bi-arrow-clockwise me-1"></i>Reload
                </button>
            </div>

            {error ? <AlertBox message={error} /> : null}
            {notice ? <div className="alert alert-success py-2">{notice}</div> : null}

            <form className="card-soft mb-4" onSubmit={(e) => void handleDisplay(e)}>
                <div className="card-head">
                    <i className="bi bi-sliders"></i> Transaction Filters
                </div>
                <div className="card-body-pad">
                    <div className="row g-3 mb-3">
                        <div className="col-md-6 col-lg-5">
                            <label className="form-label" htmlFor="sysrno">Transaction Type *</label>
                            <Select
                                id="sysrno"
                                name="sysrno"
                                value={sysrno}
                                onChange={(e) => {
                                    setSysrno(e.target.value);
                                    clearGrid();
                                }}
                            >
                                <option value="">-- Select Type --</option>
                                {(options?.types ?? []).map((t) => (
                                    <option key={t.sysrno} value={t.sysrno}>
                                        {t.sysdes} ({t.sysrno})
                                    </option>
                                ))}
                            </Select>
                        </div>
                    </div>

                    <div className="row g-3">
                        <div className="col-md-6">
                            <div className="p-3 rounded-3 border h-100" style={{ background: '#fbfaff' }}>
                                <div className="d-flex justify-content-between align-items-center mb-2">
                                    <span className="form-label mb-0">Location</span>
                                    <div className="d-flex gap-2 small">
                                        <label className="form-check-label">
                                            <input
                                                type="radio"
                                                className="form-check-input me-1"
                                                name="locMode"
                                                checked={locMode === 'all'}
                                                onChange={() => {
                                                    setLocMode('all');
                                                    setLocsno('');
                                                    clearGrid();
                                                }}
                                            />
                                            All
                                        </label>
                                        <label className="form-check-label">
                                            <input
                                                type="radio"
                                                className="form-check-input me-1"
                                                name="locMode"
                                                checked={locMode === 'select'}
                                                onChange={() => {
                                                    setLocMode('select');
                                                    clearGrid();
                                                }}
                                            />
                                            Select
                                        </label>
                                    </div>
                                </div>
                                {locMode === 'select' ? (
                                    <Select
                                        id="locsno"
                                        value={locsno}
                                        onChange={(e) => {
                                            setLocsno(e.target.value);
                                            clearGrid();
                                        }}
                                    >
                                        <option value="">-- Select Location --</option>
                                        {(options?.locations ?? []).map((l) => (
                                            <option key={l.locsno} value={l.locsno}>
                                                {l.locnam}
                                            </option>
                                        ))}
                                    </Select>
                                ) : (
                                    <div className="small text-muted pt-1">All locations included</div>
                                )}
                            </div>
                        </div>

                        <div className="col-md-6">
                            <div className="p-3 rounded-3 border h-100" style={{ background: '#fbfaff' }}>
                                <div className="d-flex justify-content-between align-items-center mb-2">
                                    <span className="form-label mb-0">Department</span>
                                    <div className="d-flex gap-2 small">
                                        <label className="form-check-label">
                                            <input
                                                type="radio"
                                                className="form-check-input me-1"
                                                name="depMode"
                                                checked={depMode === 'all'}
                                                onChange={() => {
                                                    setDepMode('all');
                                                    setDepsno('');
                                                    clearGrid();
                                                }}
                                            />
                                            All
                                        </label>
                                        <label className="form-check-label">
                                            <input
                                                type="radio"
                                                className="form-check-input me-1"
                                                name="depMode"
                                                checked={depMode === 'select'}
                                                onChange={() => {
                                                    setDepMode('select');
                                                    clearGrid();
                                                }}
                                            />
                                            Select
                                        </label>
                                    </div>
                                </div>
                                {depMode === 'select' ? (
                                    <Select
                                        id="depsno"
                                        value={depsno}
                                        onChange={(e) => {
                                            setDepsno(e.target.value);
                                            clearGrid();
                                        }}
                                    >
                                        <option value="">-- Select Department --</option>
                                        {(options?.departments ?? []).map((d) => (
                                            <option key={d.depsno} value={d.depsno}>
                                                {d.depdes}
                                            </option>
                                        ))}
                                    </Select>
                                ) : (
                                    <div className="small text-muted pt-1">All departments included</div>
                                )}
                            </div>
                        </div>

                        <div className="col-md-6">
                            <div className="p-3 rounded-3 border h-100" style={{ background: '#fbfaff' }}>
                                <div className="d-flex justify-content-between align-items-center mb-2">
                                    <span className="form-label mb-0">Section</span>
                                    <div className="d-flex gap-2 small">
                                        <label className="form-check-label">
                                            <input
                                                type="radio"
                                                className="form-check-input me-1"
                                                name="secMode"
                                                checked={secMode === 'all'}
                                                onChange={() => {
                                                    setSecMode('all');
                                                    setSecsno('');
                                                    clearGrid();
                                                }}
                                            />
                                            All
                                        </label>
                                        <label className="form-check-label">
                                            <input
                                                type="radio"
                                                className="form-check-input me-1"
                                                name="secMode"
                                                checked={secMode === 'select'}
                                                onChange={() => {
                                                    setSecMode('select');
                                                    clearGrid();
                                                }}
                                            />
                                            Select
                                        </label>
                                    </div>
                                </div>
                                {secMode === 'select' ? (
                                    <Select
                                        id="secsno"
                                        value={secsno}
                                        onChange={(e) => {
                                            setSecsno(e.target.value);
                                            clearGrid();
                                        }}
                                    >
                                        <option value="">-- Select Section --</option>
                                        {(options?.sections ?? []).map((s) => (
                                            <option key={s.syssno} value={s.syssno}>
                                                {s.sysdes}
                                            </option>
                                        ))}
                                    </Select>
                                ) : (
                                    <div className="small text-muted pt-1">All sections included</div>
                                )}
                            </div>
                        </div>

                        <div className="col-md-6">
                            <div className="p-3 rounded-3 border h-100" style={{ background: '#fbfaff' }}>
                                <div className="d-flex justify-content-between align-items-center mb-2">
                                    <span className="form-label mb-0">Area</span>
                                    <div className="d-flex gap-2 small">
                                        <label className="form-check-label">
                                            <input
                                                type="radio"
                                                className="form-check-input me-1"
                                                name="areMode"
                                                checked={areMode === 'all'}
                                                onChange={() => {
                                                    setAreMode('all');
                                                    setAresno('');
                                                    clearGrid();
                                                }}
                                            />
                                            All
                                        </label>
                                        <label className="form-check-label">
                                            <input
                                                type="radio"
                                                className="form-check-input me-1"
                                                name="areMode"
                                                checked={areMode === 'select'}
                                                onChange={() => {
                                                    setAreMode('select');
                                                    clearGrid();
                                                }}
                                            />
                                            Select
                                        </label>
                                    </div>
                                </div>
                                {areMode === 'select' ? (
                                    <Select
                                        id="aresno"
                                        value={aresno}
                                        onChange={(e) => {
                                            setAresno(e.target.value);
                                            clearGrid();
                                        }}
                                    >
                                        <option value="">-- Select Area --</option>
                                        {(options?.areas ?? []).map((a) => (
                                            <option key={a.syssno} value={a.syssno}>
                                                {a.sysdes}
                                            </option>
                                        ))}
                                    </Select>
                                ) : (
                                    <div className="small text-muted pt-1">All areas included</div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="d-flex justify-content-end pt-3 mt-3 border-top">
                        <button type="submit" className="btn btn-primary" disabled={loadingGrid}>
                            <i className="bi bi-search me-1"></i>
                            {loadingGrid ? 'Loading...' : 'Display'}
                        </button>
                    </div>
                </div>
            </form>

            {loadingGrid ? (
                <div className="card-soft p-4"><Loading /></div>
            ) : rows ? (
                <div className="card-soft">
                    <div className="card-head d-flex justify-content-between align-items-center">
                        <span>
                            <i className="bi bi-table me-2"></i>Employees ({rows.length})
                        </span>
                        <button
                            ref={saveBtnRef}
                            type="button"
                            className="btn btn-primary btn-sm"
                            hidden={!can('noptrn', 'add') && !can('noptrn', 'amend')}
                            disabled={saving || !canSave}
                            onClick={() => void handleSave()}
                        >
                            <i className="bi bi-check-lg me-1"></i>
                            {saving ? 'Saving...' : 'Save'}
                        </button>
                    </div>
                    <div className="table-responsive">
                        {rows.length === 0 ? (
                            <div className="p-4 text-center text-muted">No active employees matched the selected filters.</div>
                        ) : (
                            <table className="table table-hover table-clean align-middle mb-0">
                                <thead>
                                    <tr>
                                        <th style={{ width: '60px' }}>#</th>
                                        <th style={{ width: '110px' }}>EPF#</th>
                                        <th>Employee</th>
                                        <th className="text-end" style={{ width: '180px' }}>
                                            {amountLabel(displayedType)}
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {rows.map((r, i) => (
                                        <tr key={r.empsno}>
                                            <td className="text-muted">{i + 1}.</td>
                                            <td>{r.empepfno ?? '-'}</td>
                                            <td className="fw-medium">{r.empnam}</td>
                                            <td>
                                                <input
                                                    ref={(el) => {
                                                        inputRefs.current[i] = el;
                                                    }}
                                                    type="text"
                                                    className="form-control form-control-sm text-end"
                                                    value={amounts[r.empsno] ?? ''}
                                                    readOnly={!canSaveRow(r) || saving}
                                                    onChange={(e) =>
                                                        setAmounts((prev) => ({
                                                            ...prev,
                                                            [r.empsno]: e.target.value,
                                                        }))
                                                    }
                                                    onKeyDown={(e) => handleAmountKeyDown(i, e)}
                                                />
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                    {canSave ? (
                        <div className="p-3 border-top d-flex justify-content-end">
                            <button
                                type="button"
                                className="btn btn-primary"
                                disabled={saving}
                                onClick={() => void handleSave()}
                            >
                                <i className="bi bi-check-lg me-1"></i>
                                {saving ? 'Saving...' : 'Save'}
                            </button>
                        </div>
                    ) : null}
                </div>
            ) : null}
        </div>
    );
}
