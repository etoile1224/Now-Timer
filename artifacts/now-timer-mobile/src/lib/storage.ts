import AsyncStorage from '@react-native-async-storage/async-storage';

// In-memory cache for synchronous reads
const cache = new Map<string, string>();
let initialized = false;

const KNOWN_KEYS = [
  'now-timer-settings',
  'now-timer-auth-token',
  'now-timer-username',
  'now-timer-memberships',
  'now-timer-active-team',
  'now-timer-sessions-v1',
  'now-timer-reactions-v1',
  'now-timer-lang',
];

export async function initStorage(): Promise<void> {
  if (initialized) return;
  const pairs = await AsyncStorage.multiGet(KNOWN_KEYS);
  for (const [key, value] of pairs) {
    if (value !== null) cache.set(key, value);
  }
  initialized = true;
}

export function getItem(key: string): string | null {
  return cache.get(key) ?? null;
}

export function setItem(key: string, value: string): void {
  cache.set(key, value);
  AsyncStorage.setItem(key, value).catch(() => {});
}

export function removeItem(key: string): void {
  cache.delete(key);
  AsyncStorage.removeItem(key).catch(() => {});
}
