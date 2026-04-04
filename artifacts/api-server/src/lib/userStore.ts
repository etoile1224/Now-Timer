import { randomBytes } from 'crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';
import bcrypt from 'bcryptjs';

export interface SavedMembership {
  code: string;
  memberId: string;
  nickname: string;
  token: string;
}

export interface User {
  id: string;
  username: string;
  passwordHash: string;
  memberships: SavedMembership[];
  createdAt: string;
}

const users = new Map<string, User>();
const usernameIndex = new Map<string, string>();

const DATA_DIR = resolve(process.cwd(), 'data');
const USERS_FILE = resolve(DATA_DIR, 'users.json');

function ensureDataDir(): void {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
}

function persist(): void {
  try {
    ensureDataDir();
    const payload = { users: Object.fromEntries(users) };
    writeFileSync(USERS_FILE, JSON.stringify(payload));
  } catch (err) {
    console.error('[userStore] persist failed:', err);
  }
}

function load(): void {
  if (!existsSync(USERS_FILE)) return;
  try {
    const raw = readFileSync(USERS_FILE, 'utf-8');
    const data = JSON.parse(raw) as { users?: Record<string, User> };
    for (const [k, v] of Object.entries(data.users ?? {})) {
      users.set(k, v);
      usernameIndex.set(v.username.toLowerCase(), k);
    }
  } catch (err) {
    console.error('[userStore] load failed:', err);
  }
}

load();

export async function register(
  username: string,
  password: string,
): Promise<User | { error: string }> {
  const key = username.toLowerCase();
  if (usernameIndex.has(key)) return { error: 'username_taken' };

  const passwordHash = await bcrypt.hash(password, 10);
  const user: User = {
    id: randomBytes(8).toString('hex'),
    username,
    passwordHash,
    memberships: [],
    createdAt: new Date().toISOString(),
  };
  users.set(user.id, user);
  usernameIndex.set(key, user.id);
  persist();
  return user;
}

export async function login(
  username: string,
  password: string,
): Promise<User | null> {
  const userId = usernameIndex.get(username.toLowerCase());
  if (!userId) return null;
  const user = users.get(userId);
  if (!user) return null;
  const ok = await bcrypt.compare(password, user.passwordHash);
  return ok ? user : null;
}

export function getUser(userId: string): User | undefined {
  return users.get(userId);
}

export function linkMembership(userId: string, m: SavedMembership): void {
  const user = users.get(userId);
  if (!user) return;
  const exists = user.memberships.some((x) => x.code === m.code);
  if (!exists) {
    user.memberships.push(m);
    persist();
  }
}

export function unlinkMembership(userId: string, code: string): void {
  const user = users.get(userId);
  if (!user) return;
  user.memberships = user.memberships.filter((x) => x.code !== code);
  persist();
}
