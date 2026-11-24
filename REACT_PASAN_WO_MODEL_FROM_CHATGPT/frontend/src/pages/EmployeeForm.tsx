import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, getLookups } from '../services/api';
import { errMsg } from '../utils/ui';
import type { Employee, EmployeeBody, Lookups } from '../types';

type Option = { value: string; label: string };
type FieldType = 'int' | 'float' | 'date' | 'text' | 'select' | 'radio';
type LookupKey = keyof Lookups;

type Field = {
  key: keyof EmployeeBody & string;
  label: string;
  type: FieldType;
  max?: number;
  size?: string;
  upper?: boolean;
  inputType?: string;
  options?: Option[];
  lookup?: LookupKey;
  value?: string;
  text?: (row: any) => string;
};

type Item = Field | 'break';

const YN: Option[] = [
  { value: 'Y', label: 'Yes' },
  { value: 'N', label: 'No' },
];

const SEX: Option[] = [
  { value: 'M', label: 'Male' },
  { value: 'F', label: 'Female' },
];

const CAT: Option[] = [
  { value: 'W', label: 'Wages' },
  { value: 'E', label: 'Executive' },
  { value: 'S', label: 'Staff' },
];

const f = (
  key: Field['key'],
  label: string,
  type: FieldType,
  options: Partial<Field> = {},
): Field => ({ key, label, type, ...options });

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
    ],
  },
  {
    icon: 'bi-briefcase',
    title: 'Job',
    fields: [
      f('empcat', 'Category', 'radio', { options: CAT }),
      f('empdesig', 'Designation', 'text', { max: 60 }),
      f('emplocsno', 'Location', 'select', {
        lookup: 'locations',
        value: 'locsno',
        text: (x) => x.locnam ?? x.locloc,
      }),
      f('empdepsno', 'Department', 'select', {
        lookup: 'departments',
        value: 'depsno',
        text: (x) => x.depdes ?? x.depdep,
      }),
      f('empsecsno', 'Section', 'select', {
        lookup: 'sections',
        value: 'syssno',
        text: (x) => x.sysdes,
      }),
      f('emparesno', 'Area', 'select', {
        lookup: 'areas',
        value: 'syssno',
        text: (x) => x.sysdes,
      }),
      f('empcossno', 'Cost Center', 'select', {
        lookup: 'costCenters',
        value: 'syssno',
        text: (x) => x.sysrno,
      }),
      f('empbasisno', 'Basis', 'select', {
        lookup: 'basis',
        value: 'syssno',
        text: (x) => x.sysdes,
      }),
      f('empjoin', 'Date Joined', 'date'),
      f('empleft', 'Date Left', 'date'),
      f('empmapcode', 'Map Code', 'int'),
      f('empsts', 'Status', 'text', { max: 1, upper: true }),
      f('empactflg', 'Active', 'radio', { options: YN }),
    ],
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
    ],
  },
  {
    icon: 'bi-bank',
    title: 'Bank',
    fields: [
      f('empbnkacno', 'Bank A/C #', 'text', { max: 30 }),
      f('empbnkcode', 'Bank Code', 'text', { max: 20 }),
      f('empbnkbranch', 'Bank Branch', 'text', { max: 20 }),
      f('empbnkid', 'Bank Id', 'text', { max: 20 }),
    ],
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
    ],
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
    ],
  },
];

const FIELDS = SECTIONS.flatMap((section) =>
  section.fields.filter((x): x is Field => x !== 'break'),
);

type Values = Record<string, string>;

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

function getInitialValues(employee: Employee | null, nextNumber?: number): Values {
  if (!employee) {
    return {
      ...DEFAULTS,
      ...(nextNumber ? { empeno: String(nextNumber) } : {}),
    };
  }

  const values: Values = {};
  for (const field of FIELDS) {
    const raw = employee[field.key as keyof Employee];
    values[field.key] =
      raw === null || raw === undefined ? '' : String(raw).trim();
  }
  return values;
}

function toPayload(values: Values): EmployeeBody {
  const body: Record<string, string | number | null> = {};

  for (const field of FIELDS) {
    if (field.key === 'empeno') continue;

    const value = values[field.key] ?? '';

    if (field.type === 'int' || field.type === 'select') {
      body[field.key] = value === '' ? null : Number.parseInt(value, 10);
    } else if (field.type === 'float') {
      body[field.key] = value === '' ? 0 : Number.parseFloat(value);
    } else if (field.type === 'date') {
      body[field.key] = value === '' ? null : value;
    } else {
      body[field.key] = value.trim();
    }
  }

  return body as EmployeeBody;
}

export default function EmployeeForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const employeeId = id ? Number(id) : null;
  const editing = employeeId !== null;

  const [values, setValues] = useState<Values>({ ...DEFAULTS });
  const [lookups, setLookups] = useState<Lookups | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;

    async function load() {
      setLoading(true);
      setError('');

      try {
        const lookupRequest = getLookups().catch(() => null);
        const employeeRequest = editing
          ? api.get(employeeId!)
          : Promise.resolve(null);
        const numberRequest = editing
          ? Promise.resolve(null)
          : api.nextEmployeeNumber();

        const [lookupData, employee, next] = await Promise.all([
          lookupRequest,
          employeeRequest,
          numberRequest,
        ]);

        if (!alive) return;

        setLookups(lookupData);
        setValues(getInitialValues(employee, next?.empeno));
      } catch (e) {
        if (alive) setError(errMsg(e));
      } finally {
        if (alive) setLoading(false);
      }
    }

    void load();

    return () => {
      alive = false;
    };
  }, [employeeId, editing]);

  const lookupOptions = useMemo(() => {
    return (field: Field) => {
      if (!field.lookup || !lookups) return [];

      const list = lookups[field.lookup] as any[];

      return list.map((row) => ({
        value: String(row[field.value ?? '']),
        label: field.text ? field.text(row) : String(row[field.value ?? '']),
      }));
    };
  }, [lookups]);

  function change(key: string, value: string) {
    setValues((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function onTextChange(
    field: Field,
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) {
    let value = e.target.value;

    if (field.upper) {
      value = value.toUpperCase();
    }

    change(field.key, value);
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError('');

    if (!values.empnam?.trim()) {
      setError('Employee Name is required');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setSaving(true);

    try {
      const body = toPayload(values);

      if (editing) {
        await api.update(employeeId!, body);
      } else {
        await api.create(body);
      }

      navigate('/employees');
    } catch (e) {
      setError(errMsg(e));
      window.scrollTo({ top: 0, behavior: 'smooth' });
      setSaving(false);
    }
  }

  function renderField(field: Field) {
    const value = values[field.key] ?? '';
    const size = field.size ?? 'col-md-6 col-lg-4';

    return (
      <div className={size} key={field.key}>
        <label className="form-label">{field.label}</label>

        {field.type === 'radio' ? (
          <div className="d-flex gap-3 pt-1">
            {(field.options ?? []).map((option) => (
              <div className="form-check" key={option.value}>
                <input
                  className="form-check-input"
                  type="radio"
                  name={field.key}
                  id={`${field.key}-${option.value}`}
                  value={option.value}
                  checked={value === option.value}
                  onChange={(e) => change(field.key, e.target.value)}
                />
                <label
                  className="form-check-label"
                  htmlFor={`${field.key}-${option.value}`}
                >
                  {option.label}
                </label>
              </div>
            ))}
          </div>
        ) : field.type === 'select' ? (
          <select
            className="form-select"
            value={value}
            onChange={(e) => onTextChange(field, e)}
          >
            <option value="">-- Select --</option>
            {lookupOptions(field).map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        ) : (
          <input
            className="form-control"
            type={
              field.type === 'date'
                ? 'date'
                : field.type === 'int' || field.type === 'float'
                  ? 'number'
                  : field.inputType ?? 'text'
            }
            value={value}
            readOnly={field.key === 'empeno'}
            maxLength={field.max}
            step={field.type === 'float' ? '0.01' : field.type === 'int' ? '1' : undefined}
            style={field.upper ? { textTransform: 'uppercase' } : undefined}
            onChange={(e) => onTextChange(field, e)}
          />
        )}
      </div>
    );
  }

  if (loading) {
    return (
      <div className="text-center text-muted py-5">
        <div className="spinner-border text-primary mb-2" />
        <div>Loading...</div>
      </div>
    );
  }

  return (
    <form onSubmit={submit} noValidate>
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-3">
        <div>
          <h4 className="page-title">
            {editing ? 'Edit Employee' : 'Add Employee'}
          </h4>
          <div className="page-sub">Fields marked * are required</div>
        </div>

        <div className="d-flex gap-2">
          <Link to="/employees" className="btn btn-light">
            Cancel
          </Link>

          <button className="btn btn-primary" disabled={saving}>
            {saving ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" />
                Saving...
              </>
            ) : (
              <>
                <i className="bi bi-check-lg me-1" />
                {editing ? 'Update' : 'Save'}
              </>
            )}
          </button>
        </div>
      </div>

      {error && (
        <div className="alert alert-danger py-2">
          <i className="bi bi-exclamation-circle me-1" />
          {error}
        </div>
      )}

      {SECTIONS.map((section) => (
        <div className="card-soft mb-3 fade-in" key={section.title}>
          <div className="card-head">
            <i className={`bi ${section.icon}`} />
            {section.title}
          </div>

          <div className="card-body-pad">
            <div className="row g-3">
              {section.fields.map((field, index) =>
                field === 'break' ? (
                  <div className="w-100" key={`break-${index}`} />
                ) : (
                  renderField(field)
                ),
              )}
            </div>
          </div>
        </div>
      ))}

      <div className="action-bar d-flex justify-content-end gap-2">
        <Link to="/employees" className="btn btn-light">
          Cancel
        </Link>

        <button className="btn btn-primary" disabled={saving}>
          <i className="bi bi-check-lg me-1" />
          {editing ? 'Update' : 'Save'}
        </button>
      </div>
    </form>
  );
}
