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
import Depm from './pages/depm.tsx';
import Noptrn from './pages/noptrn.tsx';
import Disppays from './pages/disppays.tsx';
import Sysenter from './pages/p_sysenter.tsx';
import sidebarMenuData from './sidebar.json';

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

/**
 * Sidebar menu item definition.
 * - Add `href` for a clickable page link.
 * - Add `children` for a collapsible group (supports any nesting depth).
 * - Add `screen` to restrict visibility by user rights, or omit to always show.
 * - Add `action: 'logout'` for items that sign out and open the Login page.
 */
interface MenuItem {
    id: string;
    label: string;
    icon?: string;
    href?: string;
    title?: string;
    sub?: string;
    screen?: Screen;
    action?: 'logout';
    children?: MenuItem[];
}

// Loaded from sidebar-menu.json (edit that file to add, remove, or reorder sidebar items)
const SIDEBAR_MENU: MenuItem[] = sidebarMenuData as MenuItem[];

// Filter menu tree recursively based on the signed-in user's view rights
function filterMenuByAccess(items: MenuItem[], user: AuthUser): MenuItem[] {
    const result: MenuItem[] = [];

    for (const item of items) {
        if (item.screen && !user.access?.[item.screen]?.view) {
            continue;
        }

        if (item.children) {
            const visibleChildren = filterMenuByAccess(item.children, user);
            if (visibleChildren.length === 0) {
                continue;
            }
            result.push({ ...item, children: visibleChildren });
        } else {
            result.push(item);
        }
    }

    return result;
}

// Find the active leaf item and all of its ancestor group IDs for a given path
function findActiveTrail(
    items: MenuItem[],
    menuPath: string,
    ancestors: string[] = []
): { activeItem: MenuItem | null; ancestorIds: string[] } {
    for (const item of items) {
        if (item.href && item.action !== 'logout' && menuPath.startsWith(item.href)) {
            return { activeItem: item, ancestorIds: ancestors };
        }
        if (item.children) {
            const found = findActiveTrail(item.children, menuPath, [...ancestors, item.id]);
            if (found.activeItem) {
                return found;
            }
        }
    }
    return { activeItem: null, ancestorIds: [] };
}

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

    // Department master page
    { path: '/departments', page: Depm, screen: 'depm' },
    { path: '/depm', page: Depm, screen: 'depm' },

    // Direct transaction entry page
    { path: '/noptrn', page: Noptrn, screen: 'noptrn' },
    { path: '/disppays', page: Disppays, screen: 'disppays' },
    { path: '/sysenter', page: Sysenter, screen: 'sysenter' },

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

// Recursive sidebar item (supports direct links, logout action, and collapsible nested groups)
function SidebarNode({
    item,
    menuPath,
    openIds,
    ancestorSet,
    onToggle,
    onLogout,
}: {
    item: MenuItem;
    menuPath: string;
    openIds: Record<string, boolean>;
    ancestorSet: Set<string>;
    onToggle: (id: string) => void;
    onLogout: () => void;
}) {
    const icon = item.icon ? <i className={`bi ${item.icon}`}></i> : null;

    if (item.children) {
        const isOpen = !!openIds[item.id];
        const hasActive = ancestorSet.has(item.id);
        return (
            <div className="side-group">
                <button
                    type="button"
                    className={`side-link side-group-btn${hasActive ? ' has-active' : ''}`}
                    aria-expanded={isOpen}
                    onClick={() => onToggle(item.id)}
                >
                    <span className="side-link-main">
                        {icon}
                        <span>{item.label}</span>
                    </span>
                    <i className={`bi bi-chevron-${isOpen ? 'down' : 'right'} side-chevron`}></i>
                </button>
                {isOpen ? (
                    <div className="side-children">
                        {item.children.map((child) => (
                            <SidebarNode
                                key={child.id}
                                item={child}
                                menuPath={menuPath}
                                openIds={openIds}
                                ancestorSet={ancestorSet}
                                onToggle={onToggle}
                                onLogout={onLogout}
                            />
                        ))}
                    </div>
                ) : null}
            </div>
        );
    }

    if (item.action === 'logout') {
        return (
            <button type="button" className="side-link side-group-btn" onClick={onLogout}>
                <span className="side-link-main">
                    {icon}
                    <span>{item.label}</span>
                </span>
            </button>
        );
    }

    const href = item.href ?? '#';
    const isActive = menuPath.startsWith(href);
    return (
        <Link to={href} data-menu={href} className={`side-link${isActive ? ' active' : ''}`}>
            {icon}
            <span>{item.label}</span>
        </Link>
    );
}

// Main shell layout (Sidebar + Header + Page content)
function Shell({ user, path, children }: { user: AuthUser; path: string; children: ReactNode }) {
    const navigate = useNavigate();

    // Update topbar breadcrumbs and active menu state
    const menuPath = path === '/a_holenter' || path === '/a_holentergrid' ? '/a_holm' : path === '/program/rights' || path === '/inqurgr' ? '/usrenter' : path;
    const visibleMenu = filterMenuByAccess(SIDEBAR_MENU, user);
    const { activeItem: current, ancestorIds } = findActiveTrail(visibleMenu, menuPath);
    const ancestorKey = ancestorIds.join(',');

    const [openIds, setOpenIds] = useState<Record<string, boolean>>(() => {
        const initial: Record<string, boolean> = {};
        for (const id of ancestorIds) {
            initial[id] = true;
        }
        return initial;
    });

    useEffect(() => {
        if (!ancestorKey) return;
        setOpenIds((prev) => {
            const next = { ...prev };
            for (const id of ancestorKey.split(',')) {
                next[id] = true;
            }
            return next;
        });
    }, [ancestorKey]);

    const toggleGroup = useCallback((id: string) => {
        setOpenIds((prev) => ({ ...prev, [id]: !prev[id] }));
    }, []);

    const handleLogout = useCallback(() => {
        logout();
        navigate('/login', { replace: true });
    }, [navigate]);

    const ancestorSet = new Set(ancestorIds);

    return (
        <div className="app-shell">
            <aside className="sidebar">
                <div className="brand"><img src={logo} alt="Mike Flora" /></div>
                <div className="nav-label">Menu</div>
                <nav className="side-nav">
                    {visibleMenu.map((item) => (
                        <SidebarNode
                            key={item.id}
                            item={item}
                            menuPath={menuPath}
                            openIds={openIds}
                            ancestorSet={ancestorSet}
                            onToggle={toggleGroup}
                            onLogout={handleLogout}
                        />
                    ))}
                </nav>
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
