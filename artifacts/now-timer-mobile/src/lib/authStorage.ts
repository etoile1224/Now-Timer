import { getItem, setItem, removeItem } from './storage';

const K_AUTH_TOKEN = 'now-timer-auth-token';
const K_USERNAME = 'now-timer-username';

export function getAuthToken(): string | null {
  return getItem(K_AUTH_TOKEN);
}

export function getStoredUsername(): string | null {
  return getItem(K_USERNAME);
}

export function saveAuth(token: string, username: string): void {
  setItem(K_AUTH_TOKEN, token);
  setItem(K_USERNAME, username);
}

export function clearAuth(): void {
  removeItem(K_AUTH_TOKEN);
  removeItem(K_USERNAME);
}
