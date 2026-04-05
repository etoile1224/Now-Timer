import { randomBytes } from 'crypto';
import bcrypt from 'bcryptjs';
import * as db from './db.js';

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

type UserRow = {
  id: string;
  username: string;
  password_hash: string;
  created_at: string;
};

type MembershipRow = {
  code: string;
  member_id: string;
  nickname: string;
  token: string;
};

async function getMemberships(userId: string): Promise<SavedMembership[]> {
  const rows = await db.query<MembershipRow>(
    'SELECT code, member_id, nickname, token FROM user_memberships WHERE user_id = $1',
    [userId],
  );
  return rows.map((r) => ({
    code: r.code,
    memberId: r.member_id,
    nickname: r.nickname,
    token: r.token,
  }));
}

function rowToUser(row: UserRow, memberships: SavedMembership[]): User {
  return {
    id: row.id,
    username: row.username,
    passwordHash: row.password_hash,
    memberships,
    createdAt: typeof row.created_at === 'string'
      ? row.created_at
      : new Date(row.created_at as unknown as Date).toISOString(),
  };
}

export async function register(
  username: string,
  password: string,
): Promise<User | { error: string }> {
  const existing = await db.queryOne<UserRow>(
    'SELECT id FROM users WHERE LOWER(username) = LOWER($1)',
    [username],
  );
  if (existing) return { error: 'username_taken' };

  const passwordHash = await bcrypt.hash(password, 10);
  const id = randomBytes(8).toString('hex');

  const row = await db.queryOne<UserRow>(
    `INSERT INTO users (id, username, password_hash)
     VALUES ($1, $2, $3)
     RETURNING id, username, password_hash, created_at::text`,
    [id, username, passwordHash],
  );

  if (!row) return { error: 'db_error' };
  return rowToUser(row, []);
}

export async function login(
  username: string,
  password: string,
): Promise<User | null> {
  const row = await db.queryOne<UserRow>(
    `SELECT id, username, password_hash, created_at::text
     FROM users WHERE LOWER(username) = LOWER($1)`,
    [username],
  );
  if (!row) return null;
  const ok = await bcrypt.compare(password, row.password_hash);
  if (!ok) return null;
  const memberships = await getMemberships(row.id);
  return rowToUser(row, memberships);
}

export async function getUser(userId: string): Promise<User | undefined> {
  const row = await db.queryOne<UserRow>(
    `SELECT id, username, password_hash, created_at::text
     FROM users WHERE id = $1`,
    [userId],
  );
  if (!row) return undefined;
  const memberships = await getMemberships(userId);
  return rowToUser(row, memberships);
}

export async function linkMembership(
  userId: string,
  m: SavedMembership,
): Promise<void> {
  await db.run(
    `INSERT INTO user_memberships (user_id, code, member_id, nickname, token)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (user_id, code)
     DO UPDATE SET member_id = EXCLUDED.member_id,
                   nickname  = EXCLUDED.nickname,
                   token     = EXCLUDED.token`,
    [userId, m.code, m.memberId, m.nickname, m.token],
  );
}

export async function unlinkMembership(
  userId: string,
  code: string,
): Promise<void> {
  await db.run(
    'DELETE FROM user_memberships WHERE user_id = $1 AND code = $2',
    [userId, code],
  );
}

export async function saveVoice(userId: string, audio: string): Promise<void> {
  await db.run(
    'UPDATE users SET voice_poke = $1 WHERE id = $2',
    [audio, userId],
  );
}

export async function getVoice(userId: string): Promise<string | null> {
  const row = await db.queryOne<{ voice_poke: string }>(
    'SELECT voice_poke FROM users WHERE id = $1',
    [userId],
  );
  return row?.voice_poke || null;
}

export async function getUserIdByMemberId(memberId: string): Promise<string | null> {
  const row = await db.queryOne<{ user_id: string }>(
    'SELECT user_id FROM user_memberships WHERE member_id = $1',
    [memberId],
  );
  return row?.user_id || null;
}
