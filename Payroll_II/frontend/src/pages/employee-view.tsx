import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { canEmployee } from '../services/auth.ts';
import { api, getLookups } from '../services/api.ts';
import { errMsg, CATEGORY, yn } from '../utils/ui.ts';
import { AlertBox, Loading, confirmModal } from '../components/ui.tsx';
import { Link, useNavigate } from 'react-router-dom';
import type { Employee, Lookups, PageProps, SysItem } from '../types.ts';

// Detail field display helper
function Item({ label, value }: { label: string; value: string | number | null | undefined }) {
    let displayValue: string | number = '-';
    if (value !== null && value !== undefined && value !== '') {
        displayValue = value;
    }
    return (
        <div className="col-6 col-md-4 col-lg-3 detail-item">
            <div className="k">{label}</div>
            <div className="v">{displayValue}</div>
        </div>
    );
}

// Detail card section helper
function Section({ icon, title, children }: { icon: string; title: string; children: ReactNode }) {
    return (
        <div className="card-soft mb-3 fade-in">
            <div className="card-head"><i className={`bi ${icon}`}></i> {title}</div>
            <div className="card-body-pad"><div className="row g-3">{children}</div></div>
        </div>
    );
}

// Lookup description helper
const name = (list: SysItem[] | undefined, key: number | null, field: 'sysdes' | 'sysrno' = 'sysdes'): string | undefined => {
    return list?.find((x) => x.syssno === key)?.[field];
};

type Loaded = { emp: Employee; lookups: Lookups | null };

// Render single employee details view page
export default function EmployeeView({ params }: PageProps) {
    const navigate = useNavigate();
    const id = Number(params[0]);
    const [loaded, setLoaded] = useState<Loaded | null>(null);
    const [loadError, setLoadError] = useState('');
    const [msg, setMsg] = useState('');

    useEffect(() => {
        let cancelled = false;
        Promise.all([
            api.get(id),
            getLookups().catch(() => null)
        ]).then(
            ([emp, lookups]) => {
                if (!cancelled) {
                    setLoaded({ emp, lookups });
                }
            },
            (e) => {
                if (!cancelled) {
                    setLoadError(errMsg(e));
                }
            }
        );
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

    const { emp, lookups } = loaded;
    const statusText = emp.empactflg === 'Y' ? 'Active' : 'Inactive';
    const gender = emp.empmof === 'M' ? 'Male' : emp.empmof === 'F' ? 'Female' : emp.empmof;

    // Handle delete button click
    async function onDelete(): Promise<void> {
        const confirmed = await confirmModal({
            title: 'Delete employee',
            message: `Delete ${emp.empnam} (Emp No ${emp.empeno})? This cannot be undone.`
        });
        if (!confirmed) {
            return;
        }

        try {
            await api.remove(emp.empsno);
            navigate('/employees');
        } catch (e) {
            setMsg(errMsg(e));
        }
    }

    return (
        <>
            <div className="profile-hero d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4 fade-in">
                <div className="d-flex align-items-center gap-3">
                    <span className="avatar">{(emp.empnam || '?').charAt(0).toUpperCase()}</span>
                    <div>
                        <h4>{emp.empnam}</h4>
                        <div className="sub">Emp No {emp.empeno} · {emp.empdesig || 'No designation'}</div>
                        <div className="mt-2 d-flex gap-2 flex-wrap">
                            <span className="badge">{CATEGORY[emp.empcat] ?? emp.empcat}</span>
                            <span className="badge">{statusText}</span>
                            {emp.department_name ? <span className="badge">{emp.department_name}</span> : null}
                        </div>
                    </div>
                </div>
                <div className="d-flex gap-2 flex-wrap">
                    <Link to="/employees" className="btn btn-ghost"><i className="bi bi-arrow-left me-1"></i>Back</Link>
                    {canEmployee('amend') ? (
                        <Link to={`/employees/${emp.empsno}/edit`} className="btn btn-light"><i className="bi bi-pencil me-1"></i>Edit</Link>
                    ) : null}
                    {canEmployee('delete') ? (
                        <button className="btn btn-ghost" id="del" onClick={() => void onDelete()}><i className="bi bi-trash me-1"></i>Delete</button>
                    ) : null}
                </div>
            </div>
            <div id="msg">{msg ? <AlertBox message={msg} /> : null}</div>

            {/* Personal details */}
            <Section icon="bi-person" title="Personal">
                <Item label="Initial" value={emp.empinital} />
                <Item label="Employee Name" value={emp.empnam} />
                <Item label="Sex" value={gender} />
                <Item label="Married" value={yn(emp.empmrdtst)} />
                <Item label="National ID" value={emp.empidno} />
                <Item label="Passport No" value={emp.emppasportno} />
                <Item label="Date of Birth" value={emp.empdob} />
                <Item label="Status" value={emp.empsts} />
            </Section>

            {/* Job & Department details */}
            <Section icon="bi-briefcase" title="Job">
                <Item label="Category" value={CATEGORY[emp.empcat] ?? emp.empcat} />
                <Item label="Designation" value={emp.empdesig} />
                <Item label="Department" value={emp.department_name} />
                <Item label="Location" value={emp.location_name} />
                <Item label="Section" value={name(lookups?.sections, emp.empsecsno)} />
                <Item label="Area" value={name(lookups?.areas, emp.emparesno)} />
                <Item label="Cost Center" value={name(lookups?.costCenters, emp.empcossno, 'sysrno')} />
                <Item label="Basis" value={name(lookups?.basis, emp.empbasisno)} />
                <Item label="Date Joined" value={emp.empjoin} />
                <Item label="Date Left" value={emp.empleft} />
                <Item label="Map Code" value={emp.empmapcode} />
                <Item label="Active" value={yn(emp.empactflg)} />
            </Section>

            {/* Salary and statutory records */}
            <Section icon="bi-cash-stack" title="Salary & Statutory">
                <Item label="Basic Salary" value={emp.empsal} />
                <Item label="E.P.F" value={yn(emp.empepfyn)} />
                <Item label="E.P.F #" value={emp.empepfno} />
                <Item label="PAYE" value={yn(emp.emppayeyn)} />
                <Item label="Tax Table No" value={emp.emptno} />
                <Item label="PAYE Relief" value={emp.empprl} />
                <Item label="Up To Date Gross Earnings" value={emp.empgin} />
                <Item label="Up To Date Tax" value={emp.emptax} />
                <Item label="TIN No" value={emp.emptin} />
                <Item label="Coin Op Bal" value={emp.empcob} />
                <Item label="Service Charge %" value={emp.empscgpcn} />
            </Section>

            {/* Bank information */}
            <Section icon="bi-bank" title="Bank">
                <Item label="Bank A/C #" value={emp.empbnkacno} />
                <Item label="Bank Code" value={emp.empbnkcode} />
                <Item label="Bank Branch" value={emp.empbnkbranch} />
                <Item label="Bank Id" value={emp.empbnkid} />
            </Section>

            {/* Contact details */}
            <Section icon="bi-telephone" title="Contact">
                <Item label="Address" value={[emp.empad1, emp.empad2, emp.empad3, emp.empad4].filter(Boolean).join(', ')} />
                <Item label="Email" value={emp.empemail} />
                <Item label="Telephone" value={emp.emptel} />
            </Section>

            {/* Leave & attendance rules */}
            <Section icon="bi-calendar-check" title="Leave & Flags">
                <Item label="Annual" value={emp.empanual} />
                <Item label="Casual" value={emp.empcasal} />
                <Item label="L/L" value={emp.empleuleu} />
                <Item label="OT" value={yn(emp.empotflg)} />
                <Item label="No Pay" value={yn(emp.empnopflg)} />
                <Item label="Attendance Incentive" value={yn(emp.empattincflg)} />
                <Item label="Late" value={yn(emp.emplateflg)} />
                <Item label="Sat Leave" value={yn(emp.empnsatlflg)} />
            </Section>
        </>
    );
}
