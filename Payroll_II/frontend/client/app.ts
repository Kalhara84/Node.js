import { currentUser, logout } from './auth.js';
import { esc, qs } from './ui.js';
import type { AuthUser, PageContext, PageModule } from './types.js';
import * as login from './pages/login.js';
import * as dashboard from './pages/dashboard.js';
import * as employees from './pages/employees.js';
import * as employeeView from './pages/employee-view.js';
import * as employeeForm from './pages/employee-form.js';
const root = qs(document, '#root');
interface MenuItem {
    href: string;
    label: string;
    icon: string;
    title: string;
    sub: string;
}
const MENU: MenuItem[] = [
    { href: '/dashboard', label: 'Dashboard', icon: 'bi-grid-1x2-fill', title: 'Dashboard', sub: 'Overview of your workforce' },
    { href: '/employees', label: 'Employees', icon: 'bi-people-fill', title: 'Employee Master', sub: 'Manage employee records' },
];
interface Route {
    re: RegExp;
    page: PageModule;
    public?: boolean;
}
// path -> page module
const ROUTES: Route[] = [
    { re: /^\/login$/, page: login, public: true },
    { re: /^\/dashboard$/, page: dashboard },
    { re: /^\/employees$/, page: employees },
    { re: /^\/employees\/new$/, page: employeeForm },
    { re: /^\/employees\/(\d+)$/, page: employeeView },
    { re: /^\/employees\/(\d+)\/edit$/, page: employeeForm },
];
let renderId = 0;
let shellShown = false;
export function navigate(path: string, replace = false): void {
    if (replace) {
        history.replaceState({}, '', path);
    } else {
        history.pushState({}, '', path);
    }
    void show();
}
function shellHtml(user: AuthUser): string {
    return `
  <div class="app-shell">
    <aside class="sidebar">
      <div class="brand"><img src="/assets/logo.jpg" alt="Mike Flora" /></div>
      <div class="nav-label">Menu</div>
      ${MENU.map((m) => {
        return `<a href="${m.href}" data-link data-menu="${m.href}" class="side-link"><i class="bi ${m.icon}"></i> ${m.label}</a>`;
    }).join('')}
      <div class="sidebar-card">
        <div class="t">Need to add someone?</div>
        <div class="s">Create a new employee record in a minute.</div>
        <a href="/employees/new" data-link class="btn btn-sm"><i class="bi bi-plus-lg me-1"></i>Add employee</a>
      </div>
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
async function show(): Promise<void> {
    const id = ++renderId;
    const path = location.pathname.replace(/\/+$/, '') || '/';
    const user = currentUser();
    let homePath = '/login';
    if (user) {
        homePath = '/dashboard';
    }
    if (path === '/') {
        return navigate(homePath, true);
    }
    let route: Route | undefined;
    let params: string[] = [];
    for (const r of ROUTES) {
        const m = path.match(r.re);
        if (m) {
            route = r;
            params = m.slice(1);
            break;
        }
    }
    if (!route) {
        return navigate(homePath, true);
    }
    if (!route.public && !user) {
        return navigate('/login', true);
    }
    if (route.public && user) {
        return navigate('/dashboard', true);
    }
    const ctx: PageContext = { params, navigate, alive: () => {
            return id === renderId;
        } };
    if (route.public || !user) {
        shellShown = false;
        root.innerHTML = '';
        await route.page.render(root, ctx);
        return;
    }
    if (!shellShown) {
        root.innerHTML = shellHtml(user);
        qs(root, '#logout').onclick = () => {
            logout();
            navigate('/login', true);
        };
        shellShown = true;
    }
    const current = MENU.find((m) => {
        return path.startsWith(m.href);
    });
    if (current) {
        qs(document, '#crumb-title').textContent = current.title;
    }
    else {
        qs(document, '#crumb-title').textContent = 'Payroll System';
    }
    if (current) {
        qs(document, '#crumb-sub').textContent = current.sub;
    }
    else {
        qs(document, '#crumb-sub').textContent = '';
    }
    document.querySelectorAll<HTMLElement>('[data-menu]').forEach((a) => {
        return a.classList.toggle('active', path.startsWith(a.dataset.menu ?? ''));
    });
    const page = qs(document, '#page');
    page.innerHTML = '';
    window.scrollTo(0, 0);
    await route.page.render(page, ctx);
}
// internal links: no full page reload
document.addEventListener('click', (e) => {
    const a = (e.target as HTMLElement).closest<HTMLAnchorElement>('a[data-link]');
    if (!a || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) {
        return;
    }
    e.preventDefault();
    navigate(a.getAttribute('href') ?? '/');
});
window.addEventListener('popstate', () => {
    return void show();
});
void show();
