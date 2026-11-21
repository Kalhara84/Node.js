import type { AuthUser, DashboardData, Employee, EmployeeBody, Lookups, Paged } from '../types.ts';
const BASE: string = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
export const TOKEN_KEY = 'payroll_token';
export const USER_KEY = 'payroll_user';
async function request<T>(path: string, init: RequestInit = {}, auth = true): Promise<T> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (auth) {
        const token = localStorage.getItem(TOKEN_KEY);
        if (token) {
            headers.Authorization = `Bearer ${token}`;
        }
    }
    let res: Response;
    try {
        res = await fetch(BASE + path, { ...init, headers, cache: 'no-store' });
    }
    catch {
        throw new Error('Cannot reach the server. Is the backend running?');
    }
    // token missing / expired -> back to the login page
    if (res.status === 401 && auth) {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
        window.location.href = '/login';
        throw new Error('Session expired. Please sign in again.');
    }
    const data = (await res.json().catch(() => {
        return null;
    })) as {
        message?: string | string[];
    } | null;
    if (!res.ok) {
        const m = data?.message;
        if (Array.isArray(m)) {
            throw new Error(m.join(', '));
        }
        throw new Error(m || 'Something went wrong');
    }
    return data as T;
}
export const api = {
    login: (username: string, password: string) => {
        return request<{
            token: string;
            user: AuthUser;
        }>('/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) }, false);
    },
    dashboard: () => {
        return request<DashboardData>('/dashboard');
    },
    lookups: () => {
        return request<Lookups>('/lookups');
    },
    list: (search: string, page: number, limit = 10) => {
        return request<Paged<Employee>>(`/employees?search=${encodeURIComponent(search)}&page=${page}&limit=${limit}`);
    },
    get: (id: number) => {
        return request<Employee>(`/employees/${id}`);
    },
    nextEmployeeNumber: () => {
        return request<{ empeno: number }>('/employees/next-number');
    },
    create: (body: EmployeeBody) => {
        return request<Employee>('/employees', { method: 'POST', body: JSON.stringify(body) });
    },
    update: (id: number, body: EmployeeBody) => {
        return request<Employee>(`/employees/${id}`, { method: 'PUT', body: JSON.stringify(body) });
    },
    remove: (id: number) => {
        return request<{
            message: string;
        }>(`/employees/${id}`, { method: 'DELETE' });
    },
};
// dropdown data is the same for every page -> load once
let lookupsPromise: Promise<Lookups> | null = null;
export const getLookups = (): Promise<Lookups> => {
    if (lookupsPromise === null) {
        lookupsPromise = api.lookups().catch((e) => {
            lookupsPromise = null;
            throw e;
        });
    }
    return lookupsPromise;
};
