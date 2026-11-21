import type { AuthUser, DashboardData, Employee, EmployeeBody, Lookups, Paged } from './types.js';

const BASE: string = window.APP_CONFIG?.API_URL || 'http://localhost:3001/api';

export const TOKEN_KEY = 'payroll_token';
export const USER_KEY = 'payroll_user';

async function request<T>(path: string, init: RequestInit = {}, auth = true): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (auth) {
    const token = localStorage.getItem(TOKEN_KEY);
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  let res: Response;
  try {
    res = await fetch(BASE + path, { ...init, headers, cache: 'no-store' });
  } catch {
    throw new Error('Cannot reach the server. Is the backend running?');
  }

  // token missing / expired -> back to the login page
  if (res.status === 401 && auth) {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    window.location.href = '/login';
    throw new Error('Session expired. Please sign in again.');
  }

  const data = (await res.json().catch(() => null)) as { message?: string | string[] } | null;
  if (!res.ok) {
    const m = data?.message;
    throw new Error(Array.isArray(m) ? m.join(', ') : m || 'Something went wrong');
  }
  return data as T;
}

export const api = {
  login: (username: string, password: string) =>
    request<{ token: string; user: AuthUser }>('/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) }, false),
  dashboard: () => request<DashboardData>('/dashboard'),
  lookups: () => request<Lookups>('/lookups'),
  list: (search: string, page: number, limit = 10) =>
    request<Paged<Employee>>(`/employees?search=${encodeURIComponent(search)}&page=${page}&limit=${limit}`),
  get: (id: number) => request<Employee>(`/employees/${id}`),
  create: (body: EmployeeBody) => request<Employee>('/employees', { method: 'POST', body: JSON.stringify(body) }),
  update: (id: number, body: EmployeeBody) => request<Employee>(`/employees/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  remove: (id: number) => request<{ message: string }>(`/employees/${id}`, { method: 'DELETE' }),
};

// dropdown data is the same for every page -> load once
let lookupsPromise: Promise<Lookups> | null = null;
export const getLookups = (): Promise<Lookups> =>
  (lookupsPromise ??= api.lookups().catch((e) => {
    lookupsPromise = null;
    throw e;
  }));
