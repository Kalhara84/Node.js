import { api } from '../services/api.ts';
import { esc } from './ui.ts';
import type { Employee } from '../types.ts';

export type ExportTable = { headings: string[]; rows: (string | number)[][] };

// Yield between batches so progress messages and navigation remain responsive
const pause = (): Promise<void> => new Promise((resolve) => window.setTimeout(resolve, 0));

// Fetch every employee page only when an export is requested
export async function allEmployees(progress: (text: string) => void, alive: () => boolean): Promise<Employee[]> {
    const employees: Employee[] = [];
    let page = 1;
    let totalPages = 1;
    let total = 0;

    do {
        if (!alive()) {
            throw new Error('Export cancelled.');
        }
        const result = await api.list('', page, 100);
        if (!alive()) {
            throw new Error('Export cancelled.');
        }
        if (page > 1 && total !== result.total) {
            throw new Error('Employee records changed during export. Please try again.');
        }
        total = result.total;
        totalPages = result.totalPages;
        employees.push(...result.data);
        progress(`Loading all employees: ${employees.length} of ${total}`);
        page += 1;
    } while (page <= totalPages);

    if (employees.length !== total || new Set(employees.map((employee) => employee.empsno)).size !== total) {
        throw new Error('Unable to load the complete employee list. Please try again.');
    }
    return employees;
}

// Tab-separated cells paste into separate Excel columns; keep formulas as text
export function copyText(table: ExportTable): string {
    return [table.headings, ...table.rows].map((row) => row.map((value) => {
        let text = String(value).replace(/[\t\r\n]+/g, ' ');
        if (typeof value === 'string' && /^\s*[=+@-]/.test(text)) {
            text = "'" + text;
        }
        return text;
    }).join('\t')).join('\r\n');
}

// Download a generated file without navigating away from the page
function download(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 60000);
}

// Generate a real XLSX workbook; string IDs retain leading zeroes
export async function excel(table: ExportTable): Promise<void> {
    const { default: ExcelJS } = await import('exceljs');
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Employees');
    sheet.addRow(table.headings);
    for (let i = 0; i < table.rows.length; i += 100) {
        sheet.addRows(table.rows.slice(i, i + 100));
        await pause();
    }
    sheet.views = [{ state: 'frozen', xSplit: 2, ySplit: 1 }];
    sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: table.headings.length } };
    sheet.columns.forEach((column, index) => {
        column.width = index === 1 ? 30 : Math.max(18, Math.min(32, table.headings[index].length + 3));
    });
    sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF6344D9' } };
    const buffer = await workbook.xlsx.writeBuffer();
    download(new Blob([new Uint8Array(buffer)], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    }), 'employees.xlsx');
}

// Split wide output into readable sections, repeating employee number and name
export function columnGroups(table: ExportTable): number[][] {
    const groups: number[][] = [];
    for (let i = 2; i < table.headings.length; i += 6) {
        const group = [0, 1];
        for (let j = i; j < Math.min(i + 6, table.headings.length); j++) {
            group.push(j);
        }
        groups.push(group);
    }
    return groups;
}

// Generate PDF in small batches so large employee lists do not block the page
export async function pdf(table: ExportTable, progress: (text: string) => void, alive: () => boolean): Promise<void> {
    const [{ jsPDF }, { autoTable }] = await Promise.all([import('jspdf'), import('jspdf-autotable')]);
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a3', compress: true });
    const groups = columnGroups(table);
    let first = true;

    for (const [section, group] of groups.entries()) {
        for (let i = 0; i < table.rows.length; i += 100) {
            if (!alive()) {
                throw new Error('Export cancelled.');
            }
            if (!first) {
                doc.addPage();
            }
            first = false;
            autoTable(doc, {
                head: [group.map((index) => table.headings[index])],
                body: table.rows.slice(i, i + 100).map((row) => group.map((index) => row[index])),
                margin: { top: 22, left: 10, right: 10, bottom: 12 },
                styles: { fontSize: 9, cellPadding: 2, overflow: 'linebreak' },
                headStyles: { fillColor: [99, 68, 217] },
                columnStyles: { 0: { cellWidth: 20 }, 1: { cellWidth: 55 } },
                rowPageBreak: 'avoid',
                didDrawPage: () => {
                    doc.setFontSize(12);
                    doc.text(`All Employee Details - Section ${section + 1} of ${groups.length}`, 10, 12);
                    doc.setFontSize(9);
                    doc.text(`${table.rows.length} employees | Page ${doc.getNumberOfPages()}`, 10, 18);
                }
            });
            progress(`Creating PDF: section ${section + 1} of ${groups.length}, employees ${Math.min(i + 100, table.rows.length)} of ${table.rows.length}`);
            await pause();
        }
    }
    doc.save('employees.pdf');
}

// Print all rows in readable column sections using the browser print dialog
export async function printTable(table: ExportTable, popup: Window, alive: () => boolean): Promise<void> {
    popup.document.open();
    popup.document.write(`<!doctype html><html><head><title>All Employee Details</title>
      <style>
        @page { size: A3 landscape; margin: 10mm; }
        body { font: 10px Arial, sans-serif; color: #202033; }
        h1 { font-size: 18px; } h2 { font-size: 13px; }
        section + section { break-before: page; }
        table { border-collapse: collapse; width: 100%; table-layout: fixed; }
        th, td { border: 1px solid #ccc; padding: 5px; text-align: left; overflow-wrap: anywhere; }
        th { background: #eeeaff; } thead { display: table-header-group; }
        tr { break-inside: avoid; } th:first-child { width: 6%; } th:nth-child(2) { width: 18%; }
        @media print { button { display: none; } }
      </style></head><body><h1>All Employee Details</h1>
      <p>${table.rows.length} employees</p><button id="print" type="button">Print again</button></body></html>`);
    popup.document.close();
    popup.document.getElementById('print')!.onclick = () => popup.print();

    for (const [section, group] of columnGroups(table).entries()) {
        if (popup.closed || !alive()) {
            throw new Error('Printing cancelled.');
        }
        const block = popup.document.createElement('section');
        block.innerHTML = `<h2>Section ${section + 1}</h2><table><thead><tr>${group.map((index) => `<th>${esc(table.headings[index])}</th>`).join('')}</tr></thead><tbody></tbody></table>`;
        popup.document.body.appendChild(block);
        const body = block.querySelector('tbody')!;
        for (let i = 0; i < table.rows.length; i += 100) {
            if (popup.closed || !alive()) {
                throw new Error('Printing cancelled.');
            }
            body.insertAdjacentHTML('beforeend', table.rows.slice(i, i + 100).map((row) =>
                `<tr>${group.map((index) => `<td>${esc(row[index])}</td>`).join('')}</tr>`
            ).join(''));
            await pause();
        }
    }
    await popup.document.fonts.ready;
    if (popup.closed || !alive()) {
        throw new Error('Printing cancelled.');
    }
    popup.focus();
    popup.print();
}
