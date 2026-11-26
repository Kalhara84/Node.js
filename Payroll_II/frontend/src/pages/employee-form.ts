import { useState } from 'react';
import type { FormEvent } from 'react';
import { api, getLookups } from '../services/api.ts';
import { esc, errMsg, loading, alertBox, markup, useLoad, useAlive } from '../utils/ui.tsx';
import type { EmployeeBody, Lookups, PageContext } from '../types.ts';

interface Option {
    value: string;
    label: string;
}

// Predefined option lists for radio choices
const YN: Option[] = [{ value: 'Y', label: 'Yes' }, { value: 'N', label: 'No' }];
const SEX: Option[] = [{ value: 'M', label: 'Male' }, { value: 'F', label: 'Female' }];
const CAT: Option[] = [
    { value: 'W', label: 'Wages' },
    { value: 'E', label: 'Executive' },
    { value: 'S', label: 'Staff' }
];

type FieldKey = keyof EmployeeBody & string;
type LookupKey = keyof Lookups;

// Extra settings for form input fields
interface FieldOpt {
    max?: number;
    size?: string;
    upper?: boolean;
    inputType?: string;
    options?: Option[]; // for radio inputs
    lookup?: LookupKey; // lookup list name for dropdowns
    value?: string;     // column name for option value
    text?: (row: never) => string; // text formatter for dropdown items
}

// Field definition
interface Field {
    key: FieldKey;
    label: string;
    type: 'int' | 'float' | 'date' | 'text' | 'select' | 'radio';
    opt?: FieldOpt;
}

type Item = Field | 'break';

// Helper to define form fields cleanly
const f = (key: FieldKey, label: string, type: Field['type'], opt: FieldOpt = {}): Field => ({
    key,
    label,
    type,
    opt
});

// Select option label helpers
const locText = (x: Lookups['locations'][number]): string => x.locnam ?? x.locloc;
const depText = (x: Lookups['departments'][number]): string => x.depdes ?? x.depdep;
const desText = (x: Lookups['sections'][number]): string => x.sysdes;
const rnoText = (x: Lookups['sections'][number]): string => x.sysrno;

// Form section groupings
const SECTIONS: { icon: string; title: string; fields: Item[] }[] = [
    {
        icon: 'bi-person',
        title: 'Personal',
        fields: [
            f('empeno', 'Employee No *', 'int'),
            f('empinital', 'Initial', 'text', { max: 20 }),
            f('empnam', 'Employee Name *', 'text', { max: 80 }),
            f('empmof', 'Sex', 'radio', { options: SEX }),
            f('empmrdtst', 'Married', 'radio', { options: YN }),
            f('empidno', 'National ID', 'text', { max: 20 }),
            f('emppasportno', 'Passport No', 'text', { max: 15 }),
            f('empdob', 'Date of Birth', 'date'),
        ]
    },
    {
        icon: 'bi-briefcase',
        title: 'Job',
        fields: [
            f('empcat', 'Category', 'radio', { options: CAT }),
            f('empdesig', 'Designation', 'text', { max: 60 }),
            f('emplocsno', 'Location', 'select', { lookup: 'locations', value: 'locsno', text: locText as FieldOpt['text'] }),
            f('empdepsno', 'Department', 'select', { lookup: 'departments', value: 'depsno', text: depText as FieldOpt['text'] }),
            f('empsecsno', 'Section', 'select', { lookup: 'sections', value: 'syssno', text: desText as FieldOpt['text'] }),
            f('emparesno', 'Area', 'select', { lookup: 'areas', value: 'syssno', text: desText as FieldOpt['text'] }),
            f('empcossno', 'Cost Center', 'select', { lookup: 'costCenters', value: 'syssno', text: rnoText as FieldOpt['text'] }),
            f('empbasisno', 'Basis', 'select', { lookup: 'basis', value: 'syssno', text: desText as FieldOpt['text'] }),
            f('empjoin', 'Date Joined', 'date'),
            f('empleft', 'Date Left', 'date'),
            f('empmapcode', 'Map Code', 'int'),
            f('empsts', 'Status', 'text', { max: 1, upper: true }),
            f('empactflg', 'Active', 'radio', { options: YN }),
        ]
    },
    {
        icon: 'bi-cash-stack',
        title: 'Salary & Statutory',
        fields: [
            f('empsal', 'Basic Salary', 'float'),
            f('empscgpcn', 'Service Charge %', 'float'),
            f('empepfyn', 'E.P.F', 'radio', { options: YN }),
            f('empepfno', 'E.P.F #', 'int'),
            f('emppayeyn', 'PAYE', 'radio', { options: YN }),
            f('emptno', 'Tax Table No', 'int'),
            f('empprl', 'PAYE Relief', 'float'),
            f('empgin', 'Up To Date Gross Earnings', 'float'),
            f('emptax', 'Up To Date Tax', 'float'),
            f('emptin', 'TIN No', 'text', { max: 18 }),
            f('empcob', 'Coin Op Bal', 'float'),
        ]
    },
    {
        icon: 'bi-bank',
        title: 'Bank',
        fields: [
            f('empbnkacno', 'Bank A/C #', 'text', { max: 30 }),
            f('empbnkcode', 'Bank Code', 'text', { max: 20 }),
            f('empbnkbranch', 'Bank Branch', 'text', { max: 20 }),
            f('empbnkid', 'Bank Id', 'text', { max: 20 }),
        ]
    },
    {
        icon: 'bi-telephone',
        title: 'Contact',
        fields: [
            f('empad1', 'Address Line 1', 'text', { max: 40 }),
            f('empad2', 'Address Line 2', 'text', { max: 40 }),
            f('empad3', 'Address Line 3', 'text', { max: 40 }),
            f('empad4', 'Address Line 4', 'text', { max: 40 }),
            f('empemail', 'Email', 'text', { max: 40, inputType: 'email' }),
            f('emptel', 'Telephone', 'text', { max: 25 }),
        ]
    },
    {
        icon: 'bi-calendar-check',
        title: 'Leave & Flags',
        fields: [
            f('empanual', 'Annual', 'text', { max: 4, size: 'col-6 col-lg-2' }),
            f('empcasal', 'Casual', 'text', { max: 4, size: 'col-6 col-lg-2' }),
            f('empleuleu', 'L/L', 'text', { max: 4, size: 'col-6 col-lg-2' }),
            'break',
            f('empotflg', 'OT', 'radio', { options: YN, size: 'col-6 col-lg-2' }),
            f('empnopflg', 'No Pay', 'radio', { options: YN, size: 'col-6 col-lg-2' }),
            f('empattincflg', 'Attendance Incentive', 'radio', { options: YN, size: 'col-6 col-lg-3' }),
            f('emplateflg', 'Late', 'radio', { options: YN, size: 'col-6 col-lg-2' }),
            f('empnsatlflg', 'Sat Leave', 'radio', { options: YN, size: 'col-6 col-lg-2' }),
        ]
    },
];

// Flat list of all fields
const FIELDS: Field[] = [];
for (const section of SECTIONS) {
    for (const field of section.fields) {
        if (field !== 'break') {
            FIELDS.push(field);
        }
    }
}

type Values = Partial<Record<FieldKey, string>>;

// Default form initial values
const DEFAULTS: Values = {
    empcat: 'W',
    empmof: 'M',
    empmrdtst: 'N',
    empactflg: 'Y',
    empepfyn: 'Y',
    emppayeyn: 'N',
    empotflg: 'N',
    empnopflg: 'N',
    empattincflg: 'N',
    emplateflg: 'N',
    empnsatlflg: 'N',
    empsal: '0',
    empscgpcn: '0',
    empprl: '0',
    emptax: '0',
    empgin: '0',
    empcob: '0',
    emptno: '0',
    empepfno: '0',
};

// Generate HTML markup for a single form field
function fieldHtml(fd: Field, values: Values, lookups: Lookups | null): string {
    const { key, label, type } = fd;
    const opt = fd.opt ?? {};
    const size = opt.size || 'col-md-6 col-lg-4';
    const v = values[key] ?? '';
    let input = '';

    if (type === 'radio') {
        const radioOptions = (opt.options ?? []).map((o) => {
            const isChecked = v === o.value ? 'checked' : '';
            return `
              <div class="form-check">
                <input class="form-check-input" type="radio" name="${key}" id="${key}-${o.value}" value="${o.value}" ${isChecked}>
                <label class="form-check-label" for="${key}-${o.value}">${esc(o.label)}</label>
              </div>`;
        }).join('');
        input = `<div class="d-flex gap-3 pt-1">${radioOptions}</div>`;
    } else if (type === 'select') {
        const list = ((opt.lookup && lookups?.[opt.lookup]) || []) as unknown as Record<string, unknown>[];
        const valueCol = opt.value ?? '';
        const selectOptions = list.map((x) => {
            const isSelected = String(x[valueCol]) === String(v) ? 'selected' : '';
            return `<option value="${esc(x[valueCol])}" ${isSelected}>${esc(opt.text?.(x as never))}</option>`;
        }).join('');
        input = `<select class="form-select" name="${key}"><option value="">-- Select --</option>${selectOptions}</select>`;
    } else {
        const inputType = type === 'date' ? 'date' : (type === 'int' || type === 'float') ? 'number' : (opt.inputType || 'text');
        const step = type === 'float' ? ' step="0.01"' : type === 'int' ? ' step="1"' : '';
        const max = opt.max ? ` maxlength="${opt.max}"` : '';
        const style = opt.upper ? ' style="text-transform:uppercase"' : '';
        const readOnly = key === 'empeno' ? ' readonly aria-readonly="true"' : '';

        input = `<input class="form-control" type="${inputType}" name="${key}" value="${esc(v)}"${step}${max}${style}${readOnly}>`;
    }

    return `<div class="${size}"><label class="form-label">${esc(label)}</label>${input}</div>`;
}

// Generate HTML markup for all form sections
function sectionsHtml(values: Values, lookups: Lookups | null): string {
    return SECTIONS.map((section) => {
        const fieldsHtml = section.fields.map((field) => {
            if (field === 'break') {
                return '<div class="w-100"></div>';
            }
            return fieldHtml(field, values, lookups);
        }).join('');

        return `
          <div class="card-soft mb-3 fade-in">
            <div class="card-head"><i class="bi ${section.icon}"></i> ${esc(section.title)}</div>
            <div class="card-body-pad">
              <div class="row g-3">
                ${fieldsHtml}
              </div>
            </div>
          </div>`;
    }).join('');
}

// Extract form data into EmployeeBody API payload
function toPayload(form: HTMLFormElement): EmployeeBody {
    const body: Record<string, string | number | null> = {};

    for (const { key, type } of FIELDS) {
        if (key === 'empeno') {
            continue;
        }

        let v = '';
        if (type === 'radio') {
            v = form.querySelector<HTMLInputElement>(`[name="${key}"]:checked`)?.value ?? '';
        } else {
            v = (form.elements.namedItem(key) as HTMLInputElement | HTMLSelectElement).value;
        }

        if (type === 'int' || type === 'select') {
            body[key] = v === '' ? null : parseInt(v, 10);
        } else if (type === 'float') {
            body[key] = v === '' ? 0 : parseFloat(v);
        } else if (type === 'date') {
            body[key] = v === '' ? null : v;
        } else {
            body[key] = String(v).trim();
        }
    }

    return body as EmployeeBody;
}


export default function EmployeeForm({ ctx }: { ctx: PageContext }) {
    const id = ctx.params[0] ? Number(ctx.params[0]) : null;
    const alive = useAlive();
    const [busy, setBusy] = useState(false);
    const [message, setMessage] = useState('');
    const { data, error } = useLoad(async () => {
        const [lookups, emp, next] = await Promise.all([getLookups().catch(() => null), id !== null ? api.get(id) : Promise.resolve(null), id === null ? api.nextEmployeeNumber() : Promise.resolve(null)]);
        const values: Values = { ...DEFAULTS };
        if (next) values.empeno = String(next.empeno);
        if (emp) {
            for (const { key } of FIELDS) values[key] = emp[key] !== null && emp[key] !== undefined ? String(emp[key]).trim() : '';
        }
        return { values, lookups };
    });
    async function submit(event: FormEvent<HTMLFormElement>): Promise<void> {
        event.preventDefault();
        if (busy) return;
        const body = toPayload(event.currentTarget);
        setMessage('');
        if (!body.empnam) { setMessage('Employee Name is required'); window.scrollTo({ top: 0, behavior: 'smooth' }); return; }
        setBusy(true);
        try {
            if (id !== null) await api.update(id, body); else await api.create(body);
            if (alive.current) ctx.navigate('/employees');
        } catch (error) {
            if (alive.current) { setMessage(errMsg(error)); setBusy(false); window.scrollTo({ top: 0, behavior: 'smooth' }); }
        }
    }
    if (error) return <>{markup(alertBox(error))}</>;
    if (!data) return <>{markup(loading())}</>;
    const { values, lookups } = data;
    const pageTitle = id !== null ? 'Edit Employee' : 'Add Employee';
    const saveLabel = id !== null ? 'Update' : 'Save';
    return <>{markup(`
      <formid="emp-form" novalidate>
        <div class="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-3">
          <div>
            <h4 class="page-title">${pageTitle}</h4>
            <div class="page-sub">Fields marked * are required</div>
          </div>
          <div class="d-flex gap-2">
            <a href="/employees" data-link class="btn btn-light">Cancel</a>
            <button class="btn btn-primary" data-save><i class="bi bi-check-lg me-1"></i>${saveLabel}</button>
          </div>
        </div>

        <div id="form-error"></div>

        ${sectionsHtml(values, lookups)}

        <div class="action-bar d-flex justify-content-end gap-2">
          <a href="/employees" data-link class="btn btn-light">Cancel</a>
          <button class="btn btn-primary" data-save><i class="bi bi-check-lg me-1"></i>${saveLabel}</button>
        </div>
      </form>`, (element) => {
        if (element.attribs.id === 'emp-form') return { onSubmit: submit };
        if (element.attribs.id === 'form-error') return { children: markup(message ? alertBox(message) : '') };
        if (element.attribs['data-save'] !== undefined) return { disabled: busy };
        if (element.attribs.type === 'radio') return { checked: undefined, onChange: undefined, defaultChecked: element.attribs.checked !== undefined };
        return {};
    })}</>;
}
