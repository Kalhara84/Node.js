import { api, TOKEN_KEY, USER_KEY, request } from './api.ts';
import type { AuthUser, Rights, Screen } from '../types.ts';

// Get current logged-in user from localStorage
export function currentUser(): AuthUser | null {
    try {
        if (!localStorage.getItem(TOKEN_KEY)) {
            return null;
        }
        return JSON.parse(localStorage.getItem(USER_KEY) || 'null') as AuthUser | null;
    } catch {
        return null;
    }
}

// Authenticate user and persist credentials
export async function login(username: string, password: string): Promise<AuthUser> {
    const res = await api.login(username, password);
    localStorage.setItem(TOKEN_KEY, res.token);
    localStorage.setItem(USER_KEY, JSON.stringify(res.user));
    return res.user;
}

// Log out user and clear stored token and profile
export function logout(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
}

// Refresh current user permissions from backend /auth/me
export async function refreshUser(): Promise<AuthUser> {
    const result = await request<AuthUser>('/auth/me');
    const user = { ...currentUser(), ...result };
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    return user;
}

// Check employee permission flags (view, add, amend, delete)
export function canEmployee(action: 'view' | 'add' | 'amend' | 'delete'): boolean {
    return can('employees', action);
}

// Check the user's right (view, add, amend, delete) on a screen
export function can(screen: Screen, action: keyof Rights = 'view'): boolean {
    return currentUser()?.access?.[screen]?.[action] === true;
}

// First page the user is allowed to open after sign-in
export function homeFor(user: AuthUser | null): string {
    if (!user) {
        return '/login';
    }
    // if(user.access?.rights?.view){
    //     return '/blank'
    // }
    if (user.access?.dashboard?.view) {
        return '/dashboard';
    }
    if (user.access?.employees?.view) {
        return '/employees';
    }
    if (user.access?.a_inqempatt?.view) {
        return '/a_inqempatt';
    }
    if (user.access?.a_holm?.view) {
        return '/a_holm';
    }
    if (user.access?.depm?.view) {
        return '/departments';
    }
    if (user.access?.noptrn?.view) {
        return '/noptrn';
    }
    if (user.access?.disppays?.view) {
        return '/disppays';
    }
    if (user.access?.users?.view) {
        return '/program/users';
    }
    if (user.access?.programs?.view) {
        return '/program/programs';
    }
    if (user.access?.rights?.view) {
        return '/usrenter';
    }
    
    if(user.access?.rights?.view){
        return '/blank'
    }

    return '/account';
}
