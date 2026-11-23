import type { AuthUser, DashboardData, Employee, EmployeeBody, Lookups, Paged } from '../types.ts';

// Base API endpoint URL
// Read the backend API address from frontend/.env, including /api.
const BASE: string = import.meta.env.VITE_API_URL ;
// Names used to save the token and user in browser storage.
export const TOKEN_KEY = 'payroll_token';
export const USER_KEY = 'payroll_user';

// Core HTTP request wrapper with automatic Authorization header
export async function request<T>(path: string, init: RequestInit = {}, auth = true): Promise<T> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };

    // Attach proof of login to protected requests; the login request skips this.
    if (auth) {
        const token = localStorage.getItem(TOKEN_KEY);
        if (token) {
            headers.Authorization = `Bearer ${token}`;
        }
    }

    let res: Response;
    try {
        // Send the request to the backend and wait for its response.
        res = await fetch(BASE + path, { ...init, headers, cache: 'no-store' });
    } catch {
        throw new Error('Cannot reach the server. Is the backend running?');
    }

    // Token missing or expired: redirect back to login
    if (res.status === 401 && auth) {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
        window.location.href = '/login';
        throw new Error('Session expired. Please sign in again.');
    }

    // Read the JSON response; use null if the response is not valid JSON.
    const data = (await res.json().catch(() => null)) as { message?: string | string[] } | null;

    // Turn a failed response into an error that the screen can display.
    if (!res.ok) {
        const m = data?.message;
        if (Array.isArray(m)) {
            throw new Error(m.join(', '));
        }
        throw new Error(m || 'Something went wrong');
    }

    return data as T;
}

// API client methods for Payroll backend endpoints
export const api = {
    // Authenticate user
    login: (username: string, password: string) => {
        // Send the username and password as JSON to /auth/login.
        // false means this login request does not need an existing token.
        return request<{ token: string; user: AuthUser }>('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ username, password })
        }, false);
    },

    // Fetch dashboard overview
    dashboard: () => {
        return request<DashboardData>('/dashboard');
    },

    // Fetch dropdown lookup master lists
    lookups: () => {
        return request<Lookups>('/lookups');
    },

    // List employees with search query and pagination
    list: (search: string, page: number, limit = 10) => {
        return request<Paged<Employee>>(`/employees?search=${encodeURIComponent(search)}&page=${page}&limit=${limit}`);
    },

    // Get single employee by ID
    get: (id: number) => {
        return request<Employee>(`/employees/${id}`);
    },

    // Get next auto-incremented employee number
    nextEmployeeNumber: () => {
        return request<{ empeno: number }>('/employees/next-number');
    },

    // Create a new employee
    create: (body: EmployeeBody) => {
        return request<Employee>('/employees', {
            method: 'POST',
            body: JSON.stringify(body)
        });
    },

    // Update existing employee
    update: (id: number, body: EmployeeBody) => {
        return request<Employee>(`/employees/${id}`, {
            method: 'PUT',
            body: JSON.stringify(body)
        });
    },

    // Delete employee by ID
    remove: (id: number) => {
        return request<{ message: string }>(`/employees/${id}`, {
            method: 'DELETE'
        });
    },
};

// Cached lookup promise to avoid redundant network calls
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
