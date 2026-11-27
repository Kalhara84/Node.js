import type { AuthUser, Screen } from '../types.ts';

/**
 * Sidebar menu item definition.
 * - Add `href` for a clickable page link.
 * - Add `children` for a collapsible group (supports any nesting depth).
 * - Add `screen` to restrict visibility by user rights, or omit to always show.
 * - Add `action: 'logout'` for items that sign out and open the Login page.
 */
export interface MenuItem {
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

/**
 * Edit this array to add, remove, or reorder sidebar items and nested sub-menus.
 */
export const SIDEBAR_MENU: MenuItem[] = [
    {
        id: 'dashboard',
        label: 'Dashboard',
        icon: 'bi-grid-1x2-fill',
        href: '/dashboard',
        title: 'Dashboard',
        sub: 'Overview of your workforce',
        screen: 'dashboard',
    },
    {
        id: 'attendance',
        label: 'Attendance',
        icon: 'bi-calendar-check',
        children: [
            {
                id: 'attendance-master',
                label: 'Master File',
                icon: 'bi-folder2-open',
                children: [
                    {
                        id: 'attendance-employee',
                        label: 'Employee',
                        icon: 'bi-people-fill',
                        href: '/employees',
                        title: 'Employee Master',
                        sub: 'Manage employee records',
                        screen: 'employees',
                    },
                ],
            },
        ],
    },
    {
        id: 'payroll',
        label: 'Payroll',
        icon: 'bi-cash-stack',
        children: [
            {
                id: 'payroll-master',
                label: 'Master File',
                icon: 'bi-folder2-open',
                children: [
                    {
                        id: 'payroll-department',
                        label: 'Department',
                        icon: 'bi-diagram-3',
                        href: '/departments',
                        title: 'Department Master',
                        sub: 'Manage department records',
                    },
                ],
            },
        ],
    },
    {
        id: 'admin',
        label: 'Admin',
        icon: 'bi-shield-lock',
        children: [
            {
                id: 'admin-master',
                label: 'Master File',
                icon: 'bi-folder2-open',
                children: [
                    {
                        id: 'admin-program',
                        label: 'Program',
                        icon: 'bi-grid',
                        href: '/program/programs',
                        title: 'Program Master',
                        sub: 'Modules and program definitions',
                        screen: 'programs',
                    },
                ],
            },
        ],
    },
    {
        id: 'login',
        label: 'Login',
        icon: 'bi-box-arrow-in-right',
        href: '/login',
        title: 'Login',
        sub: 'Sign in to your account',
        action: 'logout',
    },
];

/** Filter menu tree recursively based on the signed-in user's view rights. */
export function filterMenuByAccess(items: MenuItem[], user: AuthUser): MenuItem[] {
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

/** Find the active leaf item and all of its ancestor group IDs for a given path. */
export function findActiveTrail(
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
