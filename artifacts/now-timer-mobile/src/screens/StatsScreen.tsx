import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Platform,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSocial } from '@/context/SocialContext';
import { useTimer } from '@/context/TimerContext';
import { api } from '@/lib/api';
import {
  getSessions,
  getNowReactions,
  lastNDays,
  calcStreak,
  avgReactionMsCalc,
  complianceRateCalc,
  reactionTier,
  todayStr,
  totalWorkMinutes,
  clearAllStats,
  type SessionEvent,
  type NowReaction,
} from '@/lib/statsStorage';
import { colors } from '@/lib/colors';

type Period = 'today' | 'week' | 'month';

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

function formatWorkTime(minutes: number): { value: string; unit: string } {
  if (minutes < 60) {
    return { value: Math.round(minutes).toString(), unit: '분' };
  }
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  if (m === 0) return { value: h.toString(), unit: '시간' };
  return { value: `${h}시간 ${m}`, unit: '분' };
}

function rankDeltaIcon(delta: number): string {
  if (delta > 0) return '▲';
  if (delta < 0) return '▼';
  return '-';
}

/* ── Tomato images for daily display ── */

const TOMATO_IMAGES = [
  require('@/../assets/images/tomato1.png'),
  require('@/../assets/images/tomato2.png'),
  require('@/../assets/images/tomato3.png'),
  require('@/../assets/images/tomato4.png'),
  require('@/../assets/images/tomato5.png'),
];

function DailySessionRow({
  data,
  workDuration,
}: {
  data: { label: string; count: number }[];
  workDuration: number;
}) {
  return (
    <View style={chartStyles.container}>
      {data.map((d, i) => {
        const minutes = d.count * workDuration;
        return (
          <View key={i} style={chartStyles.dayRow}>
            <Text style={chartStyles.dayLabel}>{d.label}</Text>
            <View style={chartStyles.tomatoRow}>
              {d.count > 0 ? (
                Array.from({ length: Math.min(d.count, 8) }).map((_, ti) => (
                  <Image
                    key={ti}
                    source={TOMATO_IMAGES[ti % TOMATO_IMAGES.length]}
                    style={chartStyles.tomatoIcon}
                    resizeMode="contain"
                  />
                ))
              ) : (
                <Text style={chartStyles.emptyDash}>{'—'}</Text>
              )}
              {d.count > 8 && (
                <Text style={chartStyles.overflowText}>{`+${d.count - 8}`}</Text>
              )}
            </View>
            <Text style={chartStyles.dayStat}>
              {d.count > 0 ? `${minutes}분 / ${d.count}세션` : ''}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const chartStyles = StyleSheet.create({
  container: { gap: 6 },
  dayRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 3 },
  dayLabel: { fontSize: 11, fontFamily: 'KotraGothic', color: colors.mutedForeground, width: 36 },
  tomatoRow: { flexDirection: 'row', alignItems: 'center', gap: 2, flex: 1 },
  tomatoIcon: { width: 20, height: 20 },
  emptyDash: { fontSize: 14, color: colors.muted },
  overflowText: { fontSize: 11, fontFamily: 'KotraGothic', color: colors.mutedForeground, marginLeft: 2 },
  dayStat: { fontSize: 10, fontFamily: 'KotraGothic', color: colors.mutedForeground, width: 72, textAlign: 'right' },
});

/* ── Main screen ── */

export function StatsScreen() {
  const [period, setPeriod] = useState<Period>('week');
  const [refreshKey, setRefreshKey] = useState(0);
  const { memberships, allMembers, memberId, activeTeamCode } = useSocial();
  const { settings } = useTimer();
  const insets = useSafeAreaInsets();

  const [backendStats, setBackendStats] = useState<BackendStats | null>(null);
  const [backendLoading, setBackendLoading] = useState(false);

  const handleReset = () => {
    clearAllStats();
    setRefreshKey((k) => k + 1);
  };

  const activeMembership = useMemo(
    () => memberships.find((m) => m.code === activeTeamCode) ?? null,
    [memberships, activeTeamCode],
  );

  useEffect(() => {
    if (!activeMembership) return;
    setBackendLoading(true);
    const apiPeriod = period === 'month' ? 'all' : period;
    api
      .getStats(activeMembership.memberId, activeMembership.token, apiPeriod)
      .then((data) => { setBackendStats(data); setBackendLoading(false); })
      .catch(() => setBackendLoading(false));
  }, [activeMembership, period]);

  const sessions: SessionEvent[] = useMemo(() => getSessions(), [refreshKey]);
  const reactions: NowReaction[] = useMemo(() => getNowReactions(), [refreshKey]);
  const workSessions = useMemo(() => sessions.filter((s) => s.type === 'work'), [sessions]);

  const periodDays = period === 'today' ? 1 : period === 'week' ? 7 : 30;

  const filteredSessions = useMemo(() => {
    if (period === 'today') {
      const today = todayStr();
      return workSessions.filter((s) => s.date === today);
    }
    const days = new Set(lastNDays(periodDays));
    return workSessions.filter((s) => days.has(s.date));
  }, [workSessions, period, periodDays]);

  const filteredReactions = useMemo(() => {
    if (period === 'today') {
      const today = todayStr();
      return reactions.filter((r) => r.date === today);
    }
    const days = new Set(lastNDays(periodDays));
    return reactions.filter((r) => days.has(r.date));
  }, [reactions, period, periodDays]);

  // ── Derived stats ──
  const streak = useMemo(() => backendStats?.streak ?? calcStreak(sessions), [backendStats, sessions]);
  const totalWork = backendStats?.totalSessions ?? filteredSessions.length;
  const workMin = useMemo(() => totalWorkMinutes(filteredSessions), [filteredSessions]);
  const workTimeDisplay = formatWorkTime(workMin);

  const localAvgMs = useMemo(() => avgReactionMsCalc(filteredReactions), [filteredReactions]);
  const localCompliance = useMemo(() => complianceRateCalc(filteredReactions), [filteredReactions]);
  const avgMs = backendStats?.avgReactionMs ?? localAvgMs;
  const compliance = backendStats?.complianceRate ?? localCompliance;
  const tier = avgMs !== null ? reactionTier(avgMs) : null;

  // ── Bar chart data ──
  const barData = useMemo(() => {
    const serverDaily = backendStats?.daily;
    if (serverDaily && serverDaily.length > 0) {
      return serverDaily.map((d) => ({
        date: d.date, label: dateLabel(d.date), count: d.sessions, compRate: d.complianceRate,
      }));
    }
    if (period === 'today') {
      const today = todayStr();
      const count = filteredSessions.filter((s) => s.date === today).length;
      return [{ date: today, label: '오늘', count, compRate: localCompliance }];
    }
    const days = lastNDays(periodDays);
    const countMap = new Map<string, number>();
    for (const s of workSessions) {
      if (days.includes(s.date)) countMap.set(s.date, (countMap.get(s.date) ?? 0) + 1);
    }
    return days.map((d) => ({ date: d, label: dateLabel(d), count: countMap.get(d) ?? 0, compRate: null as number | null }));
  }, [backendStats, period, filteredSessions, workSessions, localCompliance, periodDays]);

  // ── Team leaderboard ──
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
          compliance: mem.nowCount > 0 ? Math.round((mem.dismissedCount / mem.nowCount) * 100) : null,
        }))
        .sort((a, b) => {
          const aHas = a.avgReactionMs > 0 && a.reactionCount > 0;
          const bHas = b.avgReactionMs > 0 && b.reactionCount > 0;
          if (aHas && bHas) return a.avgReactionMs - b.avgReactionMs;
          if (aHas) return -1;
          if (bHas) return 1;
          if (a.compliance !== null && b.compliance !== null) return b.compliance - a.compliance;
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

      return { code: m.code, name: m.teamName || '', rows: ranksWithDelta };
    });
  }, [memberships, allMembers]);

  const tabs: { key: Period; label: string }[] = [
    { key: 'today', label: '오늘' },
    { key: 'week', label: '주간' },
    { key: 'month', label: '월간' },
  ];

  const hasNoTeam = memberships.length === 0;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 100 }]}
    >
      <Text style={styles.title}>{'통계'}</Text>

      {/* Period tabs */}
      <View style={styles.tabsRow}>
        {tabs.map((t) => (
          <TouchableOpacity
            key={t.key}
            onPress={() => setPeriod(t.key)}
            style={[styles.tab, period === t.key && styles.tabActive]}
          >
            <Text style={[styles.tabText, period === t.key && styles.tabTextActive]}>
              {t.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ═══════════════════════════════════ */}
      {/*       SECTION 1: 내 작업           */}
      {/* ═══════════════════════════════════ */}

      <Text style={styles.sectionTitle}>{'내 작업'}</Text>

      {/* Streak */}
      {streak > 0 && (
        <View style={styles.streakCard}>
          <Text style={styles.streakEmoji}>{'🔥'}</Text>
          <View>
            <Text style={styles.streakTitle}>{streak}{'일 연속 집중 중'}</Text>
            <Text style={styles.streakSub}>
              {'오늘도 세션을 완료해 집중력을 이어가세요!'}
            </Text>
          </View>
        </View>
      )}

      {/* Total work time + Sessions — two stat boxes */}
      <View style={styles.statBoxRow}>
        <View style={styles.statBox}>
          <Text style={styles.statBoxLabel}>{'총 작업 시간'}</Text>
          <View style={styles.statBoxValueRow}>
            <Text style={styles.statBoxValue}>{workTimeDisplay.value}</Text>
            <Text style={styles.statBoxUnit}>{workTimeDisplay.unit}</Text>
          </View>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statBoxLabel}>{'완료 세션'}</Text>
          <View style={styles.statBoxValueRow}>
            <Text style={styles.statBoxValue}>{totalWork}</Text>
            <Text style={styles.statBoxUnit}>{'회'}</Text>
          </View>
        </View>
      </View>

      {/* Sessions chart */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardLabel}>
            {'일별 세션 '}
            {backendLoading && (
              <Text style={{ color: colors.mutedForeground, fontSize: 11 }}>
                {'(동기화 중)'}
              </Text>
            )}
          </Text>
        </View>
        <DailySessionRow data={barData} workDuration={settings.workDuration} />
      </View>

      {/* ═══════════════════════════════════ */}
      {/*       SECTION 2: 휴식 준수          */}
      {/* ═══════════════════════════════════ */}

      <Text style={styles.sectionTitle}>{'NOW! 준수'}</Text>

      {/* Compliance + Reaction speed */}
      <View style={styles.card}>
        {avgMs !== null && tier !== null ? (
          <View style={{ gap: 12 }}>
            {/* Compliance rate */}
            {compliance !== null && (
              <View style={{ gap: 6 }}>
                <View style={styles.complianceRow}>
                  <Text style={styles.cardLabel}>{'NOW! 준수율'}</Text>
                  <Text style={styles.complianceValue}>{compliance}%</Text>
                </View>
                <View style={styles.compTrack}>
                  <View
                    style={[
                      styles.compFill,
                      {
                        width: `${compliance}%`,
                        backgroundColor:
                          compliance >= 80 ? colors.green500
                            : compliance >= 50 ? '#eab308'
                              : colors.red500,
                      },
                    ]}
                  />
                </View>
                <Text style={styles.compHint}>
                  {'제때 일하고 제때 쉽시다!'}
                </Text>
              </View>
            )}

            {/* Reaction speed */}
            <View style={styles.divider} />
            <View style={{ gap: 4 }}>
              <Text style={styles.cardLabel}>{'NOW! 준수 속도'}</Text>
              <View style={styles.reactionRow}>
                <Text style={styles.reactionValue}>{msToSec(avgMs)}</Text>
                <Text style={[styles.reactionTier, { color: tier.color }]}>
                  {tier.grade} {tier.label}
                </Text>
              </View>
              <Text style={[styles.compHint, { color: tier.color }]}>
                {tier.description}
              </Text>
            </View>
          </View>
        ) : (
          <View>
            <Text style={styles.cardLabel}>{'NOW! 준수'}</Text>
            <Text style={styles.emptyHint}>
              {'아직 NOW! 반응 데이터가 없어요.\n세션을 시작하면 기록됩니다.'}
            </Text>
          </View>
        )}
      </View>

      {/* Daily compliance bars */}
      {backendStats && backendStats.daily.some((d) => d.complianceRate !== null) && (
        <View style={styles.card}>
          <Text style={styles.cardLabel}>{'일별 준수율'}</Text>
          <View style={{ gap: 8, marginTop: 8 }}>
            {backendStats.daily
              .filter((d) => d.complianceRate !== null)
              .slice(-7)
              .map((d) => (
                <View key={d.date} style={styles.compRow}>
                  <Text style={styles.compDate}>{dateLabel(d.date)}</Text>
                  <View style={styles.compTrack}>
                    <View
                      style={[
                        styles.compFill,
                        {
                          width: `${d.complianceRate ?? 0}%`,
                          backgroundColor:
                            (d.complianceRate ?? 0) >= 80 ? colors.green500
                              : (d.complianceRate ?? 0) >= 50 ? '#eab308'
                                : colors.red500,
                        },
                      ]}
                    />
                  </View>
                  <Text style={styles.compValue}>{d.complianceRate}%</Text>
                </View>
              ))}
          </View>
        </View>
      )}

      {/* ═══════════════════════════════════ */}
      {/*       SECTION 3: 팀 보드           */}
      {/* ═══════════════════════════════════ */}

      <Text style={styles.sectionTitle}>{'팀 보드'}</Text>

      {/* No team hint */}
      {hasNoTeam && (
        <View style={styles.noTeamCard}>
          <Text style={styles.noTeamText}>
            {'팀에 참가하면 팀원 리더보드가 표시됩니다.'}
          </Text>
        </View>
      )}

      {/* Team leaderboards */}
      {teamLeaderboards.map(({ code, name, rows }) => (
        <View key={code} style={styles.card}>
          <View style={styles.leaderHeader}>
            <Text style={styles.cardLabel}>{'NOW! 준수 속도 순위 '}</Text>
            <View style={styles.codeBadge}>
              <Text style={styles.codeBadgeText}>{name || code}</Text>
            </View>
          </View>
          {rows.length === 0 ? (
            <Text style={styles.emptyHint}>{'멤버가 없어요.'}</Text>
          ) : (
            <View style={styles.leaderTable}>
              {/* Header */}
              <View style={styles.leaderRow}>
                <Text style={[styles.leaderCell, styles.leaderHeaderText, { width: 28 }]}>#</Text>
                <Text style={[styles.leaderCell, styles.leaderHeaderText, { flex: 1 }]}>{'이름'}</Text>
                <Text style={[styles.leaderCell, styles.leaderHeaderText, { width: 50, textAlign: 'right' }]}>{'준수율'}</Text>
                <Text style={[styles.leaderCell, styles.leaderHeaderText, { width: 80, textAlign: 'right' }]}>{'준수속도'}</Text>
              </View>
              {rows.map((row, i) => {
                const t =
                  row.avgReactionMs > 0 && row.reactionCount > 0
                    ? reactionTier(row.avgReactionMs)
                    : null;
                const medal =
                  i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : null;
                const isMe = row.id === memberId;
                return (
                  <View
                    key={row.id}
                    style={[
                      styles.leaderRow,
                      isMe && { backgroundColor: 'rgba(232,87,58,0.05)' },
                      { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
                    ]}
                  >
                    <View style={[styles.leaderCell, { width: 28, flexDirection: 'row', alignItems: 'center', gap: 2 }]}>
                      <Text style={{ fontSize: 13, fontFamily: 'KotraGothic' }}>{medal ?? `${i + 1}`}</Text>
                      {row.delta !== 0 && (
                        <Text
                          style={{
                            fontSize: 9,
                            fontFamily: 'KotraBold',
                            color: row.delta > 0 ? colors.green500 : colors.red500,
                          }}
                        >
                          {rankDeltaIcon(row.delta)}{Math.abs(row.delta)}
                        </Text>
                      )}
                    </View>
                    <View style={[styles.leaderCell, { flex: 1, flexDirection: 'row', gap: 4 }]}>
                      <Text style={{ fontSize: 13, fontFamily: 'KotraGothic', color: colors.foreground }} numberOfLines={1}>
                        {row.nickname}
                      </Text>
                      {isMe && <Text style={{ fontSize: 12, color: colors.tomato }}>{'(나)'}</Text>}
                    </View>
                    <Text style={[styles.leaderCell, { width: 50, textAlign: 'right', fontSize: 13, fontFamily: 'Komputa-Regular', color: colors.foreground }]}>
                      {row.compliance !== null ? `${row.compliance}%` : '-'}
                    </Text>
                    <Text
                      style={[
                        styles.leaderCell,
                        { width: 80, textAlign: 'right', fontSize: 13, fontFamily: 'Komputa-Regular', color: t?.color ?? colors.mutedForeground },
                      ]}
                    >
                      {t ? `${t.grade} ${msToSec(row.avgReactionMs)}` : '-'}
                    </Text>
                  </View>
                );
              })}
            </View>
          )}
        </View>
      ))}

      {/* Reset */}
      <TouchableOpacity onPress={handleReset} style={styles.resetButton}>
        <Text style={styles.resetText}>{'통계 초기화'}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingHorizontal: 16,
    gap: 12,
  },
  title: {
    fontSize: 24,
    fontFamily: 'KotraBold',
    color: colors.foreground,
    letterSpacing: -0.5,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: 'KotraBold',
    color: colors.foreground,
    marginTop: 8,
  },
  tabsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 20,
    alignItems: 'center',
    backgroundColor: colors.muted,
  },
  tabActive: {
    backgroundColor: colors.tomato,
  },
  tabText: {
    fontSize: 14,
    fontFamily: 'KotraGothic',
    color: colors.mutedForeground,
  },
  tabTextActive: {
    color: '#fff',
    fontFamily: 'KotraBold',
  },
  streakCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 12,
    backgroundColor: colors.amber50,
    borderWidth: 1,
    borderColor: '#fde68a',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  streakEmoji: {
    fontSize: 24,
  },
  streakTitle: {
    fontFamily: 'KotraBold',
    color: '#92400e',
    fontSize: 14,
  },
  streakSub: {
    fontSize: 12,
    fontFamily: 'KotraGothic',
    color: '#b45309',
    marginTop: 2,
  },
  /* Two stat boxes side by side */
  statBoxRow: {
    flexDirection: 'row',
    gap: 12,
  },
  statBox: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    padding: 16,
    gap: 4,
  },
  statBoxLabel: {
    fontSize: 12,
    fontFamily: 'KotraGothic',
    color: colors.mutedForeground,
  },
  statBoxValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 2,
  },
  statBoxValue: {
    fontSize: 28,
    fontFamily: 'Komputa-Bold',
    color: colors.foreground,
  },
  statBoxUnit: {
    fontSize: 14,
    fontFamily: 'KotraGothic',
    color: colors.mutedForeground,
  },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  cardLabel: {
    fontSize: 14,
    fontFamily: 'KotraGothic',
    color: colors.mutedForeground,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
  },
  complianceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  complianceValue: {
    fontSize: 20,
    fontFamily: 'Komputa-Bold',
    color: colors.foreground,
  },
  compHint: {
    fontSize: 12,
    fontFamily: 'KotraGothic',
    color: colors.mutedForeground,
    marginTop: 2,
  },
  compRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  compDate: {
    fontSize: 11,
    color: colors.mutedForeground,
    width: 32,
  },
  compTrack: {
    flex: 1,
    height: 8,
    backgroundColor: colors.muted,
    borderRadius: 4,
    overflow: 'hidden',
  },
  compFill: {
    height: '100%',
    borderRadius: 4,
  },
  compValue: {
    fontSize: 12,
    fontFamily: 'Komputa-Regular',
    width: 36,
    textAlign: 'right',
    color: colors.foreground,
  },
  reactionRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  reactionValue: {
    fontSize: 28,
    fontFamily: 'Komputa-Bold',
    color: colors.foreground,
  },
  reactionTier: {
    fontSize: 18,
    fontFamily: 'KotraBold',
  },
  emptyHint: {
    fontSize: 14,
    fontFamily: 'KotraGothic',
    color: colors.mutedForeground,
    marginTop: 8,
    lineHeight: 22,
  },
  noTeamCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.border,
    backgroundColor: 'rgba(241,245,249,0.3)',
    padding: 16,
    alignItems: 'center',
  },
  noTeamText: {
    fontSize: 14,
    fontFamily: 'KotraGothic',
    color: colors.mutedForeground,
  },
  leaderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  codeBadge: {
    backgroundColor: colors.muted,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  codeBadgeText: {
    fontSize: 11,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    color: colors.foreground,
  },
  leaderTable: {
    marginTop: 4,
  },
  leaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  leaderCell: {},
  leaderHeaderText: {
    fontSize: 11,
    fontFamily: 'KotraGothic',
    color: colors.mutedForeground,
  },
  resetButton: {
    alignSelf: 'center',
    paddingVertical: 10,
    paddingHorizontal: 20,
    marginTop: 8,
  },
  resetText: {
    fontSize: 12,
    fontFamily: 'KotraGothic',
    color: colors.mutedForeground,
    textDecorationLine: 'underline',
  },
});
