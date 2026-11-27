import { useEffect, useRef, useState } from 'react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { api } from '../services/api.ts';
import { CATEGORY, errMsg, esc, GENDER, money, yn } from '../utils/ui.ts';
import { AlertBox, EmptyState } from '../components/ui.tsx';
import { useAlive } from '../App.tsx';
import { useNavigate } from 'react-router-dom';
import type { Employee, Paged } from '../types.ts';

// Employee table column headings
const labels: Record<keyof Employee, string> = {
    empeno: 'Emp No',
    empnam: 'Name',
    empinital: 'Initial',
    empcat: 'Category',
    empactflg: 'Active Status',
    empsts: 'Status',
    department_name: 'Department',
    location_name: 'Location',
    empdesig: 'Designation',
    empsal: 'Basic Salary',
    empmof: 'Sex',
    empmrdtst: 'Married',
    empidno: 'National ID',
    emppasportno: 'Passport No',
    empdob: 'Date of Birth',
    empjoin: 'Date Joined',
    empleft: 'Date Left',
    empmapcode: 'Map Code',
    emplocsno: 'Location ID',
    empdepsno: 'Department ID',
    empsecsno: 'Section ID',
    emparesno: 'Area ID',
    empcossno: 'Cost Center ID',
    empbasisno: 'Basis ID',
    empepfyn: 'EPF',
    empepfno: 'EPF No',
    emppayeyn: 'PAYE',
    emptno: 'Tax Table No',
    empprl: 'PAYE Relief',
    empgin: 'Up To Date Gross Earnings',
    emptax: 'Up To Date Tax',
    emptin: 'TIN No',
    empcob: 'Coin Opening Balance',
    empscgpcn: 'Service Charge %',
    empbnkacno: 'Bank Account No',
    empbnkcode: 'Bank Code',
    empbnkbranch: 'Bank Branch',
    empbnkid: 'Bank ID',
    empad1: 'Address Line 1',
    empad2: 'Address Line 2',
    empad3: 'Address Line 3',
    empad4: 'Address Line 4',
    empemail: 'Email',
    emptel: 'Telephone',
    empanual: 'Annual Leave',
    empcasal: 'Casual Leave',
    empleuleu: 'L/L',
    empotflg: 'OT',
    empnopflg: 'No Pay',
    empattincflg: 'Attendance Incentive',
    emplateflg: 'Late',
    empnsatlflg: 'Saturday Leave',
    empsno: 'Record ID',
};

const columns = Object.keys(labels) as (keyof Employee)[];
const flags = new Set<keyof Employee>([
    'empmrdtst', 'empepfyn', 'emppayeyn', 'empotflg', 'empnopflg',
    'empattincflg', 'emplateflg', 'empnsatlflg',
]);
const amounts = new Set<keyof Employee>(['empsal', 'empprl', 'empgin', 'emptax', 'empcob', 'empscgpcn']);

// Format employee field values for display
function display(employee: Employee, key: keyof Employee): string {
    const value = employee[key];
    if (value === null || value === undefined || value === '') {
        return '-';
    }
    if (key === 'empcat') {
        return CATEGORY[String(value)] ?? String(value);
    }
    if (key === 'empmof') {
        return GENDER[String(value)] ?? String(value);
    }
    if (key === 'empactflg') {
        if (value === 'Y') {
            return 'Active';
        }
        if (value === 'N') {
            return 'Inactive';
        }
        return String(value);
    }
    if (flags.has(key)) {
        return yn(String(value));
    }
    if (amounts.has(key)) {
        return money(value, 2);
    }
    return String(value);
}


// Build shared headers and formatted rows for export operations
function buildExportData(employees: Employee[]): { headers: string[]; rows: string[][] } {
    const headers = columns.map((key) => labels[key]);
    const rows = employees.map((emp) => columns.map((key) => display(emp, key)));
    return { headers, rows };
}

// Copy all employee records as tab-separated values for Excel pasting
async function copyAll(employees: Employee[]): Promise<void> {
    const { headers, rows } = buildExportData(employees);
    const clean = (v: string): string => v.replace(/[\t\r\n]+/g, ' ');
    const tsv = [
        headers.map(clean).join('\t'),
        ...rows.map((r) => r.map(clean).join('\t')),
    ].join('\n');

    if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(tsv);
    } else {
        const ta = document.createElement('textarea');
        ta.value = tsv;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        ta.remove();
    }
}

// Generate landscape A4 PDF with all employee records
function exportPdf(employees: Employee[]): void {
    const { headers, rows } = buildExportData(employees);
    const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
    doc.setFontSize(14);
    doc.text('All Employee Details', 28, 30);
    doc.setFontSize(9);
    doc.text(`${employees.length} employees in total`, 28, 44);
    autoTable(doc, {
        head: [headers],
        body: rows,
        startY: 54,
        margin: { left: 28, right: 28, bottom: 28 },
        styles: { fontSize: 6, cellPadding: 2 },
        headStyles: { fillColor: [79, 70, 229] },
        horizontalPageBreak: true,
        horizontalPageBreakRepeat: 0,
    });
    doc.save('all-employee-details.pdf');
}

// Generate Excel (.xlsx) workbook with all employee records
function exportExcel(employees: Employee[]): void {
    const { headers, rows } = buildExportData(employees);
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Employees');
    XLSX.writeFile(wb, 'all-employee-details.xlsx');
}

// Print all employee records via an isolated print iframe
function printAll(employees: Employee[]): void {
    const { headers, rows } = buildExportData(employees);
    const thead = `<tr>${headers.map((h) => `<th>${esc(h)}</th>`).join('')}</tr>`;
    const tbody = rows.map((r) => `<tr>${r.map((c) => `<td>${esc(c)}</td>`).join('')}</tr>`).join('');

    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!doc || !iframe.contentWindow) {
        iframe.remove();
        throw new Error('Unable to open print preview.');
    }

    doc.open();
    doc.write(`<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>All Employee Details</title>
  <style>
@page { size: A4 landscape; margin: 10mm; }
body { font-family: Arial, sans-serif; color: #111; margin: 0; }
h2 { margin: 0 0 4px; font-size: 16px; }
.sub { margin: 0 0 10px; font-size: 11px; color: #555; }
table { width: 100%; border-collapse: collapse; font-size: 8px; }
th, td { border: 1px solid #ccc; padding: 3px 4px; text-align: left; }
th { background: #f3f4f6; font-weight: 700; }
thead { display: table-header-group; }
tr { page-break-inside: avoid; }
  </style>
</head>
<body>
  <h2>All Employee Details</h2>
  <div class="sub">${employees.length} employees in total</div>
  <table>
<thead>${thead}</thead>
<tbody>${tbody}</tbody>
  </table>
</body>
</html>`);
    doc.close();

    const cleanup = (): void => {
        setTimeout(() => iframe.remove(), 300);
    };
    iframe.contentWindow.addEventListener('afterprint', cleanup, { once: true });
    iframe.contentWindow.focus();
    iframe.contentWindow.print();
}


// Render all employee details without row actions
export default function EmployeesTable() {
    const navigate = useNavigate();
    const alive = useAlive();
    const limit = 25;
    const [result, setResult] = useState<Paged<Employee> | null>(null);
    const [busy, setBusy] = useState(false);
    const [exporting, setExporting] = useState(false);
    const [statusText, setStatusText] = useState<string | null>(null);
    const [err, setErr] = useState<{ message: string; page: number | null } | null>(null);
    const busyRef = useRef(false);
    const exportingRef = useRef(false);
    const allCache = useRef<Employee[] | null>(null);
    const wrapRef = useRef<HTMLDivElement>(null);

    // Fetch only the requested page so the first records appear immediately
    async function load(page: number): Promise<void> {
        if (busyRef.current) {
            return;
        }
        busyRef.current = true;
        setBusy(true);
        setStatusText(`Loading page ${page}...`);
        setErr(null);

        try {
            const r = await api.list('', page, limit);
            if (!alive()) {
                return;
            }
            setResult(r);
        } catch (e) {
            if (!alive()) {
                return;
            }
            setErr({ message: errMsg(e), page });
        } finally {
            busyRef.current = false;
            if (alive()) {
                setBusy(false);
                setStatusText(null);
            }
        }
    }

    useEffect(() => {
        void load(1);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // New rows: scroll the table back to the top
    useEffect(() => {
        if (wrapRef.current) {
            wrapRef.current.scrollTop = 0;
        }
    }, [result]);

    // Fetch all employee records once and cache for Copy/PDF/Excel/Print
    async function getAllEmployees(): Promise<Employee[]> {
        if (allCache.current) {
            return allCache.current;
        }
        const all = await api.allEmployees();
        allCache.current = all;
        return all;
    }

    // Run export/print/copy action using all database records
    async function runExport(action: string): Promise<void> {
        if (exportingRef.current) {
            return;
        }
        exportingRef.current = true;
        setExporting(true);
        setErr(null);
        setStatusText('Loading all employee records from database...');

        try {
            const all = await getAllEmployees();
            if (!alive()) {
                return;
            }
            if (action === 'copy') {
                await copyAll(all);
                setStatusText(`Copied ${all.length} employee records to clipboard.`);
                setTimeout(() => {
                    if (alive() && !busyRef.current && !exportingRef.current) {
                        setStatusText(null);
                    }
                }, 3000);
                return;
            }
            if (action === 'pdf') {
                exportPdf(all);
            } else if (action === 'excel') {
                exportExcel(all);
            } else if (action === 'print') {
                printAll(all);
            }
            setStatusText(null);
        } catch (e) {
            if (!alive()) {
                return;
            }
            setStatusText(null);
            setErr({ message: errMsg(e), page: null });
        } finally {
            exportingRef.current = false;
            if (alive()) {
                setExporting(false);
            }
        }
    }

    // Go to another page of employees
    function goTo(page: number): void {
        if (busyRef.current) {
            return;
        }
        void load(page);
    }

    const first = result && result.data.length ? (result.page - 1) * limit + 1 : 0;
    const last = result && result.data.length ? first + result.data.length - 1 : 0;

    let countText = 'Loading employees...';
    if (result) {
        countText = `${result.total} employees in total`;
    } else if (err) {
        countText = 'Unable to load employees.';
    }

    return (
        <>
            <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-3">
                <div>
                    <h4 className="page-title">All Employee Details</h4>
                    <div className="page-sub" id="count" role="status">{countText}</div>
                </div>
                <div className="d-flex flex-wrap align-items-center gap-2" id="toolbar">
                    <button
                        type="button"
                        className="btn btn-outline-secondary btn-sm"
                        disabled={exporting}
                        onClick={() => {
                            if (window.history.length > 1) {
                                window.history.back();
                            } else {
                                navigate('/employees');
                            }
                        }}
                    ><i className="bi bi-arrow-left me-1"></i>Back</button>
                    <button type="button" className="btn btn-outline-primary btn-sm" disabled={exporting} onClick={() => void runExport('copy')}><i className="bi bi-clipboard me-1"></i>Copy</button>
                    <button type="button" className="btn btn-outline-danger btn-sm" disabled={exporting} onClick={() => void runExport('pdf')}><i className="bi bi-file-earmark-pdf me-1"></i>PDF</button>
                    <button type="button" className="btn btn-outline-success btn-sm" disabled={exporting} onClick={() => void runExport('excel')}><i className="bi bi-file-earmark-excel me-1"></i>EXLE</button>
                    <button type="button" className="btn btn-outline-dark btn-sm" disabled={exporting} onClick={() => void runExport('print')}><i className="bi bi-printer me-1"></i>PRINT</button>
                    <button type="button" className="btn btn-primary btn-sm" disabled={exporting} onClick={() => navigate('/dashboard')}><i className="bi bi-grid-1x2-fill me-1"></i>MENU</button>
                </div>
            </div>
            <div id="err" role="alert">
                {err ? (
                    <>
                        <AlertBox message={err.message} />
                        {err.page !== null ? (
                            <button id="retry" className="btn btn-outline-primary btn-sm mb-3" disabled={busy} onClick={() => goTo(err.page!)}>Retry page {err.page}</button>
                        ) : null}
                    </>
                ) : null}
            </div>
            <div className="card-soft fade-in employee-details-card">
                <div id="table-status" className="px-3 py-2 text-muted" role="status" hidden={statusText === null}>{statusText}</div>
                <div id="table-wrap" ref={wrapRef} className="table-responsive employee-details-wrap" tabIndex={0} role="region" aria-label="All employee details" aria-busy={busy}>
                    <table className="table table-clean employee-details-table">
                        <caption className="visually-hidden">All employee details, read only</caption>
                        <thead>
                            <tr>
                                {columns.map((key) => (
                                    <th key={key} scope="col" className={amounts.has(key) ? 'text-end' : undefined}>{labels[key]}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody id="rows">
                            {result ? (
                                result.data.length ? result.data.map((e) => (
                                    <tr key={e.empsno}>
                                        {columns.map((key) => (
                                            <td key={key} className={amounts.has(key) ? 'text-end' : undefined}>{display(e, key)}</td>
                                        ))}
                                    </tr>
                                )) : (
                                    <tr><td colSpan={columns.length}><EmptyState title="No employees found" /></td></tr>
                                )
                            ) : null}
                        </tbody>
                    </table>
                </div>
                <div id="pager" className="card-body-pad d-flex flex-wrap justify-content-between align-items-center gap-3">
                    {result ? (
                        <>
                            <div className="text-muted small">Showing {first}–{last} of {result.total} employees</div>
                            <div className="d-flex align-items-center gap-2">
                                <button className="btn btn-outline-secondary btn-sm" disabled={busy || result.page <= 1} onClick={() => goTo(result.page - 1)}>Previous</button>
                                <span className="text-muted small">Page {result.page} of {result.totalPages}</span>
                                <button className="btn btn-outline-primary btn-sm" disabled={busy || result.page >= result.totalPages} onClick={() => goTo(result.page + 1)}>Next</button>
                            </div>
                        </>
                    ) : null}
                </div>
            </div>
        </>
    );
}
