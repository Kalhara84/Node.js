import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { api, getLookups } from '../services/api.ts';
import { errMsg } from '../utils/ui.ts';
import { AlertBox, Loading } from '../components/ui.tsx';
import Select from '../components/Select.tsx';
import { Link, useNavigate } from 'react-router-dom';
import type { EmployeeBody, Lookups, PageProps } from '../types.ts';

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

// Form field (input, radio group or dropdown)
function FieldInput({ fd, value, lookups, onChange }: {
    fd: Field;
    value: string;
    lookups: Lookups | null;
    onChange: (key: FieldKey, value: string) => void;
}) {
    const { key, label, type } = fd;
    const opt = fd.opt ?? {};
    const size = opt.size || 'col-md-6 col-lg-4';
    let input;

    if (type === 'radio') {
        input = (
            <div className="d-flex gap-3 pt-1">
                {(opt.options ?? []).map((o) => (
                    <div className="form-check" key={o.value}>
                        <input
                            className="form-check-input"
                            type="radio"
                            name={key}
                            id={`${key}-${o.value}`}
                            value={o.value}
                            checked={value === o.value}
                            onChange={() => onChange(key, o.value)}
                        />
                        <label className="form-check-label" htmlFor={`${key}-${o.value}`}>{o.label}</label>
                    </div>
                ))}
            </div>
        );
    } else if (type === 'select') {
        const list = ((opt.lookup && lookups?.[opt.lookup]) || []) as unknown as Record<string, unknown>[];
        const valueCol = opt.value ?? '';
        input = (
            <Select name={key} value={value} onChange={(e) => onChange(key, e.target.value)}>
                <option value="">-- Select --</option>
                {list.map((x) => (
                    <option key={String(x[valueCol])} value={String(x[valueCol])}>{opt.text?.(x as never)}</option>
                ))}
            </Select>
        );
    } else {
        const inputType = type === 'date' ? 'date' : (type === 'int' || type === 'float') ? 'number' : (opt.inputType || 'text');
        const step = type === 'float' ? '0.01' : type === 'int' ? '1' : undefined;
        const readOnly = key === 'empeno';

        input = (
            <input
                className="form-control"
                type={inputType}
                name={key}
                value={value}
                step={step}
                maxLength={opt.max}
                style={opt.upper ? { textTransform: 'uppercase' } : undefined}
                readOnly={readOnly}
                aria-readonly={readOnly ? 'true' : undefined}
                onChange={(e) => onChange(key, e.target.value)}
            />
        );
    }

    return <div className={size}><label className="form-label">{label}</label>{input}</div>;
}

// Extract form values into EmployeeBody API payload
function toPayload(values: Values): EmployeeBody {
    const body: Record<string, string | number | null> = {};

    for (const { key, type } of FIELDS) {
        if (key === 'empeno') {
            continue;
        }

        const v = values[key] ?? '';

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

// The form itself (shown after the data has loaded)
function EmployeeFormView({ id, initial, lookups }: { id: number | null; initial: Values; lookups: Lookups | null }) {
    const navigate = useNavigate();
    const [values, setValues] = useState<Values>(initial);
    const [error, setError] = useState('');
    const [saving, setSaving] = useState(false);

    const pageTitle = id !== null ? 'Edit Employee' : 'Add Employee';
    const saveLabel = id !== null ? 'Update' : 'Save';

    const onChange = (key: FieldKey, value: string): void => {
        setValues((prev) => ({ ...prev, [key]: value }));
    };

    // Handle form submit (create or update employee)
    async function onSubmit(e: FormEvent<HTMLFormElement>): Promise<void> {
        e.preventDefault();
        setError('');
        const body = toPayload(values);

        const fail = (m: string): void => {
            setError(m);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        };

        if (!body.empnam) {
            return fail('Employee Name is required');
        }

        setSaving(true);

        try {
            if (id !== null) {
                await api.update(id, body);
            } else {
                await api.create(body);
            }
            navigate('/employees');
        } catch (err) {
            fail(errMsg(err));
            setSaving(false);
        }
    }

    return (
        <form id="emp-form" noValidate onSubmit={(e) => void onSubmit(e)}>
            <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-3">
                <div>
                    <h4 className="page-title">{pageTitle}</h4>
                    <div className="page-sub">Fields marked * are required</div>
                </div>
                <div className="d-flex gap-2">
                    <Link to="/employees" className="btn btn-light">Cancel</Link>
                    <button className="btn btn-primary" disabled={saving}><i className="bi bi-check-lg me-1"></i>{saveLabel}</button>
                </div>
            </div>

            <div id="form-error">{error ? <AlertBox message={error} /> : null}</div>

            {SECTIONS.map((section) => (
                <div className="card-soft mb-3 fade-in" key={section.title}>
                    <div className="card-head"><i className={`bi ${section.icon}`}></i> {section.title}</div>
                    <div className="card-body-pad">
                        <div className="row g-3">
                            {section.fields.map((field, i) => {
                                if (field === 'break') {
                                    return <div className="w-100" key={`break-${i}`}></div>;
                                }
                                return <FieldInput key={field.key} fd={field} value={values[field.key] ?? ''} lookups={lookups} onChange={onChange} />;
                            })}
                        </div>
                    </div>
                </div>
            ))}

            <div className="action-bar d-flex justify-content-end gap-2">
                <Link to="/employees" className="btn btn-light">Cancel</Link>
                <button className="btn btn-primary" disabled={saving}><i className="bi bi-check-lg me-1"></i>{saveLabel}</button>
            </div>
        </form>
    );
}

type Loaded = { values: Values; lookups: Lookups | null };

// Render Add/Edit employee form page
export default function EmployeeForm({ params }: PageProps) {
    const id = params[0] ? Number(params[0]) : null;
    const [loaded, setLoaded] = useState<Loaded | null>(null);
    const [loadError, setLoadError] = useState('');

    useEffect(() => {
        let cancelled = false;

        void (async () => {
            let values: Values = { ...DEFAULTS };

            try {
                const lookupRequest = getLookups().catch(() => null);
                const employeeRequest = id !== null ? api.get(id) : Promise.resolve(null);
                const nextNumberRequest = id === null ? api.nextEmployeeNumber() : Promise.resolve(null);

                const [lk, emp, next] = await Promise.all([
                    lookupRequest,
                    employeeRequest,
                    nextNumberRequest
                ]);

                if (next) {
                    values.empeno = String(next.empeno);
                }

                if (emp) {
                    values = {};
                    for (const { key } of FIELDS) {
                        const raw = emp[key];
                        values[key] = raw !== null && raw !== undefined ? String(raw).trim() : '';
                    }
                }

                if (!cancelled) {
                    setLoaded({ values, lookups: lk });
                }
            } catch (e) {
                if (!cancelled) {
                    setLoadError(errMsg(e));
                }
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [id]);

    if (loadError) {
        return <AlertBox message={loadError} />;
    }

    if (!loaded) {
        return <Loading />;
    }

    return <EmployeeFormView id={id} initial={loaded.values} lookups={loaded.lookups} />;
}
