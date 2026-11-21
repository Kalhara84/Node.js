import { api, getLookups } from '../api.js';
import { esc, errMsg, qs, loading, alertBox } from '../ui.js';
import type { Employee, EmployeeBody, Lookups, PageContext } from '../types.js';

interface Option {
  value: string;
  label: string;
}

const YN: Option[] = [{ value: 'Y', label: 'Yes' }, { value: 'N', label: 'No' }];
const SEX: Option[] = [{ value: 'M', label: 'Male' }, { value: 'F', label: 'Female' }];
const CAT: Option[] = [{ value: 'W', label: 'Wages' }, { value: 'E', label: 'Executive' }, { value: 'S', label: 'Staff' }];

type FieldKey = keyof EmployeeBody & string;
type LookupKey = keyof Lookups;

/** extra settings a field can have */
interface FieldOpt {
  max?: number;
  size?: string;
  upper?: boolean;
  inputType?: string;
  options?: Option[]; // radio
  lookup?: LookupKey; // select: which list from /api/lookups
  value?: string; // select: option value column
  text?: (row: never) => string; // select: option text
}

/**
 * The whole form is described here once.
 *  type: int | float | date | text | select | radio
 */
interface Field {
  key: FieldKey;
  label: string;
  type: 'int' | 'float' | 'date' | 'text' | 'select' | 'radio';
  opt?: FieldOpt;
}
type Item = Field | 'break';

const f = (key: FieldKey, label: string, type: Field['type'], opt: FieldOpt = {}): Field => ({ key, label, type, opt });

// select text helpers (typed per lookup list)
const locText = (x: Lookups['locations'][number]): string => x.locnam ?? x.locloc;
const depText = (x: Lookups['departments'][number]): string => x.depdes ?? x.depdep;
const desText = (x: Lookups['sections'][number]): string => x.sysdes;
const rnoText = (x: Lookups['sections'][number]): string => x.sysrno;

const SECTIONS: { icon: string; title: string; fields: Item[] }[] = [
  { icon: 'bi-person', title: 'Personal', fields: [
    f('empeno', 'Employee No *', 'int'),
    f('empinital', 'Initial', 'text', { max: 20 }),
    f('empnam', 'Employee Name *', 'text', { max: 80 }),
    f('empmof', 'Sex', 'radio', { options: SEX }),
    f('empmrdtst', 'Married', 'radio', { options: YN }),
    f('empidno', 'National ID', 'text', { max: 20 }),
    f('emppasportno', 'Passport No', 'text', { max: 15 }),
    f('empdob', 'Date of Birth', 'date'),
  ] },
  { icon: 'bi-briefcase', title: 'Job', fields: [
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
  ] },
  { icon: 'bi-cash-stack', title: 'Salary & Statutory', fields: [
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
  ] },
  { icon: 'bi-bank', title: 'Bank', fields: [
    f('empbnkacno', 'Bank A/C #', 'text', { max: 30 }),
    f('empbnkcode', 'Bank Code', 'text', { max: 20 }),
    f('empbnkbranch', 'Bank Branch', 'text', { max: 20 }),
    f('empbnkid', 'Bank Id', 'text', { max: 20 }),
  ] },
  { icon: 'bi-telephone', title: 'Contact', fields: [
    f('empad1', 'Address Line 1', 'text', { max: 40 }),
    f('empad2', 'Address Line 2', 'text', { max: 40 }),
    f('empad3', 'Address Line 3', 'text', { max: 40 }),
    f('empad4', 'Address Line 4', 'text', { max: 40 }),
    f('empemail', 'Email', 'text', { max: 40, inputType: 'email' }),
    f('emptel', 'Telephone', 'text', { max: 25 }),
  ] },
  { icon: 'bi-calendar-check', title: 'Leave & Flags', fields: [
    f('empanual', 'Annual', 'text', { max: 4, size: 'col-6 col-lg-2' }),
    f('empcasal', 'Casual', 'text', { max: 4, size: 'col-6 col-lg-2' }),
    f('empleuleu', 'L/L', 'text', { max: 4, size: 'col-6 col-lg-2' }),
    'break',
    f('empotflg', 'OT', 'radio', { options: YN, size: 'col-6 col-lg-2' }),
    f('empnopflg', 'No Pay', 'radio', { options: YN, size: 'col-6 col-lg-2' }),
    f('empattincflg', 'Attendance Incentive', 'radio', { options: YN, size: 'col-6 col-lg-3' }),
    f('emplateflg', 'Late', 'radio', { options: YN, size: 'col-6 col-lg-2' }),
    f('empnsatlflg', 'Sat Leave', 'radio', { options: YN, size: 'col-6 col-lg-2' }),
  ] },
];

const FIELDS: Field[] = SECTIONS.flatMap((s) => s.fields).filter((x): x is Field => x !== 'break');

/** form values as text, keyed by field name */
type Values = Partial<Record<FieldKey, string>>;

const DEFAULTS: Values = {
  empcat: 'W', empmof: 'M', empmrdtst: 'N',
  empactflg: 'Y', empepfyn: 'Y', emppayeyn: 'N',
  empotflg: 'N', empnopflg: 'N', empattincflg: 'N', emplateflg: 'N', empnsatlflg: 'N',
  empsal: '0', empscgpcn: '0', empprl: '0', emptax: '0', empgin: '0', empcob: '0', emptno: '0', empepfno: '0',
};

function fieldHtml(fd: Field, values: Values, lookups: Lookups | null): string {
  const { key, label, type } = fd;
  const opt = fd.opt ?? {};
  const size = opt.size || 'col-md-6 col-lg-4';
  const v = values[key] ?? '';
  let input = '';

  if (type === 'radio') {
    input = `<div class="d-flex gap-3 pt-1">${(opt.options ?? []).map((o) => `
      <div class="form-check">
        <input class="form-check-input" type="radio" name="${key}" id="${key}-${o.value}" value="${o.value}" ${v === o.value ? 'checked' : ''}>
        <label class="form-check-label" for="${key}-${o.value}">${esc(o.label)}</label>
      </div>`).join('')}</div>`;
  } else if (type === 'select') {
    const list = ((opt.lookup && lookups?.[opt.lookup]) || []) as unknown as Record<string, unknown>[];
    const valueCol = opt.value ?? '';
    input = `<select class="form-select" name="${key}"><option value="">-- Select --</option>${list.map((x) =>
      `<option value="${esc(x[valueCol])}" ${String(x[valueCol]) === String(v) ? 'selected' : ''}>${esc(opt.text?.(x as never))}</option>`).join('')}</select>`;
  } else {
    const t = type === 'date' ? 'date' : type === 'int' || type === 'float' ? 'number' : opt.inputType || 'text';
    const step = type === 'float' ? ' step="0.01"' : type === 'int' ? ' step="1"' : '';
    const max = opt.max ? ` maxlength="${opt.max}"` : '';
    const style = opt.upper ? ' style="text-transform:uppercase"' : '';
    input = `<input class="form-control" type="${t}" name="${key}" value="${esc(v)}"${step}${max}${style}>`;
  }
  return `<div class="${size}"><label class="form-label">${esc(label)}</label>${input}</div>`;
}

/** form values -> JSON body for the API */
function toPayload(form: HTMLFormElement): EmployeeBody {
  // built as a loose record, then handed to the API as EmployeeBody
  const body: Record<string, string | number | null> = {};
  for (const { key, type } of FIELDS) {
    const v =
      type === 'radio'
        ? form.querySelector<HTMLInputElement>(`[name="${key}"]:checked`)?.value ?? ''
        : (form.elements.namedItem(key) as HTMLInputElement | HTMLSelectElement).value;

    if (type === 'int' || type === 'select') body[key] = v === '' ? null : parseInt(v, 10);
    else if (type === 'float') body[key] = v === '' ? 0 : parseFloat(v);
    else if (type === 'date') body[key] = v === '' ? null : v;
    else body[key] = String(v).trim();
  }
  return body as EmployeeBody;
}

export async function render(el: HTMLElement, ctx: PageContext): Promise<void> {
  const id = ctx.params[0] ? Number(ctx.params[0]) : null;
  el.innerHTML = loading();

  let values: Values = { ...DEFAULTS };
  let lookups: Lookups | null = null;
  try {
    const [lk, emp]: [Lookups | null, Employee | null] = await Promise.all([
      getLookups().catch(() => null),
      id !== null ? api.get(id) : Promise.resolve(null),
    ]);
    lookups = lk;
    if (emp) {
      values = Object.fromEntries(
        FIELDS.map(({ key }) => {
          const raw = emp[key];
          return [key, raw === null || raw === undefined ? '' : String(raw).trim()];
        }),
      );
    }
  } catch (e) {
    if (ctx.alive()) el.innerHTML = alertBox(errMsg(e));
    return;
  }
  if (!ctx.alive()) return;

  const saveLabel = id !== null ? 'Update' : 'Save';
  el.innerHTML = `
  <form id="emp-form" novalidate>
    <div class="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-3">
      <div><h4 class="page-title">${id !== null ? 'Edit Employee' : 'Add Employee'}</h4><div class="page-sub">Fields marked * are required</div></div>
      <div class="d-flex gap-2">
        <a href="/employees" data-link class="btn btn-light">Cancel</a>
        <button class="btn btn-primary" data-save><i class="bi bi-check-lg me-1"></i>${saveLabel}</button>
      </div>
    </div>
    <div id="form-error"></div>

    ${SECTIONS.map((s) => `
      <div class="card-soft mb-3 fade-in">
        <div class="card-head"><i class="bi ${s.icon}"></i> ${esc(s.title)}</div>
        <div class="card-body-pad"><div class="row g-3">
          ${s.fields.map((x) => (x === 'break' ? '<div class="w-100"></div>' : fieldHtml(x, values, lookups))).join('')}
        </div></div>
      </div>`).join('')}

    <div class="action-bar d-flex justify-content-end gap-2">
      <a href="/employees" data-link class="btn btn-light">Cancel</a>
      <button class="btn btn-primary" data-save><i class="bi bi-check-lg me-1"></i>${saveLabel}</button>
    </div>
  </form>`;

  const form = qs<HTMLFormElement>(el, '#emp-form');
  const errBox = qs(el, '#form-error');
  const buttons = form.querySelectorAll<HTMLButtonElement>('[data-save]');

  form.onsubmit = async (e) => {
    e.preventDefault();
    errBox.innerHTML = '';
    const body = toPayload(form);
    const fail = (m: string): void => {
      errBox.innerHTML = alertBox(m);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    if (body.empeno === null || body.empeno === undefined) return fail('Employee No is required');
    if (!body.empnam) return fail('Employee Name is required');

    buttons.forEach((b) => (b.disabled = true));
    try {
      if (id !== null) await api.update(id, body);
      else await api.create(body);
      ctx.navigate('/employees');
    } catch (err) {
      fail(errMsg(err));
      buttons.forEach((b) => (b.disabled = false));
    }
  };
}
