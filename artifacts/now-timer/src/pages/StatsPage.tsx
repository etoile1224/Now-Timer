import { useEffect, useMemo, useRef, useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Cell,
  Tooltip,
} from 'recharts';
import { useSocial } from '@/context/SocialContext';
import { api } from '@/lib/api';
import {
  getSessions,
  getNowReactions,
  lastNDays,
  calcStreak,
  avgReactionMsCalc,
  complianceRateCalc,
  reactionTier,
  type SessionEvent,
  type NowReaction,
} from '@/lib/statsStorage';

type Period = 'today' | 'week' | 'all';

interface BackendStats {
  totalSessions: number;
  avgReactionMs: number | null;
  complianceRate: number | null;
  streak: number;
  daily: { date: string; sessions: number; complianceRate: number | null }[];
}

function dateLabel(date: string): string {
  const d = new Date(date + 'T00:00:00');
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

function msToSec(ms: number): string {
  return (ms / 1000).toFixed(1) + '초';
}

function rankDeltaIcon(delta: number): string {
  if (delta > 0) return '▲';
  if (delta < 0) return '▼';
  return '-';
}

export function StatsPage() {
  const [period, setPeriod] = useState<Period>('week');
  const { memberships, allMembers, memberId, activeTeamCode } = useSocial();

  const [backendStats, setBackendStats] = useState<BackendStats | null>(null);
  const [backendLoading, setBackendLoading] = useState(false);

  const activeMembership = useMemo(
    () => memberships.find((m) => m.code === activeTeamCode) ?? null,
    [memberships, activeTeamCode],
  );

  useEffect(() => {
    if (!activeMembership) return;
    setBackendLoading(true);
    api
      .getStats(activeMembership.memberId, activeMembership.token, period)
      .then((data) => {
        setBackendStats(data);
        setBackendLoading(false);
      })
      .catch(() => setBackendLoading(false));
  }, [activeMembership, period]);

  const sessions: SessionEvent[] = useMemo(() => getSessions(), []);
  const reactions: NowReaction[] = useMemo(() => getNowReactions(), []);

  const workSessions = useMemo(
    () => sessions.filter((s) => s.type === 'work'),
    [sessions],
  );

  const streak = useMemo(() => {
    if (backendStats) return backendStats.streak;
    return calcStreak(sessions);
  }, [backendStats, sessions]);

  const filteredReactions = useMemo(() => {
    if (period === 'today') {
      const today = new Date().toISOString().slice(0, 10);
      return reactions.filter((r) => r.date === today);
    }
    if (period === 'week') {
      const days = new Set(lastNDays(7));
      return reactions.filter((r) => days.has(r.date));
    }
    return reactions;
  }, [reactions, period]);

  const filteredSessions = useMemo(() => {
    if (period === 'today') {
      const today = new Date().toISOString().slice(0, 10);
      return workSessions.filter((s) => s.date === today);
    }
    if (period === 'week') {
      const days = new Set(lastNDays(7));
      return workSessions.filter((s) => days.has(s.date));
    }
    return workSessions;
  }, [workSessions, period]);

  const localAvgMs = useMemo(
    () => avgReactionMsCalc(filteredReactions),
    [filteredReactions],
  );
  const localCompliance = useMemo(
    () => complianceRateCalc(filteredReactions),
    [filteredReactions],
  );

  const avgMs = backendStats?.avgReactionMs ?? localAvgMs;
  const compliance = backendStats?.complianceRate ?? localCompliance;
  const totalWork = backendStats?.totalSessions ?? filteredSessions.length;
  const tier = avgMs !== null ? reactionTier(avgMs) : null;

  const barData = useMemo(() => {
    const serverDaily = backendStats?.daily;
    if (serverDaily && serverDaily.length > 0) {
      return serverDaily.map((d) => ({
        date: d.date,
        label: dateLabel(d.date),
        count: d.sessions,
        compRate: d.complianceRate,
      }));
    }
    if (period === 'today') {
      const today = new Date().toISOString().slice(0, 10);
      const count = filteredSessions.filter((s) => s.date === today).length;
      return [{ date: today, label: '오늘', count, compRate: localCompliance }];
    }
    const days = period === 'week' ? lastNDays(7) : lastNDays(30);
    const countMap = new Map<string, number>();
    for (const s of workSessions) {
      if (days.includes(s.date)) {
        countMap.set(s.date, (countMap.get(s.date) ?? 0) + 1);
      }
    }
    return days.map((d) => ({
      date: d,
      label: dateLabel(d),
      count: countMap.get(d) ?? 0,
      compRate: null as number | null,
    }));
  }, [backendStats, period, filteredSessions, workSessions, localCompliance]);

  const maxBar = Math.max(...barData.map((d) => d.count), 1);

  const prevRanksRef = useRef<Map<string, number>>(new Map());

  const teamLeaderboards = useMemo(() => {
    return memberships.map((m) => {
      const memberMap = allMembers[m.code] ?? {};
      const rows = Object.values(memberMap)
        .map((mem) => ({
          id: mem.id,
          nickname: mem.nickname,
          nowCount: mem.nowCount,
          dismissedCount: mem.dismissedCount,
          avgReactionMs: mem.avgReactionMs,
          reactionCount: mem.reactionCount,
          compliance:
            mem.nowCount > 0
              ? Math.round((mem.dismissedCount / mem.nowCount) * 100)
              : null,
        }))
        .sort((a, b) => {
          const aHasReaction = a.avgReactionMs > 0 && a.reactionCount > 0;
          const bHasReaction = b.avgReactionMs > 0 && b.reactionCount > 0;
          if (aHasReaction && bHasReaction) {
            return a.avgReactionMs - b.avgReactionMs;
          }
          if (aHasReaction) return -1;
          if (bHasReaction) return 1;
          if (a.compliance !== null && b.compliance !== null) {
            return b.compliance - a.compliance;
          }
          if (a.compliance !== null) return -1;
          if (b.compliance !== null) return 1;
          return 0;
        });

      const ranksWithDelta = rows.map((row, i) => {
        const key = `${m.code}:${row.id}`;
        const prev = prevRanksRef.current.get(key);
        const delta = prev !== undefined ? prev - i : 0;
        return { ...row, rank: i, delta };
      });

      rows.forEach((row, i) => {
        prevRanksRef.current.set(`${m.code}:${row.id}`, i);
      });

      return { code: m.code, rows: ranksWithDelta };
    });
  }, [memberships, allMembers]);

  const tabs: { key: Period; label: string }[] = [
    { key: 'today', label: '오늘' },
    { key: 'week', label: '주간' },
    { key: 'all', label: '전체' },
  ];

  const hasNoTeam = memberships.length === 0;

  return (
    <div className="min-h-screen pb-24 bg-background">
      <div className="max-w-md mx-auto px-4 pt-8 space-y-5">
        <h1 className="text-2xl font-bold tracking-tight">통계</h1>

        <div className="flex gap-2">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setPeriod(t.key)}
              className={`flex-1 py-1.5 rounded-full text-sm font-medium transition-colors ${
                period === t.key
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:text-foreground'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {streak > 0 && (
          <div className="flex items-center gap-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 px-4 py-3">
            <span className="text-2xl">🔥</span>
            <div>
              <p className="font-semibold text-amber-800 dark:text-amber-300">
                {streak}일 연속 집중 중
              </p>
              <p className="text-xs text-amber-600 dark:text-amber-400">
                오늘도 세션을 완료해 스트릭을 이어가세요!
              </p>
            </div>
          </div>
        )}

        <div className="rounded-xl border border-border bg-card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">
              완료 세션{' '}
              {backendLoading && (
                <span className="text-xs text-muted-foreground/60">(동기화 중)</span>
              )}
            </span>
            <span className="text-2xl font-bold">
              {totalWork}
              <span className="text-base font-normal text-muted-foreground ml-1">회</span>
            </span>
          </div>

          <div className="h-36">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={barData}
                margin={{ top: 4, right: 0, left: -28, bottom: 0 }}
              >
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 10, fill: 'currentColor' }}
                  axisLine={false}
                  tickLine={false}
                  interval={period === 'all' ? Math.floor(barData.length / 7) : 0}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: 'currentColor' }}
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                  domain={[0, Math.max(maxBar, 4)]}
                />
                <Tooltip
                  cursor={{ fill: 'hsl(var(--muted))' }}
                  content={({ active, payload, label }) => {
                    if (!active || !payload?.length) return null;
                    const d = payload[0]?.payload as (typeof barData)[0];
                    return (
                      <div className="bg-card border border-border rounded-lg px-3 py-2 text-xs shadow">
                        <p className="font-semibold">{label}</p>
                        <p>세션: {d.count}회</p>
                        {d.compRate !== null && (
                          <p>준수율: {d.compRate}%</p>
                        )}
                      </div>
                    );
                  }}
                />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {barData.map((entry) => (
                    <Cell
                      key={entry.date}
                      fill={
                        entry.count > 0
                          ? 'hsl(var(--primary))'
                          : 'hsl(var(--muted))'
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {backendStats && backendStats.daily.some((d) => d.complianceRate !== null) && (
          <div className="rounded-xl border border-border bg-card p-4 space-y-3">
            <p className="text-sm font-medium text-muted-foreground">일별 NOW! 준수율</p>
            <div className="space-y-1.5">
              {backendStats.daily
                .filter((d) => d.complianceRate !== null)
                .slice(-7)
                .map((d) => (
                  <div key={d.date} className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground w-10 shrink-0">
                      {dateLabel(d.date)}
                    </span>
                    <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          (d.complianceRate ?? 0) >= 80
                            ? 'bg-green-500'
                            : (d.complianceRate ?? 0) >= 50
                              ? 'bg-yellow-500'
                              : 'bg-red-500'
                        }`}
                        style={{ width: `${d.complianceRate ?? 0}%` }}
                      />
                    </div>
                    <span className="text-xs font-medium w-9 text-right shrink-0">
                      {d.complianceRate}%
                    </span>
                  </div>
                ))}
            </div>
          </div>
        )}

        <div className="rounded-xl border border-border bg-card p-4 space-y-3">
          <p className="text-sm font-medium text-muted-foreground">NOW! 반응 속도</p>
          {avgMs !== null && tier !== null ? (
            <div className="space-y-2">
              <div className="flex items-end gap-2">
                <span className="text-3xl font-bold">{msToSec(avgMs)}</span>
                <span className={`text-lg font-semibold mb-0.5 ${tier.color}`}>
                  {tier.grade} {tier.label}
                </span>
              </div>
              {compliance !== null && (
                <>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">전체 준수율</span>
                    <span className="font-semibold">{compliance}%</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all"
                      style={{ width: `${compliance}%` }}
                    />
                  </div>
                </>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              아직 NOW! 반응 데이터가 없어요.
              <br />
              세션을 시작하면 기록됩니다.
            </p>
          )}
        </div>

        {hasNoTeam && (
          <div className="rounded-xl border border-dashed border-border bg-muted/30 p-4 text-center">
            <p className="text-sm text-muted-foreground">
              팀에 참가하면 팀원 리더보드가 표시됩니다.
            </p>
          </div>
        )}

        {teamLeaderboards.map(({ code, rows }) => (
          <div
            key={code}
            className="rounded-xl border border-border bg-card p-4 space-y-3"
          >
            <p className="text-sm font-medium text-muted-foreground">
              팀 리더보드{' '}
              <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">
                {code}
              </span>
              <span className="ml-2 text-xs text-muted-foreground/60">
                (반응속도 순위)
              </span>
            </p>
            {rows.length === 0 ? (
              <p className="text-sm text-muted-foreground">멤버가 없어요.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-muted-foreground">
                    <th className="text-left pb-2 font-medium w-8">#</th>
                    <th className="text-left pb-2 font-medium">이름</th>
                    <th className="text-right pb-2 font-medium">준수율</th>
                    <th className="text-right pb-2 font-medium">반응속도</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {rows.map((row, i) => {
                    const t =
                      row.avgReactionMs > 0 && row.reactionCount > 0
                        ? reactionTier(row.avgReactionMs)
                        : null;
                    const medal =
                      i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : null;
                    const isMe = row.id === memberId;
                    return (
                      <tr
                        key={row.id}
                        className={isMe ? 'bg-primary/5' : ''}
                      >
                        <td className="py-2 pr-1">
                          <span className="flex items-center gap-1">
                            {medal ?? <span className="text-muted-foreground">{i + 1}</span>}
                            {row.delta !== 0 && (
                              <span
                                className={`text-[10px] font-bold ${
                                  row.delta > 0
                                    ? 'text-green-500'
                                    : 'text-red-500'
                                }`}
                              >
                                {rankDeltaIcon(row.delta)}
                                {Math.abs(row.delta)}
                              </span>
                            )}
                          </span>
                        </td>
                        <td className="py-2 font-medium">
                          {row.nickname}
                          {isMe && (
                            <span className="ml-1 text-xs text-primary">(나)</span>
                          )}
                        </td>
                        <td className="py-2 text-right">
                          {row.compliance !== null ? `${row.compliance}%` : '-'}
                        </td>
                        <td
                          className={`py-2 text-right ${
                            t?.color ?? 'text-muted-foreground'
                          }`}
                        >
                          {t ? (
                            <>
                              {t.grade} {msToSec(row.avgReactionMs)}
                            </>
                          ) : (
                            '-'
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
