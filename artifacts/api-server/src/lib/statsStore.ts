import * as db from './db.js';

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

export async function addSession(
  memberId: string,
  type: 'work' | 'break',
): Promise<void> {
  await db.run(
    'INSERT INTO member_sessions (member_id, date, completed_at, type) VALUES ($1, $2, $3, $4)',
    [memberId, todayKst(), Date.now(), type],
  );
}

export async function trackAlertEntry(memberId: string): Promise<void> {
  await db.run(
    `INSERT INTO daily_compliance (member_id, date, alerts, dismissed)
     VALUES ($1, $2, 1, 0)
     ON CONFLICT (member_id, date) DO UPDATE
     SET alerts = daily_compliance.alerts + 1`,
    [memberId, todayKst()],
  );
}

export async function trackDismissal(memberId: string): Promise<void> {
  await db.run(
    `INSERT INTO daily_compliance (member_id, date, alerts, dismissed)
     VALUES ($1, $2, 1, 1)
     ON CONFLICT (member_id, date) DO UPDATE
     SET dismissed = daily_compliance.dismissed + 1`,
    [memberId, todayKst()],
  );
}

export async function addReaction(
  memberId: string,
  reactionMs: number,
  dismissed: boolean,
): Promise<void> {
  await db.run(
    'INSERT INTO member_reactions (member_id, date, reaction_ms, dismissed) VALUES ($1, $2, $3, $4)',
    [memberId, todayKst(), reactionMs, dismissed],
  );
}

export async function getStats(
  memberId: string,
  period: 'today' | 'week' | 'all',
): Promise<StatsResponse> {
  type SessionRow = { date: string; type: string };
  type ReactionRow = { date: string; reaction_ms: number; dismissed: boolean };
  type ComplianceRow = { date: string; alerts: number; dismissed: number };
  type StreakRow = { date: string };

  const [sessions, reactions, compliance, allWorkDates] = await Promise.all([
    db.query<SessionRow>(
      `SELECT date, type FROM member_sessions WHERE member_id = $1 ORDER BY completed_at`,
      [memberId],
    ),
    db.query<ReactionRow>(
      `SELECT date, reaction_ms, dismissed FROM member_reactions WHERE member_id = $1`,
      [memberId],
    ),
    db.query<ComplianceRow>(
      `SELECT date, alerts, dismissed FROM daily_compliance WHERE member_id = $1`,
      [memberId],
    ),
    db.query<StreakRow>(
      `SELECT DISTINCT date FROM member_sessions WHERE member_id = $1 AND type = 'work' ORDER BY date`,
      [memberId],
    ),
  ]);

  let days: string[];
  if (period === 'today') {
    days = [todayKst()];
  } else if (period === 'week') {
    days = lastNDaysKst(7);
  } else {
    const workDates = allWorkDates.map((r) => r.date);
    const compDates = compliance.map((r) => r.date);
    const allDates = new Set([...workDates, ...compDates]);
    if (!allDates.size) {
      days = lastNDaysKst(7);
    } else {
      const sorted = [...allDates].sort();
      const firstDate = new Date(sorted[0] + 'T00:00:00+09:00');
      const diffMs = new Date().getTime() - firstDate.getTime();
      const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      days = lastNDaysKst(Math.min(diffDays + 1, 90));
    }
  }

  const daySet = new Set(days);

  const filteredWork = sessions.filter((s) => daySet.has(s.date) && s.type === 'work');
  const filteredReactions = reactions.filter((r) => daySet.has(r.date));
  const filteredCompliance = compliance.filter((c) => daySet.has(c.date));

  const totalSessions = filteredWork.length;

  const avgReactionMs =
    filteredReactions.length > 0
      ? Math.round(
          filteredReactions.reduce((s, r) => s + Number(r.reaction_ms), 0) /
            filteredReactions.length,
        )
      : null;

  const totalAlerts = filteredCompliance.reduce((s, c) => s + Number(c.alerts), 0);
  const totalDismissed = filteredCompliance.reduce((s, c) => s + Number(c.dismissed), 0);
  const complianceRate =
    totalAlerts > 0 ? Math.round((totalDismissed / totalAlerts) * 100) : null;

  const workDateSet = new Set(
    sessions.filter((s) => s.type === 'work').map((s) => s.date),
  );
  let streak = 0;
  const streakCheck = new Date();
  if (!workDateSet.has(todayKst())) streakCheck.setDate(streakCheck.getDate() - 1);
  while (workDateSet.has(kstDateStr(streakCheck))) {
    streak++;
    streakCheck.setDate(streakCheck.getDate() - 1);
  }

  const sessionCountByDate = new Map<string, number>();
  for (const s of filteredWork) {
    sessionCountByDate.set(s.date, (sessionCountByDate.get(s.date) ?? 0) + 1);
  }
  const compByDate = new Map<string, ComplianceRow>();
  for (const c of filteredCompliance) compByDate.set(c.date, c);

  const daily: DailyStat[] = days.map((date) => {
    const c = compByDate.get(date);
    const cr = c && Number(c.alerts) > 0
      ? Math.round((Number(c.dismissed) / Number(c.alerts)) * 100)
      : null;
    return { date, sessions: sessionCountByDate.get(date) ?? 0, complianceRate: cr };
  });

  return { totalSessions, avgReactionMs, complianceRate, streak, daily };
}
