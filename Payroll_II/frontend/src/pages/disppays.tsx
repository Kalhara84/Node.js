import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { jsPDF } from 'jspdf';
import { request } from '../services/api.ts';
import { errMsg } from '../utils/ui.ts';
import { AlertBox, Loading } from '../components/ui.tsx';
import Select from '../components/Select.tsx';
import { useAlive } from '../App.tsx';

type DepartmentOption = {
    depsno: number;
    depdes: string | null;
};

type EmployeeOption = {
    empsno: number;
    empeno: number;
    empnam: string;
    empdepsno: number | null;
};

type OptionsData = {
    departments: DepartmentOption[];
    employees: EmployeeOption[];
    period: string | null;
    companyName: string;
};

type PaySlipItem = {
    trntyp: string;
    sysdes: string;
    trnamt: number;
};

type PaySlipSection = {
    category: 'EARNINGS' | 'DEDUCTIONS' | 'OTHERS';
    items: PaySlipItem[];
    total: number | null;
};

type PaySlipData = {
    companyName: string;
    period: string | null;
    employee: {
        empsno: number;
        empeno: number;
        empnam: string;
        label: string;
    } | null;
    sections: PaySlipSection[];
    user: string;
};

const call = <T,>(path: string): Promise<T> => request<T>('/disppays' + path);

// Format YYYY-MM-DD as MMM-YYYY (matching PHP substr($te_frddtf, -8))
function formatPeriod(period: string | null): string {
    if (!period) return '';
    const d = new Date(`${period}T00:00:00`);
    if (Number.isNaN(d.getTime())) return period;
    return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

// Format number with 2 decimals and thousands separator
function formatAmount(value: number): string {
    return value.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
}

// Generate Pay_Slip.pdf matching p_disppayslp.php layout and open in a new tab
function printPaySlipPdf(data: PaySlipData): void {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
    const py = 842;
    const px = 595;
    const spx = 24;
    const spy = 20;
    const ch = 14;
    const colTypeW = 340;
    const colAmtW = 140;

    let pg = 0;
    let ly = 9999;

    const drawHeading = () => {
        if (pg > 0) doc.addPage();
        pg += 1;
        ly = 30;

        doc.setFont('courier', 'bold');
        doc.setFontSize(14);
        const title = 'PAY SLIP';
        const titleW = doc.getTextWidth(title);
        const titleX = (px - titleW) / 2;
        doc.text(title, titleX, ly);
        doc.line(titleX, ly + 2, titleX + titleW, ly + 2);

        doc.setFontSize(10);
        doc.text(`- ${pg} -`, px / 2, py - spy, { align: 'center' });

        ly = 56;
        doc.setFont('courier', 'normal');
        doc.setFontSize(9);
        doc.text(data.companyName || '', spx, ly);

        ly += 15;
        doc.text(`Name  : ${data.employee?.label ?? ''}`, spx, ly);
        doc.text(`Month : ${formatPeriod(data.period)}`, spx + 260, ly);

        ly += 18;
        doc.setFont('courier', 'bold');
        doc.setFontSize(10);
        doc.rect(spx, ly, colTypeW, 18);
        doc.text('Type', spx + colTypeW / 2, ly + 12, { align: 'center' });
        doc.rect(spx + colTypeW, ly, colAmtW, 18);
        doc.text('Amount', spx + colTypeW + colAmtW / 2, ly + 12, { align: 'center' });

        ly += 30;
        doc.setFont('courier', 'normal');
    };

    const ensureSpace = () => {
        if (ly > py - 70) {
            drawHeading();
        }
    };

    drawHeading();

    for (const section of data.sections) {
        ensureSpace();
        doc.setFont('courier', 'bold');
        doc.setFontSize(10);
        const catText = section.category;
        doc.text(catText, spx, ly);
        doc.line(spx, ly + 2, spx + doc.getTextWidth(catText), ly + 2);
        ly += ch;

        doc.setFont('courier', 'normal');
        for (const item of section.items) {
            ensureSpace();
            doc.text(item.sysdes, spx + 4, ly);
            doc.text(formatAmount(item.trnamt), spx + colTypeW + colAmtW - 4, ly, { align: 'right' });
            ly += ch;
        }

        if (section.total !== null) {
            ensureSpace();
            doc.setFont('courier', 'bold');
            doc.text('TOTAL :', spx + 4, ly);
            const totalText = formatAmount(section.total);
            const totalX = spx + colTypeW + colAmtW - 4;
            doc.text(totalText, totalX, ly, { align: 'right' });
            doc.line(totalX - doc.getTextWidth(totalText), ly + 2, totalX, ly + 2);
            doc.setFont('courier', 'normal');
            ly += 1.5 * ch;
        }
    }

    ly += ch;
    const now = new Date();
    const ddmmyyyy = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;
    const hhmmss = now.toTimeString().slice(0, 8);
    doc.setFontSize(8);
    doc.text(`USER : ${data.user}  DATE : ${ddmmyyyy}  TIME : ${hhmmss}`, spx, ly);

    const blobUrl = doc.output('bloburl');
    window.open(blobUrl, '_blank', 'noopener,noreferrer');
}

// Render Display Pay Slip page
export default function Disppays() {
    const alive = useAlive();
    const [options, setOptions] = useState<OptionsData | null>(null);
    const [employees, setEmployees] = useState<EmployeeOption[]>([]);
    const [loadingOptions, setLoadingOptions] = useState(true);
    const [loadingEmployees, setLoadingEmployees] = useState(false);
    const [loadingSlip, setLoadingSlip] = useState(false);
    const [printing, setPrinting] = useState(false);
    const [error, setError] = useState('');

    // Filter states
    const [depMode, setDepMode] = useState<'all' | 'select'>('all');
    const [depsno, setDepsno] = useState('');
    const [empsno, setEmpsno] = useState('');

    // Displayed pay slip data
    const [paySlip, setPaySlip] = useState<PaySlipData | null>(null);

    useEffect(() => {
        void (async () => {
            try {
                const data = await call<OptionsData>('/options');
                if (!alive()) return;
                setOptions(data);
                setEmployees(data.employees);
            } catch (e) {
                if (!alive()) return;
                setError(errMsg(e));
            } finally {
                if (alive()) setLoadingOptions(false);
            }
        })();
    }, [alive]);

    async function reloadEmployees(selectedDepsno: string): Promise<void> {
        setLoadingEmployees(true);
        try {
            const qs = selectedDepsno ? `?depsno=${encodeURIComponent(selectedDepsno)}` : '';
            const data = await call<{ employees: EmployeeOption[] }>(`/employees${qs}`);
            if (!alive()) return;
            setEmployees(data.employees);
        } catch (e) {
            if (!alive()) return;
            setError(errMsg(e));
        } finally {
            if (alive()) setLoadingEmployees(false);
        }
    }

    function validate(): boolean {
        if (depMode === 'select' && !depsno) {
            setError('Please select a department');
            return false;
        }
        if (!empsno) {
            setError('Please select an employee');
            return false;
        }
        return true;
    }

    async function fetchPaySlip(): Promise<PaySlipData | null> {
        if (!validate()) return null;
        const params = new URLSearchParams({ empsno });
        if (depMode === 'select' && depsno) {
            params.set('depsno', depsno);
        }
        return call<PaySlipData>(`/display?${params.toString()}`);
    }

    async function handleDisplay(e: FormEvent): Promise<void> {
        e.preventDefault();
        setError('');
        if (!validate()) return;

        setLoadingSlip(true);
        try {
            const data = await fetchPaySlip();
            if (!alive() || !data) return;
            setPaySlip(data);
        } catch (err) {
            if (!alive()) return;
            setError(errMsg(err));
        } finally {
            if (alive()) setLoadingSlip(false);
        }
    }

    async function handlePrint(): Promise<void> {
        setError('');
        if (!validate()) return;

        setPrinting(true);
        try {
            const data = await fetchPaySlip();
            if (!alive() || !data) return;
            setPaySlip(data);
            if (data.sections.length === 0) {
                setError('No Records');
                return;
            }
            printPaySlipPdf(data);
        } catch (err) {
            if (!alive()) return;
            setError(errMsg(err));
        } finally {
            if (alive()) setPrinting(false);
        }
    }

    function handleReload(): void {
        setDepMode('all');
        setDepsno('');
        setEmpsno('');
        setPaySlip(null);
        setError('');
        if (options) {
            setEmployees(options.employees);
        }
    }

    if (loadingOptions) return <Loading />;

    const periodLabel = formatPeriod(options?.period ?? null);

    return (
        <div>
            <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
                <div>
                    <h4 className="mb-0 fw-semibold">
                        Pay Slip{periodLabel ? ` - ${periodLabel}` : ''}
                    </h4>
                </div>
                <button
                    type="button"
                    className="btn btn-outline-secondary btn-sm"
                    onClick={handleReload}
                >
                    <i className="bi bi-arrow-clockwise me-1"></i>Reload
                </button>
            </div>

            {error ? <AlertBox message={error} /> : null}

            <form className="card-soft mb-4" onSubmit={(e) => void handleDisplay(e)}>
                <div className="card-head">
                    <i className="bi bi-sliders"></i> Pay Slip Filters
                </div>
                <div className="card-body-pad">
                    <div className="row g-3">
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
                                                    setEmpsno('');
                                                    setPaySlip(null);
                                                    void reloadEmployees('');
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
                                                    setEmpsno('');
                                                    setPaySlip(null);
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
                                            const nextDep = e.target.value;
                                            setDepsno(nextDep);
                                            setEmpsno('');
                                            setPaySlip(null);
                                            void reloadEmployees(nextDep);
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
                                <label className="form-label" htmlFor="empsno">
                                    EMP # * {loadingEmployees ? <span className="text-muted small">(loading...)</span> : null}
                                </label>
                                <Select
                                    id="empsno"
                                    value={empsno}
                                    onChange={(e) => {
                                        setEmpsno(e.target.value);
                                        setPaySlip(null);
                                    }}
                                >
                                    <option value="">-- Select Employee --</option>
                                    {employees.map((emp) => (
                                        <option key={emp.empsno} value={emp.empsno}>
                                            {emp.empeno} - {emp.empnam}
                                        </option>
                                    ))}
                                </Select>
                            </div>
                        </div>
                    </div>

                    <div className="d-flex justify-content-end gap-2 mt-3">
                        <button
                            type="submit"
                            className="btn btn-primary"
                            disabled={loadingSlip || printing}
                        >
                            <i className="bi bi-search me-1"></i>
                            {loadingSlip ? 'Loading...' : 'DISPLAY'}
                        </button>
                        <button
                            type="button"
                            className="btn btn-outline-primary"
                            disabled={loadingSlip || printing}
                            onClick={() => void handlePrint()}
                        >
                            <i className="bi bi-printer me-1"></i>
                            {printing ? 'Generating...' : 'PRINT'}
                        </button>
                    </div>
                </div>
            </form>

            {paySlip ? (
                paySlip.sections.length === 0 ? (
                    <div className="card-soft">
                        <div className="card-body-pad text-center text-danger py-4">
                            No Records
                        </div>
                    </div>
                ) : (
                    <div className="card-soft">
                        <div className="card-head d-flex flex-wrap justify-content-between align-items-center gap-2">
                            <span>
                                <i className="bi bi-receipt me-1"></i>
                                {paySlip.employee?.label ?? 'Pay Slip'}
                            </span>
                            <span className="small text-muted">
                                {paySlip.companyName}
                                {formatPeriod(paySlip.period) ? ` | ${formatPeriod(paySlip.period)}` : ''}
                            </span>
                        </div>
                        <div className="table-responsive">
                            <table className="table table-sm table-hover align-middle mb-0">
                                <thead>
                                    <tr>
                                        <th style={{ width: '56px' }} className="text-end">#</th>
                                        <th>Type</th>
                                        <th style={{ width: '160px' }} className="text-end">Amount</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {paySlip.sections.map((section) => (
                                        <SectionRows key={section.category} section={section} />
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )
            ) : null}
        </div>
    );
}

function SectionRows({ section }: { section: PaySlipSection }) {
    return (
        <>
            <tr style={{ background: '#4bbbba', color: '#ffffff' }}>
                <td colSpan={3} className="fw-semibold text-center py-1">
                    {section.category}
                </td>
            </tr>
            {section.items.map((item, idx) => (
                <tr key={`${section.category}-${item.trntyp}-${idx}`}>
                    <td className="text-end text-muted">{idx + 1}.</td>
                    <td>{item.sysdes}</td>
                    <td className="text-end">{formatAmount(item.trnamt)}</td>
                </tr>
            ))}
            {section.total !== null ? (
                <tr className="table-light fw-semibold">
                    <td colSpan={2} className="text-end">Total :</td>
                    <td className="text-end">{formatAmount(section.total)}</td>
                </tr>
            ) : null}
        </>
    );
}
