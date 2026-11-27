import { useCallback, useEffect, useRef, useState } from 'react';
import type { ComponentType, ReactNode } from 'react';
import { logo } from './assets/index.ts';
import { currentUser, logout, refreshUser, homeFor } from './services/auth.ts';
import { BrowserRouter, Link, matchRoutes, useLocation, useNavigate } from 'react-router-dom';
import type { AuthUser, PageProps, Rights, Screen } from './types.ts';
import Login from './pages/login.tsx';
import Dashboard from './pages/dashboard.tsx';
import Employees from './pages/employees.tsx';
import EmployeesTable from './pages/employees-table.tsx';
import EmployeeView from './pages/employee-view.tsx';
import EmployeeForm from './pages/employee-form.tsx';
import Program from './pages/program.tsx';
import Attendance from './pages/attendance.tsx';
import Holidays from './pages/holidays.tsx';
import Holentergri from './pages/holentergri.tsx';
import Usrenter from './pages/usrenter.tsx';
import Inqurgr from './pages/inqurgr.tsx';
import Account from './pages/account.tsx';
import Inqurgr2 from './pages/inqurgr2.tsx';
import Blank from './pages/blank.tsx';

// Same idea as the old ctx.alive(): false once the page was left (ignore late API answers)
export function useAlive(): () => boolean {
    const ref = useRef(true);
    useEffect(() => {
        ref.current = true;
        return () => {
            ref.current = false;
        };
    }, []);
    return useCallback(() => ref.current, []);
}

// Sidebar menu item structure
interface MenuItem {
    href: string;
    label: string;
    icon: string;
    title: string;
    sub: string;
    screen?: Screen;
}

// Navigation menu items
const MENU: MenuItem[] = [
    { href: '/dashboard', label: 'Dashboard', icon: 'bi-grid-1x2-fill', title: 'Dashboard', sub: 'Overview of your workforce', screen: 'dashboard' },
    { href: '/employees', label: 'Employees', icon: 'bi-people-fill', title: 'Employee Master', sub: 'Manage employee records', screen: 'employees' },
    { href: '/a_inqempatt', label: 'Attendance', icon: 'bi-calendar-check', title: 'Attendance Correction', sub: 'Employee attendance, overtime and late minutes', screen: 'a_inqempatt' },
    { href: '/a_holm', label: 'Holidays', icon: 'bi-calendar-event', title: 'Holiday Master', sub: 'Holiday dates, types and overtime rates', screen: 'a_holm' },
    { href: '/program/programs', label: 'Programs', icon: 'bi-grid', title: 'Program Master', sub: 'Modules and program definitions', screen: 'programs' },
    { href: '/program/users', label: 'Users', icon: 'bi-person-gear', title: 'User Master', sub: 'User profiles and accounts', screen: 'users' },
    { href: '/usrenter', label: 'User Rights', icon: 'bi-shield-lock', title: 'User Rights', sub: 'Program access permissions', screen: 'rights' },
    { href: '/account', label: 'My Account', icon: 'bi-person-lock', title: 'My Account', sub: 'Password and sign-in settings' },

    { href: '/blank', label: 'Blank Page', icon: 'bi-file-earmark', title: 'Blank  Page', sub: 'Blank  Page', screen: 'blank' },
];

// Route definition
interface Route {
    path: string;
    page: ComponentType<PageProps>;
    public?: boolean;
    screen?: Screen;
    requiredAction?: keyof Rights;
}

// Application routes
const ROUTES: Route[] = [
    { path: '/a_holm', page: Holidays, screen: 'a_holm' },
    { path: '/a_holenter', page: Holidays, screen: 'a_holm' },
    { path: '/a_holentergrid', page: Holentergri, screen: 'a_holm', requiredAction: 'add' },
    { path: '/a_inqempatt', page: Attendance, screen: 'a_inqempatt' },
    // Public routes (no login required)
    { path: '/login', page: Login, public: true },

    // Main pages
    { path: '/dashboard', page: Dashboard, screen: 'dashboard' },
    { path: '/account', page: Account },

    // Employee pages
    { path: '/employees', page: Employees, screen: 'employees' },
    { path: '/employees/new', page: EmployeeForm, screen: 'employees', requiredAction: 'add' },
    { path: '/employees/view', page: EmployeesTable, screen: 'employees' },
    { path: '/employees/:id', page: EmployeeView, screen: 'employees' },
    { path: '/employees/:id/edit', page: EmployeeForm, screen: 'employees', requiredAction: 'amend' },

    // Program pages
    { path: '/program/programs', page: Program, screen: 'programs' },
    { path: '/program/users', page: Program, screen: 'users' },

    { path: '/program/rights', page: Usrenter, screen: 'rights' },
    { path: '/usrenter', page: Usrenter, screen: 'rights' },
    { path: '/inqurgr', page: Inqurgr, screen: 'rights' },
    { path: '/inqurgr2', page: Inqurgr2, screen: 'rights' },

    //Blank Page
    { path: '/blank', page: Blank },
];

// What is currently shown (set after the route, login and rights checks pass)
interface View {
    key: string;
    path: string;
    route: Route;
    params: string[];
    user: AuthUser | null;
}

// Check menu item access permission for user
function canShowMenuItem(item: MenuItem, user: AuthUser): boolean {
    if (!item.screen) {
        return true;
    }
    return !!user.access?.[item.screen]?.view;
}

// Main shell layout (Sidebar + Header + Page content)
function Shell({ user, path, children }: { user: AuthUser; path: string; children: ReactNode }) {
    const navigate = useNavigate();

    // Update topbar breadcrumbs and active menu state
    const menuPath = path === '/a_holenter' || path === '/a_holentergrid' ? '/a_holm' : path === '/program/rights' || path === '/inqurgr' ? '/usrenter' : path;
    const current = MENU.find((m) => menuPath.startsWith(m.href));

    return (
        <div className="app-shell">
            <aside className="sidebar">
                <div className="brand"><img src={logo} alt="Mike Flora" /></div>
                <div className="nav-label">Menu</div>
                {MENU.filter((m) => canShowMenuItem(m, user)).map((m) => (
                    <Link
                        key={m.href}
                        to={m.href}
                        data-menu={m.href}
                        className={`side-link${menuPath.startsWith(m.href) ? ' active' : ''}`}
                    >
                        <i className={`bi ${m.icon}`}></i> {m.label}
                    </Link>
                ))}
                {user.access?.employees?.add ? (
                    <div className="sidebar-card">
                        <div className="t">Need to add someone?</div>
                        <div className="s">Create a new employee record in a minute.</div>
                        <Link to="/employees/new" className="btn btn-sm"><i className="bi bi-plus-lg me-1"></i>Add employee</Link>
                    </div>
                ) : null}
                <div className="sidebar-foot">Attendance &amp; Payroll System</div>
            </aside>
            <div className="main">
                <header className="topbar">
                    <div className="crumb">
                        <span id="crumb-title">{current ? current.title : 'Payroll System'}</span>
                        <small id="crumb-sub">{current ? current.sub : ''}</small>
                    </div>
                    <div className="d-flex align-items-center gap-2">
                        <div className="user-chip">
                            <span className="avatar round" style={{ width: '34px', height: '34px', fontSize: '.8rem' }}>{user.name.charAt(0).toUpperCase()}</span>
                            <div className="lh-sm d-none d-sm-block">
                                <div className="small fw-semibold" style={{ color: 'var(--ink)' }}>{user.name}</div>
                                <div className="text-muted" style={{ fontSize: '.7rem' }}>{user.role || user.username}</div>
                            </div>
                        </div>
                        <button
                            className="btn btn-outline-secondary icon-btn"
                            id="logout"
                            title="Logout"
                            aria-label="Logout"
                            onClick={() => {
                                logout();
                                navigate('/login', { replace: true });
                            }}
                        >
                            <i className="bi bi-box-arrow-right"></i>
                        </button>
                    </div>
                </header>
                <main className="content" id="page">{children}</main>
            </div>
        </div>
    );
}

// Scroll to the top every time a page is shown
function PageHost({ view }: { view: View }) {
    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    const Page = view.route.page;
    return <Page params={view.params} />;
}

function AppRoutes() {
    const location = useLocation();
    const navigate = useNavigate();
    const [view, setView] = useState<View | null>(null);
    const [failed, setFailed] = useState(false);

    // Same checks as the old show(): session, route, login and rights
    useEffect(() => {
        let cancelled = false;

        void (async () => {
            const path = location.pathname.replace(/\/+$/, '') || '/';
            let user = currentUser();

            // Verify session when logged in
            if (user) {
                try {
                    user = await refreshUser();
                } catch {
                    if (!cancelled) {
                        setFailed(true);
                    }
                    return;
                }
                if (cancelled) {
                    return;
                }
            }

            // Determine default home page
            let homePath = '/login';
            if (user) {
                homePath = homeFor(user);
            }
            if (path === '/') {
                return navigate(homePath, { replace: true });
            }

            // Find route matching the current path
            const match = matchRoutes(ROUTES, path)?.[0];
            const route = match?.route;
            const params = route
                ? route.path.split('/').filter((part) => part.startsWith(':')).map((part) => match?.params[part.slice(1)] ?? '')
                : [];

            // If route not found, redirect to home
            if (!route) {
                return navigate(homePath, { replace: true });
            }

            // Redirect to login if unauthenticated on private route
            if (!route.public && !user) {
                return navigate('/login', { replace: true });
            }

            // Redirect to home if logged in user visits login page
            if (route.public && user) {
                return navigate(homePath, { replace: true });
            }

            // The user must have the right on the screen (rights come from the database)
            if (route.screen && user && !user.access?.[route.screen]?.[route.requiredAction ?? 'view']) {
                return navigate(homePath, { replace: true });
            }

            setFailed(false);
            setView({ key: location.key, path, route, params, user });
        })();

        return () => {
            cancelled = true;
        };
    }, [location, navigate]);

    if (failed) {
        return <div className="alert alert-danger m-4">Unable to load your account. Check the server connection and reload.</div>;
    }

    if (!view) {
        return null;
    }

    // Public pages have no app shell
    if (view.route.public || !view.user) {
        return <PageHost key={view.key} view={view} />;
    }

    return (
        <Shell user={view.user} path={view.path}>
            <PageHost key={view.key} view={view} />
        </Shell>
    );
}

export default function App() {
    return (
        <BrowserRouter>
            <AppRoutes />
        </BrowserRouter>
    );
}
