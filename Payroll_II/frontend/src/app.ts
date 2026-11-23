// Choose the page for the URL, check the saved login and display the app layout.
import { logo } from './assets/index.ts';
import { currentUser, logout, refreshUser } from './services/auth.ts';
import { esc, qs } from './utils/ui.ts';
import type { AuthUser, PageContext, PageModule } from './types.ts';
import * as login from './pages/login.ts';
import * as dashboard from './pages/dashboard.ts';
import * as employees from './pages/employees.ts';
import * as employeeView from './pages/employee-view.ts';
import * as employeeForm from './pages/employee-form.ts';
import * as administration from './pages/administration.ts';
import * as usrenter from './pages/usrenter.ts';
import * as account from './pages/account.ts';

// Find the empty #root element provided by index.html.
const root = qs(document, '#root');

// Sidebar menu item structure
interface MenuItem {
    href: string;
    label: string;
    icon: string;
    title: string;
    sub: string;
}

// Navigation menu items
// Define sidebar links, their icons and the headings shown for each page.
const MENU: MenuItem[] = [
    { href: '/dashboard', label: 'Dashboard', icon: 'bi-grid-1x2-fill', title: 'Dashboard', sub: 'Overview of your workforce' },
    { href: '/employees', label: 'Employees', icon: 'bi-people-fill', title: 'Employee Master', sub: 'Manage employee records' },
    { href: '/administration/programs', label: 'Programs', icon: 'bi-grid', title: 'Program Master', sub: 'Modules and program definitions' },
    { href: '/administration/users', label: 'Users', icon: 'bi-person-gear', title: 'User Master', sub: 'User profiles and accounts' },
    { href: '/usrenter', label: 'User Rights', icon: 'bi-shield-lock', title: 'User Rights', sub: 'Program access permissions' },
    { href: '/account', label: 'My Account', icon: 'bi-person-lock', title: 'My Account', sub: 'Password and sign-in settings' },
];

// Route definition
interface Route {
    path: string;
    page: PageModule;
    public?: boolean;
}

// Application routes
// Match browser addresses to page modules; only Login is public.
const ROUTES: Route[] = [
    // Public routes (no login required)
    // Use pages/login.ts for /login; this page is open before signing in.
    { path: '/login', page: login, public: true },

    // Main pages
    { path: '/dashboard', page: dashboard },
    { path: '/account', page: account },

    // Employee pages
    { path: '/employees', page: employees },
    { path: '/employees/new', page: employeeForm },
    { path: '/employees/:id', page: employeeView },
    { path: '/employees/:id/edit', page: employeeForm },

    // Administration pages
    { path: '/administration/programs', page: administration },
    { path: '/administration/users', page: administration },
    { path: '/administration/rights', page: usrenter },
    { path: '/usrenter', page: usrenter },
];

// Check if current URL matches a route and extract parameters like :id
function matchRoute(routePath: string, currentPath: string): { matched: boolean; params: string[] } {
    // Split both URLs into sections so each section can be compared.
    const routeParts = routePath.split('/').filter(Boolean);
    const currentParts = currentPath.split('/').filter(Boolean);

    // Reject URLs with a different number of sections.
    if (routeParts.length !== currentParts.length) {
        return { matched: false, params: [] };
    }

    const params: string[] = [];

    for (let i = 0; i < routeParts.length; i++) {
        const rPart = routeParts[i];
        const cPart = currentParts[i];

        // Dynamic parameter like :id
        // Save variable sections such as :id for the selected page to use.
        if (rPart.startsWith(':')) {
            params.push(cPart);
        } else if (rPart !== cPart) {
            return { matched: false, params: [] };
        }
    }

    return { matched: true, params };
}

// Track page changes so slow replies from an old page can be ignored.
let renderId = 0;
let shellShown = false;

// SPA navigation function
// Change the address and show the selected page without a full reload.
export function navigate(path: string, replace = false): void {
    // Replace the current history entry for redirects; otherwise add a new entry.
    if (replace) {
        history.replaceState({}, '', path);
    } else {
        history.pushState({}, '', path);
    }
    void show();
}

// Check menu item access permission for user
function canShowMenuItem(item: MenuItem, user: AuthUser): boolean {
    // My Account is available to every signed-in user.
    if (item.href === '/account') return true;
    // Show administration links only to administrators.
    if (item.href.startsWith('/administration') || item.href === '/usrenter') {
        return !!user.access?.admin;
    }
    return !!user.access?.employees.view;
}

// Main shell layout (Sidebar + Header + Page content)
function shellHtml(user: AuthUser): string {
    // Build only the menu links this user has permission to see.
    const visibleMenuItems = MENU.filter((m) => canShowMenuItem(m, user))
        .map((m) => `<a href="${m.href}" data-link data-menu="${m.href}" class="side-link"><i class="bi ${m.icon}"></i> ${m.label}</a>`)
        .join('');

    // Show the quick Add Employee button only when adding is allowed.
    const addEmployeeBtn = user.access?.employees.add ? `
      <div class="sidebar-card">
        <div class="t">Need to add someone?</div>
        <div class="s">Create a new employee record in a minute.</div>
        <a href="/employees/new" data-link class="btn btn-sm"><i class="bi bi-plus-lg me-1"></i>Add employee</a>
      </div>` : '';

    return `
  <div class="app-shell">
    <aside class="sidebar">
      <div class="brand"><img src="${logo}" alt="Mike Flora" /></div>
      <div class="nav-label">Menu</div>
      ${visibleMenuItems}
      ${addEmployeeBtn}
      <div class="sidebar-foot">Attendance &amp; Payroll System</div>
    </aside>
    <div class="main">
      <header class="topbar">
        <div class="crumb"><span id="crumb-title"></span><small id="crumb-sub"></small></div>
        <div class="d-flex align-items-center gap-2">
          <div class="user-chip">
            <span class="avatar round" style="width:34px;height:34px;font-size:.8rem">${esc(user.name.charAt(0).toUpperCase())}</span>
            <div class="lh-sm d-none d-sm-block">
              <div class="small fw-semibold" style="color:var(--ink)">${esc(user.name)}</div>
              <div class="text-muted" style="font-size:.7rem">${esc(user.role || user.username)}</div>
            </div>
          </div>
          <button class="btn btn-outline-secondary icon-btn" id="logout" title="Logout" aria-label="Logout"><i class="bi bi-box-arrow-right"></i></button>
        </div>
      </header>
      <main class="content" id="page"></main>
    </div>
  </div>`;
}

// Main page rendering function
async function show(): Promise<void> {
    // Mark this page load and read the current address and saved user.
    const id = ++renderId;
    const path = location.pathname.replace(/\/+$/, '') || '/';
    let user = currentUser();

    // Verify session when logged in
    if (user && !shellShown) {
        try {
            // Confirm the saved session and refresh permissions through /auth/me.
            user = await refreshUser();
        } catch {
            root.innerHTML = '<div class="alert alert-danger m-4">Unable to load your account. Check the server connection and reload.</div>';
            return;
        }
        if (id !== renderId) return;
    }

    // Determine default home page
    let homePath = '/login';
    if (user) {
        // Choose Dashboard or My Account based on employee-view permission.
        homePath = user.access?.employees.view ? '/dashboard' : '/account';
    }

    // When the main address opens, redirect to Login or the user's home page.
    if (path === '/') {
        return navigate(homePath, true);
    }

    // Find route matching the current path
    let route: Route | undefined;
    let params: string[] = [];

    for (const r of ROUTES) {
        // Find the matching page and extract URL values such as employee ID.
        const match = matchRoute(r.path, path);
        if (match.matched) {
            route = r;
            params = match.params;
            break;
        }
    }

    // If route not found, redirect to home
    if (!route) {
        return navigate(homePath, true);
    }

    // Redirect to login if unauthenticated on private route
    if (!route.public && !user) {
        return navigate('/login', true);
    }

    // Redirect to home if logged in user visits login page
    if (route.public && user) {
        return navigate(homePath, true);
    }

    // Give pages navigation, URL values and a way to check if they are still open.
    const ctx: PageContext = {
        params,
        navigate,
        alive: () => id === renderId
    };

    // Render public pages without app shell
    if (route.public || !user) {
        shellShown = false;
        root.innerHTML = '';
        // Display the login page without the sidebar and account header.
        await route.page.render(root, ctx);
        return;
    }

    // Render app shell layout once
    if (!shellShown) {
        root.innerHTML = shellHtml(user);
        qs(root, '#logout').onclick = () => {
            // Clear the saved token and user, then return to the login screen.
            logout();
            navigate('/login', true);
        };
        shellShown = true;
    }

    // Update topbar breadcrumbs and active menu state
    const menuPath = path === '/administration/rights' ? '/usrenter' : path;
    const current = MENU.find((m) => menuPath.startsWith(m.href));

    qs(document, '#crumb-title').textContent = current ? current.title : 'Payroll System';
    qs(document, '#crumb-sub').textContent = current ? current.sub : '';

    document.querySelectorAll<HTMLElement>('[data-menu]').forEach((a) => {
        return a.classList.toggle('active', menuPath.startsWith(a.dataset.menu ?? ''));
    });

    // Render target page into page container
    const page = qs(document, '#page');
    page.innerHTML = '';
    // Start the new page at the top, then ask its module to draw the content.
    window.scrollTo(0, 0);
    await route.page.render(page, ctx);
}

// Handle client-side link navigation
document.addEventListener('click', (e) => {
    // Handle app links inside the router; preserve normal Ctrl-click browser actions.
    const a = (e.target as HTMLElement).closest<HTMLAnchorElement>('a[data-link]');
    if (!a || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) {
        return;
    }
    e.preventDefault();
    navigate(a.getAttribute('href') ?? '/');
});

// Handle browser back/forward history buttons
window.addEventListener('popstate', () => {
    return void show();
});

// Initial page load
void show();
