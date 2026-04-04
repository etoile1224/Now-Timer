const K_AUTH_TOKEN = 'now-timer-auth-token';
const K_USERNAME = 'now-timer-username';

export function getAuthToken(): string | null {
  return localStorage.getItem(K_AUTH_TOKEN);
}

export function getStoredUsername(): string | null {
  return localStorage.getItem(K_USERNAME);
}

export function saveAuth(token: string, username: string): void {
  localStorage.setItem(K_AUTH_TOKEN, token);
  localStorage.setItem(K_USERNAME, username);
}

export function clearAuth(): void {
  localStorage.removeItem(K_AUTH_TOKEN);
  localStorage.removeItem(K_USERNAME);
}
