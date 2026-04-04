import { getItem, setItem } from './storage';

export interface SessionEvent {
  date: string;
  completedAt: number;
  type: 'work' | 'break';
}

export interface NowReaction {
  date: string;
  alertedAt: number;
  reactedAt: number;
  reactionMs: number;
  dismissed: boolean;
}

const K_SESSIONS = 'now-timer-sessions-v1';
const K_REACTIONS = 'now-timer-reactions-v1';
const MAX_ENTRIES = 500;

function load<T>(key: string): T[] {
  try {
    return JSON.parse(getItem(key) ?? '[]') as T[];
  } catch {
    return [];
  }
}

function save<T>(key: string, arr: T[]): void {
  try {
    setItem(key, JSON.stringify(arr.slice(-MAX_ENTRIES)));
  } catch {}
}

export function addSession(ev: SessionEvent): void {
  const arr = load<SessionEvent>(K_SESSIONS);
  arr.push(ev);
  save(K_SESSIONS, arr);
}

export function getSessions(): SessionEvent[] {
  return load<SessionEvent>(K_SESSIONS);
}

export function addNowReaction(r: NowReaction): void {
  const arr = load<NowReaction>(K_REACTIONS);
  arr.push(r);
  save(K_REACTIONS, arr);
}

export function getNowReactions(): NowReaction[] {
  return load<NowReaction>(K_REACTIONS);
}

function kstDateStr(d: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
}

export function todayStr(): string {
  return kstDateStr(new Date());
}

export function lastNDays(n: number): string[] {
  return Array.from({ length: n }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - i);
    return kstDateStr(d);
  }).reverse();
}

export function calcStreak(sessions: SessionEvent[]): number {
  const workDates = new Set(
    sessions.filter((s) => s.type === 'work').map((s) => s.date),
  );
  if (!workDates.size) return 0;
  let streak = 0;
  const d = new Date();
  if (!workDates.has(kstDateStr(d))) {
    d.setDate(d.getDate() - 1);
  }
  while (workDates.has(kstDateStr(d))) {
    streak++;
    d.setDate(d.getDate() - 1);
  }
  return streak;
}

export function avgReactionMsCalc(reactions: NowReaction[]): number | null {
  if (!reactions.length) return null;
  return Math.round(
    reactions.reduce((s, r) => s + r.reactionMs, 0) / reactions.length,
  );
}

export function complianceRateCalc(reactions: NowReaction[]): number | null {
  if (!reactions.length) return null;
  return Math.round(
    (reactions.filter((r) => r.dismissed).length / reactions.length) * 100,
  );
}

export interface ReactionTier {
  label: string;
  grade: string;
  color: string;
}

export function reactionTier(ms: number): ReactionTier {
  if (ms < 10_000) return { label: '빠름', grade: '⚡', color: '#3b82f6' };
  if (ms < 30_000) return { label: '보통', grade: '👍', color: '#16a34a' };
  return { label: '느림', grade: '🐢', color: '#f97316' };
}
