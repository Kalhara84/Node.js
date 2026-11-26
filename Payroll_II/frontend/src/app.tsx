import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { logo } from './assets/index.ts';
import { currentUser, homeFor, logout, refreshUser } from './services/auth.ts';
import type { AuthUser, PageContext, PageModule, Rights, Screen } from './types.ts';
import { alertBox, errMsg } from './utils/ui.ts';
import { startAutoSelect2, stopAutoSelect2 } from './utils/select2.ts';

import * as login from './pages/login.ts';
import * as dashboard from './pages/dashboard.ts';
import * as employees from './pages/employees.ts';
import * as employeesTable from './pages/employees-table.ts';
import * as employeeView from './pages/employee-view.ts';
import * as employeeForm from './pages/employee-form.ts';
import * as administration from './pages/administration.ts';
import * as attendance from './pages/attendance.ts';
import * as holidays from './pages/holidays.ts';
import * as holentergri from './pages/holentergri.ts';
import * as usrenter from './pages/usrenter.ts';
import * as inqurgr from './pages/inqurgr.ts';
import * as account from './pages/account.ts';
import * as inqurgr2 from './pages/inqurgr2.ts'
import * as blank from './pages/blank.ts';

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
    { href: '/administration/programs', label: 'Programs', icon: 'bi-grid', title: 'Program Master', sub: 'Modules and program definitions', screen: 'programs' },
    { href: '/administration/users', label: 'Users', icon: 'bi-person-gear', title: 'User Master', sub: 'User profiles and accounts', screen: 'users' },
    { href: '/usrenter', label: 'User Rights', icon: 'bi-shield-lock', title: 'User Rights', sub: 'Program access permissions', screen: 'rights' },
    { href: '/account', label: 'My Account', icon: 'bi-person-lock', title: 'My Account', sub: 'Password and sign-in settings' },

    { href: '/blank', label: 'Blank Page', icon: 'bi-file-earmark', title: 'Blank  Page', sub: 'Blank  Page' , screen:'blank'},
];

// Route definition
interface Route {
    path: string;
    page: PageModule;
    public?: boolean;
    screen?: Screen;
    action?: keyof Rights;
}

// Application routes
const ROUTES: Route[] = [
    { path: '/a_holm', page: holidays, screen: 'a_holm' },
    { path: '/a_holenter', page: holidays, screen: 'a_holm' },
    { path: '/a_holentergrid', page: holentergri, screen: 'a_holm', action: 'add' },
    { path: '/a_inqempatt', page: attendance, screen: 'a_inqempatt' },
    // Public routes (no login required)
    { path: '/login', page: login, public: true },

    // Main pages
    { path: '/dashboard', page: dashboard, screen: 'dashboard' },
    { path: '/account', page: account },

    // Employee pages
    { path: '/employees', page: employees, screen: 'employees' },
    { path: '/employees/new', page: employeeForm, screen: 'employees', action: 'add' },
    { path: '/employees/view', page: employeesTable, screen: 'employees' },
    { path: '/employees/:id', page: employeeView, screen: 'employees' },
    { path: '/employees/:id/edit', page: employeeForm, screen: 'employees', action: 'amend' },

    // Administration pages
    { path: '/administration/programs', page: administration, screen: 'programs' },
    { path: '/administration/users', page: administration, screen: 'users' },

    { path: '/administration/rights', page: usrenter, screen: 'rights' },
    { path: '/usrenter', page: usrenter, screen: 'rights' },
    { path: '/inqurgr', page: inqurgr, screen: 'rights' },
    {path: '/inqurgr2', page: inqurgr2, screen: 'rights' },

    //Blank Page
    {path:'/blank',page:blank},
];

// Check if current URL matches a route and extract parameters like :id
function matchRoute(routePath: string, currentPath: string): { matched: boolean; params: string[] } {
    const routeParts = routePath.split('/').filter(Boolean);
    const currentParts = currentPath.split('/').filter(Boolean);

    if (routeParts.length !== currentParts.length) {
        return { matched: false, params: [] };
    }

    const params: string[] = [];

    for (let i = 0; i < routeParts.length; i++) {
        const rPart = routeParts[i];
        const cPart = currentParts[i];

        // Dynamic parameter like :id
        if (rPart.startsWith(':')) {
            params.push(cPart);
        } else if (rPart !== cPart) {
            return { matched: false, params: [] };
        }
    }

    return { matched: true, params };
}

// SPA navigation function
export function navigate(path: string, replace = false): void {
    if (replace) {
        history.replaceState({}, '', path);
    } else {
        history.pushState({}, '', path);
    }
    window.dispatchEvent(new PopStateEvent('popstate'));
}

interface ResolvedPage {
    route: Route;
    user: AuthUser | null;
    path: string;
    params: string[];
    revision: number;
}

// Render the current page and clean up its dropdowns when navigating away
function PageContent({ page }: { page: ResolvedPage }) {
    const container = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const host = container.current!;
        let active = true;
        const ctx: PageContext = { params: page.params, navigate, alive: () => active };
        window.scrollTo(0, 0);
        void page.route.page.render(host, ctx).then(() => {
            if (active) {
                startAutoSelect2(host);
            }
        }).catch((error: unknown) => {
            if (active) {
                host.innerHTML = alertBox(errMsg(error));
            }
        });
        return () => {
            active = false;
            stopAutoSelect2(host);
        };
    }, [page]);
    // display:contents preserves the original layout while giving each page
    // a fresh event-listener boundary when the route changes.
    return <div ref={container} style={{ display: 'contents' }} />;
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
    const menuPath = path === '/a_holenter' || path === '/a_holentergrid' ? '/a_holm'
        : path === '/administration/rights' || path === '/inqurgr' ? '/usrenter' : path;
    const current = MENU.find((item) => menuPath.startsWith(item.href));
    return <div className="app-shell">
        <aside className="sidebar">
            <div className="brand"><img src={logo} alt="Mike Flora" /></div>
            <div className="nav-label">Menu</div>
            {MENU.filter((item) => canShowMenuItem(item, user)).map((item) =>
                <a key={item.href} href={item.href} data-link data-menu={item.href}
                    className={`side-link${menuPath.startsWith(item.href) ? ' active' : ''}`}>
                    <i className={`bi ${item.icon}`} /> {item.label}
                </a>)}
            {user.access?.employees?.add && <div className="sidebar-card">
                <div className="t">Need to add someone?</div>
                <div className="s">Create a new employee record in a minute.</div>
                <a href="/employees/new" data-link className="btn btn-sm"><i className="bi bi-plus-lg me-1" />Add employee</a>
            </div>}
            <div className="sidebar-foot">Attendance &amp; Payroll System</div>
        </aside>
        <div className="main">
            <header className="topbar">
                <div className="crumb"><span id="crumb-title">{current?.title ?? 'Payroll System'}</span><small id="crumb-sub">{current?.sub ?? ''}</small></div>
                <div className="d-flex align-items-center gap-2">
                    <div className="user-chip">
                        <span className="avatar round" style={{ width: 34, height: 34, fontSize: '.8rem' }}>{user.name.charAt(0).toUpperCase()}</span>
                        <div className="lh-sm d-none d-sm-block">
                            <div className="small fw-semibold" style={{ color: 'var(--ink)' }}>{user.name}</div>
                            <div className="text-muted" style={{ fontSize: '.7rem' }}>{user.role || user.username}</div>
                        </div>
                    </div>
                    <button className="btn btn-outline-secondary icon-btn" id="logout" title="Logout" aria-label="Logout"
                        onClick={() => { logout(); navigate('/login', true); }}><i className="bi bi-box-arrow-right" /></button>
                </div>
            </header>
            <main className="content" id="page">{children}</main>
        </div>
    </div>;
}

// Main application rendering and client-side navigation
export default function App() {
    const [revision, setRevision] = useState(0);
    const [page, setPage] = useState<ResolvedPage | null>(null);
    const [error, setError] = useState(false);

    useEffect(() => {
        const onPopState = () => setRevision((value) => value + 1);
        const onClick = (event: MouseEvent) => {
            const link = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>('a[data-link]') : null;
            if (!link || event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) {
                return;
            }
            event.preventDefault();
            navigate(link.getAttribute('href') ?? '/');
        };
        window.addEventListener('popstate', onPopState);
        document.addEventListener('click', onClick);
        return () => {
            window.removeEventListener('popstate', onPopState);
            document.removeEventListener('click', onClick);
        };
    }, []);

    useEffect(() => {
        let active = true;
        async function show(): Promise<void> {
            const path = location.pathname.replace(/\/+$/, '') || '/';
            let user = currentUser();
            if (user) {
                try {
                    user = await refreshUser();
                } catch {
                    if (active) {
                        setError(true);
                    }
                    return;
                }
            }
            if (!active) {
                return;
            }
            setError(false);
            const home = homeFor(user);
            if (path === '/') {
                return navigate(home, true);
            }
            let matched: Route | undefined;
            let params: string[] = [];
            for (const route of ROUTES) {
                const match = matchRoute(route.path, path);
                if (match.matched) {
                    matched = route;
                    params = match.params;
                    break;
                }
            }
            if (!matched) {
                return navigate(home, true);
            }
            if (!matched.public && !user) {
                return navigate('/login', true);
            }
            if (matched.public && user) {
                return navigate(home, true);
            }
            if (matched.screen && user && !user.access?.[matched.screen]?.[matched.action ?? 'view']) {
                return navigate(home, true);
            }
            setPage({ route: matched, user, path, params, revision });
        }
        void show();
        return () => {
            active = false;
        };
    }, [revision]);

    if (error) {
        return <div className="alert alert-danger m-4">Unable to load your account. Check the server connection and reload.</div>;
    }
    if (!page) {
        return null;
    }
    const content = <PageContent key={page.revision} page={page} />;
    if (page.route.public || !page.user) {
        return content;
    }
    return <Shell user={page.user} path={page.path}>{content}</Shell>;
}
