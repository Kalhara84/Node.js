import { api, TOKEN_KEY, USER_KEY, request } from './api.ts';
import type { AuthUser } from '../types.ts';

// Get current logged-in user from localStorage
export function currentUser(): AuthUser | null {
    try {
        // Only use a saved user when a saved token also exists.
        if (!localStorage.getItem(TOKEN_KEY)) {
            return null;
        }
        // Convert the saved user text back into a user object.
        return JSON.parse(localStorage.getItem(USER_KEY) || 'null') as AuthUser | null;
    } catch {
        return null;
    }
}

// Sign in and save the token and user profile in browser storage.
export async function login(username: string, password: string): Promise<AuthUser> {
    // Ask services/api.ts to send the login details to the backend.
    const res = await api.login(username, password);
    // Save the token and user in browser storage; do not save the password.
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
    // Ask /auth/me for the current profile and permissions using the saved token.
    const result = await request<AuthUser>('/auth/me');
    // Keep saved fields and replace them with fresh values from the server.
    const user = { ...currentUser(), ...result };
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    return user;
}

// Check employee permission flags (view, add, amend, delete)
export function canEmployee(action: 'view' | 'add' | 'amend' | 'delete'): boolean {
    return currentUser()?.access?.employees[action] === true;
}
