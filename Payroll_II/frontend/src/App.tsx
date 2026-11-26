import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { logo } from './assets/index.ts';
import { currentUser, homeFor, logout, refreshUser } from './services/auth.ts';
import { MENU, ROUTES, matchRoute } from './navigation.ts';
import type { Route } from './navigation.ts';
import type { AuthUser, PageContext } from './types.ts';
import { alertBox, errMsg } from './utils/ui.ts';
import { startAutoSelect2, stopAutoSelect2 } from './utils/select2.ts';

export function navigate(path: string, replace = false): void {
    if (replace) history.replaceState({}, '', path);
    else history.pushState({}, '', path);
    window.dispatchEvent(new PopStateEvent('popstate'));
}

interface ResolvedPage {
    route: Route;
    user: AuthUser | null;
    path: string;
    params: string[];
    revision: number;
}

/** Isolates existing imperative widgets from React-owned layout DOM. */
function PageContent({ page }: { page: ResolvedPage }) {
    const container = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const host = container.current!;
        let active = true;
        const ctx: PageContext = { params: page.params, navigate, alive: () => active };
        window.scrollTo(0, 0);
        void page.route.page.render(host, ctx).then(() => {
            if (active) startAutoSelect2(host);
        }).catch((error: unknown) => {
            if (active) host.innerHTML = alertBox(errMsg(error));
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

function Shell({ user, path, children }: { user: AuthUser; path: string; children: ReactNode }) {
    const menuPath = path === '/a_holenter' || path === '/a_holentergrid' ? '/a_holm'
        : path === '/administration/rights' || path === '/inqurgr' ? '/usrenter' : path;
    const current = MENU.find((item) => menuPath.startsWith(item.href));
    return <div className="app-shell">
        <aside className="sidebar">
            <div className="brand"><img src={logo} alt="Mike Flora" /></div>
            <div className="nav-label">Menu</div>
            {MENU.filter((item) => !item.screen || user.access?.[item.screen]?.view).map((item) =>
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

export default function App() {
    const [revision, setRevision] = useState(0);
    const [page, setPage] = useState<ResolvedPage | null>(null);
    const [error, setError] = useState(false);

    useEffect(() => {
        const onPopState = () => setRevision((value) => value + 1);
        const onClick = (event: MouseEvent) => {
            const link = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>('a[data-link]') : null;
            if (!link || event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
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
        async function resolve() {
            const path = location.pathname.replace(/\/+$/, '') || '/';
            let user = currentUser();
            if (user) {
                try { user = await refreshUser(); }
                catch { if (active) setError(true); return; }
            }
            if (!active) return;
            setError(false);
            const home = homeFor(user);
            if (path === '/') { navigate(home, true); return; }
            let matched: Route | undefined;
            let params: string[] = [];
            for (const route of ROUTES) {
                const match = matchRoute(route.path, path);
                if (match.matched) { matched = route; params = match.params; break; }
            }
            if (!matched) { navigate(home, true); return; }
            if (!matched.public && !user) { navigate('/login', true); return; }
            if (matched.public && user) { navigate(home, true); return; }
            if (matched.screen && user && !user.access?.[matched.screen]?.[matched.action ?? 'view']) {
                navigate(home, true); return;
            }
            setPage({ route: matched, user, path, params, revision });
        }
        void resolve();
        return () => { active = false; };
    }, [revision]);

    if (error) return <div className="alert alert-danger m-4">Unable to load your account. Check the server connection and reload.</div>;
    if (!page) return null;
    const content = <PageContent key={page.revision} page={page} />;
    if (page.route.public || !page.user) return content;
    return <Shell user={page.user} path={page.path}>{content}</Shell>;
}
