import type {
  AuthUser,
  DashboardData,
  Employee,
  EmployeeBody,
  Lookups,
  Paged,
} from '../types';

const BASE = import.meta.env.VITE_API_URL;

export const TOKEN_KEY = 'payroll_token';
export const USER_KEY = 'payroll_user';

async function request<T>(
  path: string,
  init: RequestInit = {},
  auth = true,
): Promise<T> {
  const headers = new Headers(init.headers);

  if (!headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  if (auth) {
    const token = localStorage.getItem(TOKEN_KEY);

    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
  }

  let response: Response;

  try {
    response = await fetch(BASE + path, {
      ...init,
      headers,
      cache: 'no-store',
    });
  } catch {
    throw new Error('Cannot reach the server. Is the backend running?');
  }

  if (response.status === 401 && auth) {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);

    if (window.location.pathname !== '/login') {
      window.location.href = '/login';
    }

    throw new Error('Session expired. Please sign in again.');
  }

  const data = (await response.json().catch(() => null)) as
    | { message?: string | string[] }
    | null;

  if (!response.ok) {
    const message = data?.message;

    if (Array.isArray(message)) {
      throw new Error(message.join(', '));
    }

    throw new Error(message || 'Something went wrong');
  }

  return data as T;
}

export const api = {
  login: (username: string, password: string) =>
    request<{ token: string; user: AuthUser }>(
      '/auth/login',
      {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      },
      false,
    ),

  dashboard: () => request<DashboardData>('/dashboard'),

  lookups: () => request<Lookups>('/lookups'),

  list: (search: string, page: number, limit = 10) =>
    request<Paged<Employee>>(
      `/employees?search=${encodeURIComponent(search)}&page=${page}&limit=${limit}`,
    ),

  get: (id: number) => request<Employee>(`/employees/${id}`),

  nextEmployeeNumber: () =>
    request<{ empeno: number }>('/employees/next-number'),

  create: (body: EmployeeBody) =>
    request<Employee>('/employees', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  update: (id: number, body: EmployeeBody) =>
    request<Employee>(`/employees/${id}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    }),

  remove: (id: number) =>
    request<{ message: string }>(`/employees/${id}`, {
      method: 'DELETE',
    }),
};

let lookupsPromise: Promise<Lookups> | null = null;

export function getLookups(): Promise<Lookups> {
  if (!lookupsPromise) {
    lookupsPromise = api.lookups().catch((error) => {
      lookupsPromise = null;
      throw error;
    });
  }

  return lookupsPromise;
}
