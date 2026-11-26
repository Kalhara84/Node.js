import type { PageModule, Rights, Screen } from './types.ts';
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
export interface MenuItem {
    href: string;
    label: string;
    icon: string;
    title: string;
    sub: string;
    screen?: Screen;
}

// Navigation menu items
export const MENU: MenuItem[] = [
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
export interface Route {
    path: string;
    page: PageModule;
    public?: boolean;
    screen?: Screen;
    action?: keyof Rights;
}

// Application routes
export const ROUTES: Route[] = [
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
export function matchRoute(routePath: string, currentPath: string): { matched: boolean; params: string[] } {
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

