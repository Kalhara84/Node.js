import { api, TOKEN_KEY, USER_KEY } from './api';
import type { AuthUser } from '../types';

export function currentUser(): AuthUser | null {
  try {
    if (!localStorage.getItem(TOKEN_KEY)) {
      return null;
    }

    return JSON.parse(
      localStorage.getItem(USER_KEY) || 'null',
    ) as AuthUser | null;
  } catch {
    return null;
  }
}

export async function login(
  username: string,
  password: string,
): Promise<AuthUser> {
  const response = await api.login(username, password);

  localStorage.setItem(TOKEN_KEY, response.token);
  localStorage.setItem(USER_KEY, JSON.stringify(response.user));

  return response.user;
}

export function logout() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}
