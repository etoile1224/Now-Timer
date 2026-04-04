function kstDateStr(d: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
}

function todayKst(): string {
  return kstDateStr(new Date());
}

function lastNDaysKst(n: number): string[] {
  return Array.from({ length: n }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - i);
    return kstDateStr(d);
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

interface DailyCompliance {
  date: string;
  alerts: number;
  dismissed: number;
}

const MAX_RECORDS = 500;

const sessionsByMember = new Map<string, SessionRecord[]>();
const reactionsByMember = new Map<string, ReactionRecord[]>();
const complianceByMember = new Map<string, DailyCompliance[]>();

function getSessions(memberId: string): SessionRecord[] {
  if (!sessionsByMember.has(memberId)) sessionsByMember.set(memberId, []);
  return sessionsByMember.get(memberId)!;
}

function getReactions(memberId: string): ReactionRecord[] {
  if (!reactionsByMember.has(memberId)) reactionsByMember.set(memberId, []);
  return reactionsByMember.get(memberId)!;
}

function getDailyCompliance(memberId: string): DailyCompliance[] {
  if (!complianceByMember.has(memberId)) complianceByMember.set(memberId, []);
  return complianceByMember.get(memberId)!;
}

export function addSession(memberId: string, type: 'work' | 'break'): void {
  const arr = getSessions(memberId);
  arr.push({ date: todayKst(), completedAt: Date.now(), type });
  if (arr.length > MAX_RECORDS) arr.splice(0, arr.length - MAX_RECORDS);
}

export function trackAlertEntry(memberId: string): void {
  const date = todayKst();
  const arr = getDailyCompliance(memberId);
  let entry = arr.find((d) => d.date === date);
  if (!entry) {
    entry = { date, alerts: 0, dismissed: 0 };
    arr.push(entry);
    if (arr.length > 90) arr.splice(0, arr.length - 90);
  }
  entry.alerts += 1;
}

export function trackDismissal(memberId: string): void {
  const date = todayKst();
  const arr = getDailyCompliance(memberId);
  let entry = arr.find((d) => d.date === date);
  if (!entry) {
    entry = { date, alerts: 1, dismissed: 0 };
    arr.push(entry);
  }
  entry.dismissed += 1;
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
  const complianceData = getDailyCompliance(memberId);

  let days: string[];
  if (period === 'today') {
    days = [todayKst()];
  } else if (period === 'week') {
    days = lastNDaysKst(7);
  } else {
    const allDates = new Set([
      ...sessions.map((s) => s.date),
      ...complianceData.map((c) => c.date),
    ]);
    if (!allDates.size) {
      days = lastNDaysKst(7);
    } else {
      const sorted = [...allDates].sort();
      const firstDate = new Date(sorted[0] + 'T00:00:00+09:00');
      const todayDate = new Date();
      const diffMs = todayDate.getTime() - firstDate.getTime();
      const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      days = lastNDaysKst(Math.min(diffDays + 1, 90));
    }
  }

  const daySet = new Set(days);

  const filteredSessions = sessions.filter(
    (s) => daySet.has(s.date) && s.type === 'work',
  );
  const filteredReactions = reactions.filter((r) => daySet.has(r.date));
  const filteredCompliance = complianceData.filter((c) => daySet.has(c.date));

  const totalSessions = filteredSessions.length;

  const avgReactionMs =
    filteredReactions.length > 0
      ? Math.round(
          filteredReactions.reduce((s, r) => s + r.reactionMs, 0) /
            filteredReactions.length,
        )
      : null;

  const totalAlerts = filteredCompliance.reduce((s, c) => s + c.alerts, 0);
  const totalDismissed = filteredCompliance.reduce(
    (s, c) => s + c.dismissed,
    0,
  );
  const complianceRate =
    totalAlerts > 0 ? Math.round((totalDismissed / totalAlerts) * 100) : null;

  const workDates = new Set(
    sessions.filter((s) => s.type === 'work').map((s) => s.date),
  );
  let streak = 0;
  const streakCheck = new Date();
  if (!workDates.has(todayKst())) {
    streakCheck.setDate(streakCheck.getDate() - 1);
  }
  while (workDates.has(kstDateStr(streakCheck))) {
    streak++;
    streakCheck.setDate(streakCheck.getDate() - 1);
  }

  const sessionCountByDate = new Map<string, number>();
  for (const s of filteredSessions) {
    sessionCountByDate.set(s.date, (sessionCountByDate.get(s.date) ?? 0) + 1);
  }
  const compByDate = new Map<string, DailyCompliance>();
  for (const c of filteredCompliance) {
    compByDate.set(c.date, c);
  }

  const daily: DailyStat[] = days.map((date) => {
    const c = compByDate.get(date);
    const cr =
      c && c.alerts > 0
        ? Math.round((c.dismissed / c.alerts) * 100)
        : null;
    return {
      date,
      sessions: sessionCountByDate.get(date) ?? 0,
      complianceRate: cr,
    };
  });

  return { totalSessions, avgReactionMs, complianceRate, streak, daily };
}
