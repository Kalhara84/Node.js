import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { logo } from '../assets';
import { currentUser, logout } from '../services/auth';

const MENU = [
  {
    href: '/dashboard',
    label: 'Dashboard',
    icon: 'bi-grid-1x2-fill',
    title: 'Dashboard',
    sub: 'Overview of your workforce',
  },
  {
    href: '/employees',
    label: 'Employees',
    icon: 'bi-people-fill',
    title: 'Employee Master',
    sub: 'Manage employee records',
  },
];

export default function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  const user = currentUser();

  if (!user) {
    return null;
  }

  const current = MENU.find((item) => location.pathname.startsWith(item.href));

  function handleLogout() {
    logout();
    navigate('/login', { replace: true });
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <img src={logo} alt="Mike Flora" />
        </div>

        <div className="nav-label">Menu</div>

        {MENU.map((item) => (
          <NavLink
            key={item.href}
            to={item.href}
            className={({ isActive }) =>
              `side-link ${isActive ? 'active' : ''}`
            }
          >
            <i className={`bi ${item.icon}`} />
            {item.label}
          </NavLink>
        ))}

        <div className="sidebar-card">
          <div className="t">Need to add someone?</div>
          <div className="s">Create a new employee record in a minute.</div>
          <Link to="/employees/new" className="btn btn-sm">
            <i className="bi bi-plus-lg me-1" />
            Add employee
          </Link>
        </div>

        <div className="sidebar-foot">Attendance &amp; Payroll System</div>
      </aside>

      <div className="main">
        <header className="topbar">
          <div className="crumb">
            <span>{current?.title ?? 'Payroll System'}</span>
            <small>{current?.sub ?? ''}</small>
          </div>

          <div className="d-flex align-items-center gap-2">
            <div className="user-chip">
              <span
                className="avatar round"
                style={{ width: 34, height: 34, fontSize: '.8rem' }}
              >
                {user.name.charAt(0).toUpperCase()}
              </span>

              <div className="lh-sm d-none d-sm-block">
                <div
                  className="small fw-semibold"
                  style={{ color: 'var(--ink)' }}
                >
                  {user.name}
                </div>
                <div className="text-muted" style={{ fontSize: '.7rem' }}>
                  {user.role || user.username}
                </div>
              </div>
            </div>

            <button
              type="button"
              className="btn btn-outline-secondary icon-btn"
              title="Logout"
              aria-label="Logout"
              onClick={handleLogout}
            >
              <i className="bi bi-box-arrow-right" />
            </button>
          </div>
        </header>

        <main className="content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
