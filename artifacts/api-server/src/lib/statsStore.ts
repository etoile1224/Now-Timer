function todayKst(): string {
  return new Date()
    .toLocaleDateString('ko-KR', {
      timeZone: 'Asia/Seoul',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
    .replace(/\./g, '')
    .replace(/\s/g, '-')
    .replace(/-$/, '');
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function lastNDays(n: number): string[] {
  return Array.from({ length: n }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - i);
    return isoDate(d);
  }).reverse();
}

export interface SessionRecord {
  date: string;
  completedAt: number;
  type: 'work' | 'break';
}

export interface ReactionRecord {
  date: string;
  reactionMs: number;
  dismissed: boolean;
}

const MAX_RECORDS = 500;

const sessionsByMember = new Map<string, SessionRecord[]>();
const reactionsByMember = new Map<string, ReactionRecord[]>();

function getSessions(memberId: string): SessionRecord[] {
  if (!sessionsByMember.has(memberId)) sessionsByMember.set(memberId, []);
  return sessionsByMember.get(memberId)!;
}

function getReactions(memberId: string): ReactionRecord[] {
  if (!reactionsByMember.has(memberId)) reactionsByMember.set(memberId, []);
  return reactionsByMember.get(memberId)!;
}

export function addSession(memberId: string, type: 'work' | 'break'): void {
  const arr = getSessions(memberId);
  arr.push({ date: todayKst(), completedAt: Date.now(), type });
  if (arr.length > MAX_RECORDS) arr.splice(0, arr.length - MAX_RECORDS);
}

export function addReaction(
  memberId: string,
  reactionMs: number,
  dismissed: boolean,
): void {
  const arr = getReactions(memberId);
  arr.push({ date: todayKst(), reactionMs, dismissed });
  if (arr.length > MAX_RECORDS) arr.splice(0, arr.length - MAX_RECORDS);
}

export interface DailyStat {
  date: string;
  sessions: number;
  complianceRate: number | null;
}

export interface StatsResponse {
  totalSessions: number;
  avgReactionMs: number | null;
  complianceRate: number | null;
  streak: number;
  daily: DailyStat[];
}

export function getStats(
  memberId: string,
  period: 'today' | 'week' | 'all',
): StatsResponse {
  const sessions = getSessions(memberId);
  const reactions = getReactions(memberId);

  let days: string[];
  if (period === 'today') {
    days = [todayKst()];
  } else if (period === 'week') {
    days = lastNDays(7);
  } else {
    const uniqueDates = new Set([
      ...sessions.map((s) => s.date),
      ...reactions.map((r) => r.date),
    ]);
    if (!uniqueDates.size) {
      days = lastNDays(7);
    } else {
      const sorted = [...uniqueDates].sort();
      const firstDate = new Date(sorted[0] + 'T00:00:00');
      const today = new Date();
      const diffMs = today.getTime() - firstDate.getTime();
      const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      days = lastNDays(Math.min(diffDays + 1, 90));
    }
  }

  const daySet = new Set(days);
  const filteredSessions = sessions.filter(
    (s) => daySet.has(s.date) && s.type === 'work',
  );
  const filteredReactions = reactions.filter((r) => daySet.has(r.date));

  const totalSessions = filteredSessions.length;

  const avgReactionMs =
    filteredReactions.length > 0
      ? Math.round(
          filteredReactions.reduce((s, r) => s + r.reactionMs, 0) /
            filteredReactions.length,
        )
      : null;

  const complianceRate =
    filteredReactions.length > 0
      ? Math.round(
          (filteredReactions.filter((r) => r.dismissed).length /
            filteredReactions.length) *
            100,
        )
      : null;

  const workDates = new Set(
    sessions.filter((s) => s.type === 'work').map((s) => s.date),
  );
  let streak = 0;
  const d = new Date();
  if (!workDates.has(todayKst())) d.setDate(d.getDate() - 1);
  while (workDates.has(isoDate(d))) {
    streak++;
    d.setDate(d.getDate() - 1);
  }

  const sessionCountByDate = new Map<string, number>();
  for (const s of filteredSessions) {
    sessionCountByDate.set(s.date, (sessionCountByDate.get(s.date) ?? 0) + 1);
  }
  const reactionsByDate = new Map<string, ReactionRecord[]>();
  for (const r of filteredReactions) {
    if (!reactionsByDate.has(r.date)) reactionsByDate.set(r.date, []);
    reactionsByDate.get(r.date)!.push(r);
  }

  const daily: DailyStat[] = days.map((date) => {
    const recs = reactionsByDate.get(date) ?? [];
    const cr =
      recs.length > 0
        ? Math.round((recs.filter((r) => r.dismissed).length / recs.length) * 100)
        : null;
    return {
      date,
      sessions: sessionCountByDate.get(date) ?? 0,
      complianceRate: cr,
    };
  });

  return { totalSessions, avgReactionMs, complianceRate, streak, daily };
}
