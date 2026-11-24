import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, getLookups } from '../services/api';
import { CATEGORY, confirmModal, errMsg, money, yn } from '../utils/ui';
import type { Employee, Lookups, SysItem } from '../types';

function DetailItem({
  label,
  value,
}: {
  label: string;
  value: string | number | null | undefined;
}) {
  const display =
    value !== null && value !== undefined && value !== '' ? String(value) : '-';

  return (
    <div className="col-6 col-md-4 col-lg-3 detail-item">
      <div className="k">{label}</div>
      <div className="v">{display}</div>
    </div>
  );
}

function Section({
  icon,
  title,
  children,
}: {
  icon: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="card-soft mb-3 fade-in">
      <div className="card-head">
        <i className={`bi ${icon}`} />
        {title}
      </div>
      <div className="card-body-pad">
        <div className="row g-3">{children}</div>
      </div>
    </div>
  );
}

export default function EmployeeView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const employeeId = Number(id);

  const [employee, setEmployee] = useState<Employee | null>(null);
  const [lookups, setLookups] = useState<Lookups | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;

    async function load() {
      setLoading(true);
      setError('');

      try {
        const [emp, lookupData] = await Promise.all([
          api.get(employeeId),
          getLookups().catch(() => null),
        ]);

        if (!alive) return;

        setEmployee(emp);
        setLookups(lookupData);
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
  }, [employeeId]);

  if (loading) {
    return (
      <div className="text-center text-muted py-5">
        <div className="spinner-border text-primary mb-2" />
        <div>Loading employee...</div>
      </div>
    );
  }

  if (error || !employee) {
    return <div className="alert alert-danger py-2">{error || 'Employee not found'}</div>;
  }

  const lookupName = (
    list: SysItem[] | undefined,
    key: number | null,
    field: 'sysdes' | 'sysrno' = 'sysdes',
  ) => list?.find((x) => x.syssno === key)?.[field];

  const gender =
    employee.empmof === 'M'
      ? 'Male'
      : employee.empmof === 'F'
        ? 'Female'
        : employee.empmof;

  async function remove() {
    const ok = await confirmModal({
      title: 'Delete employee',
      message:
        `Delete ${employee.empnam} (Emp No ${employee.empeno})? ` +
        'This cannot be undone.',
    });

    if (!ok) return;

    try {
      await api.remove(employee.empsno);
      navigate('/employees');
    } catch (e) {
      setError(errMsg(e));
    }
  }

  return (
    <>
      {error && <div className="alert alert-danger py-2">{error}</div>}

      <div className="profile-hero d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4 fade-in">
        <div className="d-flex align-items-center gap-3">
          <span className="avatar">
            {employee.empnam.charAt(0).toUpperCase()}
          </span>

          <div>
            <h4>{employee.empnam}</h4>

            <div className="sub">
              Emp No {employee.empeno} ·{' '}
              {employee.empdesig || 'No designation'}
            </div>

            <div className="mt-2 d-flex gap-2 flex-wrap">
              <span className="badge">
                {CATEGORY[employee.empcat] ?? employee.empcat}
              </span>

              <span className="badge">
                {employee.empactflg === 'Y' ? 'Active' : 'Inactive'}
              </span>

              {employee.department_name && (
                <span className="badge">{employee.department_name}</span>
              )}
            </div>
          </div>
        </div>

        <div className="d-flex gap-2 flex-wrap">
          <Link to="/employees" className="btn btn-ghost">
            <i className="bi bi-arrow-left me-1" />
            Back
          </Link>

          <Link
            to={`/employees/${employee.empsno}/edit`}
            className="btn btn-light"
          >
            <i className="bi bi-pencil me-1" />
            Edit
          </Link>

          <button type="button" className="btn btn-ghost" onClick={() => void remove()}>
            <i className="bi bi-trash me-1" />
            Delete
          </button>
        </div>
      </div>

      <Section icon="bi-person" title="Personal">
        <DetailItem label="Initial" value={employee.empinital} />
        <DetailItem label="Employee Name" value={employee.empnam} />
        <DetailItem label="Sex" value={gender} />
        <DetailItem label="Married" value={yn(employee.empmrdtst)} />
        <DetailItem label="National ID" value={employee.empidno} />
        <DetailItem label="Passport No" value={employee.emppasportno} />
        <DetailItem label="Date of Birth" value={employee.empdob} />
        <DetailItem label="Status" value={employee.empsts} />
      </Section>

      <Section icon="bi-briefcase" title="Job">
        <DetailItem label="Category" value={CATEGORY[employee.empcat] ?? employee.empcat} />
        <DetailItem label="Designation" value={employee.empdesig} />
        <DetailItem label="Department" value={employee.department_name} />
        <DetailItem label="Location" value={employee.location_name} />
        <DetailItem label="Section" value={lookupName(lookups?.sections, employee.empsecsno)} />
        <DetailItem label="Area" value={lookupName(lookups?.areas, employee.emparesno)} />
        <DetailItem label="Cost Center" value={lookupName(lookups?.costCenters, employee.empcossno, 'sysrno')} />
        <DetailItem label="Basis" value={lookupName(lookups?.basis, employee.empbasisno)} />
        <DetailItem label="Date Joined" value={employee.empjoin} />
        <DetailItem label="Date Left" value={employee.empleft} />
        <DetailItem label="Map Code" value={employee.empmapcode} />
        <DetailItem label="Active" value={yn(employee.empactflg)} />
      </Section>

      <Section icon="bi-cash-stack" title="Salary & Statutory">
        <DetailItem label="Basic Salary" value={money(employee.empsal, 2)} />
        <DetailItem label="E.P.F" value={yn(employee.empepfyn)} />
        <DetailItem label="E.P.F #" value={employee.empepfno} />
        <DetailItem label="PAYE" value={yn(employee.emppayeyn)} />
        <DetailItem label="Tax Table No" value={employee.emptno} />
        <DetailItem label="PAYE Relief" value={employee.empprl} />
        <DetailItem label="Up To Date Gross Earnings" value={employee.empgin} />
        <DetailItem label="Up To Date Tax" value={employee.emptax} />
        <DetailItem label="TIN No" value={employee.emptin} />
        <DetailItem label="Coin Op Bal" value={employee.empcob} />
        <DetailItem label="Service Charge %" value={employee.empscgpcn} />
      </Section>

      <Section icon="bi-bank" title="Bank">
        <DetailItem label="Bank A/C #" value={employee.empbnkacno} />
        <DetailItem label="Bank Code" value={employee.empbnkcode} />
        <DetailItem label="Bank Branch" value={employee.empbnkbranch} />
        <DetailItem label="Bank Id" value={employee.empbnkid} />
      </Section>

      <Section icon="bi-telephone" title="Contact">
        <DetailItem
          label="Address"
          value={[employee.empad1, employee.empad2, employee.empad3, employee.empad4]
            .filter(Boolean)
            .join(', ')}
        />
        <DetailItem label="Email" value={employee.empemail} />
        <DetailItem label="Telephone" value={employee.emptel} />
      </Section>

      <Section icon="bi-calendar-check" title="Leave & Flags">
        <DetailItem label="Annual" value={employee.empanual} />
        <DetailItem label="Casual" value={employee.empcasal} />
        <DetailItem label="L/L" value={employee.empleuleu} />
        <DetailItem label="OT" value={yn(employee.empotflg)} />
        <DetailItem label="No Pay" value={yn(employee.empnopflg)} />
        <DetailItem label="Attendance Incentive" value={yn(employee.empattincflg)} />
        <DetailItem label="Late" value={yn(employee.emplateflg)} />
        <DetailItem label="Sat Leave" value={yn(employee.empnsatlflg)} />
      </Section>
    </>
  );
}
