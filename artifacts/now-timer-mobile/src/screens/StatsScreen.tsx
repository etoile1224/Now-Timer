import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
  todayStr,
  type SessionEvent,
  type NowReaction,
} from '@/lib/statsStorage';
import { colors } from '@/lib/colors';

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
  return (ms / 1000).toFixed(1) + '\uCD08';
}

function rankDeltaIcon(delta: number): string {
  if (delta > 0) return '\u25B2';
  if (delta < 0) return '\u25BC';
  return '-';
}

function SimpleBarChart({
  data,
  maxVal,
}: {
  data: { label: string; count: number }[];
  maxVal: number;
}) {
  const barMax = Math.max(maxVal, 4);
  return (
    <View style={chartStyles.container}>
      <View style={chartStyles.barsRow}>
        {data.map((d, i) => {
          const height = barMax > 0 ? (d.count / barMax) * 100 : 0;
          return (
            <View key={i} style={chartStyles.barCol}>
              <View style={chartStyles.barTrack}>
                <View
                  style={[
                    chartStyles.barFill,
                    {
                      height: `${height}%`,
                      backgroundColor: d.count > 0 ? colors.primary : colors.muted,
                    },
                  ]}
                />
              </View>
              <Text style={chartStyles.barLabel} numberOfLines={1}>
                {d.label}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const chartStyles = StyleSheet.create({
  container: {
    height: 140,
  },
  barsRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 2,
  },
  barCol: {
    flex: 1,
    alignItems: 'center',
  },
  barTrack: {
    width: '80%',
    height: 100,
    justifyContent: 'flex-end',
  },
  barFill: {
    width: '100%',
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
    minHeight: 2,
  },
  barLabel: {
    fontSize: 9,
    color: colors.mutedForeground,
    marginTop: 4,
    textAlign: 'center',
  },
});

export function StatsScreen() {
  const [period, setPeriod] = useState<Period>('week');
  const { memberships, allMembers, memberId, activeTeamCode } = useSocial();
  const insets = useSafeAreaInsets();

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
      const today = todayStr();
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
      const today = todayStr();
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
      const today = todayStr();
      const count = filteredSessions.filter((s) => s.date === today).length;
      return [{ date: today, label: '\uC624\uB298', count, compRate: localCompliance }];
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

      return { code: m.code, rows: ranksWithDelta };
    });
  }, [memberships, allMembers]);

  const tabs: { key: Period; label: string }[] = [
    { key: 'today', label: '\uC624\uB298' },
    { key: 'week', label: '\uC8FC\uAC04' },
    { key: 'all', label: '\uC804\uCCB4' },
  ];

  const hasNoTeam = memberships.length === 0;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 100 }]}
    >
      <Text style={styles.title}>{'\uD1B5\uACC4'}</Text>

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

      {/* Streak */}
      {streak > 0 && (
        <View style={styles.streakCard}>
          <Text style={styles.streakEmoji}>{'\uD83D\uDD25'}</Text>
          <View>
            <Text style={styles.streakTitle}>{streak}{'\uC77C \uC5F0\uC18D \uC9D1\uC911 \uC911'}</Text>
            <Text style={styles.streakSub}>
              {'\uC624\uB298\uB3C4 \uC138\uC158\uC744 \uC644\uB8CC\uD574 \uC2A4\uD2B8\uB9AD\uC744 \uC774\uC5B4\uAC00\uC138\uC694!'}
            </Text>
          </View>
        </View>
      )}

      {/* Sessions chart */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardLabel}>
            {'\uC644\uB8CC \uC138\uC158 '}
            {backendLoading && (
              <Text style={{ color: colors.mutedForeground, fontSize: 11 }}>
                {'(\uB3D9\uAE30\uD654 \uC911)'}
              </Text>
            )}
          </Text>
          <View style={styles.cardValueRow}>
            <Text style={styles.cardValue}>{totalWork}</Text>
            <Text style={styles.cardUnit}>{'\uD68C'}</Text>
          </View>
        </View>
        <SimpleBarChart data={barData} maxVal={maxBar} />
      </View>

      {/* Compliance bars */}
      {backendStats && backendStats.daily.some((d) => d.complianceRate !== null) && (
        <View style={styles.card}>
          <Text style={styles.cardLabel}>{'\uC77C\uBCC4 NOW! \uC900\uC218\uC728'}</Text>
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
                            (d.complianceRate ?? 0) >= 80
                              ? colors.green500
                              : (d.complianceRate ?? 0) >= 50
                                ? '#eab308'
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

      {/* Reaction speed */}
      <View style={styles.card}>
        <Text style={styles.cardLabel}>{'NOW! \uBC18\uC751 \uC18D\uB3C4'}</Text>
        {avgMs !== null && tier !== null ? (
          <View style={{ gap: 8, marginTop: 8 }}>
            <View style={styles.reactionRow}>
              <Text style={styles.reactionValue}>{msToSec(avgMs)}</Text>
              <Text style={[styles.reactionTier, { color: tier.color }]}>
                {tier.grade} {tier.label}
              </Text>
            </View>
            {compliance !== null && (
              <>
                <View style={styles.complianceRow}>
                  <Text style={styles.complianceLabel}>{'\uC804\uCCB4 \uC900\uC218\uC728'}</Text>
                  <Text style={styles.complianceValue}>{compliance}%</Text>
                </View>
                <View style={styles.compTrack}>
                  <View
                    style={[styles.compFill, { width: `${compliance}%`, backgroundColor: colors.primary }]}
                  />
                </View>
              </>
            )}
          </View>
        ) : (
          <Text style={styles.emptyHint}>
            {'\uC544\uC9C1 NOW! \uBC18\uC751 \uB370\uC774\uD130\uAC00 \uC5C6\uC5B4\uC694.\n\uC138\uC158\uC744 \uC2DC\uC791\uD558\uBA74 \uAE30\uB85D\uB429\uB2C8\uB2E4.'}
          </Text>
        )}
      </View>

      {/* No team hint */}
      {hasNoTeam && (
        <View style={styles.noTeamCard}>
          <Text style={styles.noTeamText}>
            {'\uD300\uC5D0 \uCC38\uAC00\uD558\uBA74 \uD300\uC6D0 \uB9AC\uB354\uBCF4\uB4DC\uAC00 \uD45C\uC2DC\uB429\uB2C8\uB2E4.'}
          </Text>
        </View>
      )}

      {/* Team leaderboards */}
      {teamLeaderboards.map(({ code, rows }) => (
        <View key={code} style={styles.card}>
          <View style={styles.leaderHeader}>
            <Text style={styles.cardLabel}>
              {'\uD300 \uB9AC\uB354\uBCF4\uB4DC '}
            </Text>
            <View style={styles.codeBadge}>
              <Text style={styles.codeBadgeText}>{code}</Text>
            </View>
            <Text style={styles.leaderSub}>{' (\uBC18\uC751\uC18D\uB3C4 \uC21C\uC704)'}</Text>
          </View>
          {rows.length === 0 ? (
            <Text style={styles.emptyHint}>{'\uBA64\uBC84\uAC00 \uC5C6\uC5B4\uC694.'}</Text>
          ) : (
            <View style={styles.leaderTable}>
              {/* Header */}
              <View style={styles.leaderRow}>
                <Text style={[styles.leaderCell, styles.leaderHeaderText, { width: 28 }]}>#</Text>
                <Text style={[styles.leaderCell, styles.leaderHeaderText, { flex: 1 }]}>{'\uC774\uB984'}</Text>
                <Text style={[styles.leaderCell, styles.leaderHeaderText, { width: 50, textAlign: 'right' }]}>{'\uC900\uC218\uC728'}</Text>
                <Text style={[styles.leaderCell, styles.leaderHeaderText, { width: 80, textAlign: 'right' }]}>{'\uBC18\uC751\uC18D\uB3C4'}</Text>
              </View>
              {rows.map((row, i) => {
                const t =
                  row.avgReactionMs > 0 && row.reactionCount > 0
                    ? reactionTier(row.avgReactionMs)
                    : null;
                const medal =
                  i === 0 ? '\uD83E\uDD47' : i === 1 ? '\uD83E\uDD48' : i === 2 ? '\uD83E\uDD49' : null;
                const isMe = row.id === memberId;
                return (
                  <View
                    key={row.id}
                    style={[
                      styles.leaderRow,
                      isMe && { backgroundColor: 'rgba(75,158,255,0.05)' },
                      { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
                    ]}
                  >
                    <View style={[styles.leaderCell, { width: 28, flexDirection: 'row', alignItems: 'center', gap: 2 }]}>
                      <Text style={{ fontSize: 13 }}>{medal ?? `${i + 1}`}</Text>
                      {row.delta !== 0 && (
                        <Text
                          style={{
                            fontSize: 9,
                            fontWeight: '700',
                            color: row.delta > 0 ? colors.green500 : colors.red500,
                          }}
                        >
                          {rankDeltaIcon(row.delta)}{Math.abs(row.delta)}
                        </Text>
                      )}
                    </View>
                    <View style={[styles.leaderCell, { flex: 1, flexDirection: 'row', gap: 4 }]}>
                      <Text style={{ fontSize: 13, fontWeight: '500', color: colors.foreground }} numberOfLines={1}>
                        {row.nickname}
                      </Text>
                      {isMe && <Text style={{ fontSize: 12, color: colors.primary }}>({'\uB098'})</Text>}
                    </View>
                    <Text style={[styles.leaderCell, { width: 50, textAlign: 'right', fontSize: 13, color: colors.foreground }]}>
                      {row.compliance !== null ? `${row.compliance}%` : '-'}
                    </Text>
                    <Text
                      style={[
                        styles.leaderCell,
                        { width: 80, textAlign: 'right', fontSize: 13, color: t?.color ?? colors.mutedForeground },
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
    gap: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.foreground,
    letterSpacing: -0.5,
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
    backgroundColor: colors.primary,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.mutedForeground,
  },
  tabTextActive: {
    color: '#fff',
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
    fontWeight: '600',
    color: '#92400e',
    fontSize: 14,
  },
  streakSub: {
    fontSize: 12,
    color: '#b45309',
    marginTop: 2,
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
    fontWeight: '500',
    color: colors.mutedForeground,
  },
  cardValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  cardValue: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.foreground,
  },
  cardUnit: {
    fontSize: 14,
    color: colors.mutedForeground,
    marginLeft: 4,
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
    fontWeight: '500',
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
    fontWeight: '700',
    color: colors.foreground,
  },
  reactionTier: {
    fontSize: 18,
    fontWeight: '600',
  },
  complianceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  complianceLabel: {
    fontSize: 14,
    color: colors.mutedForeground,
  },
  complianceValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.foreground,
  },
  emptyHint: {
    fontSize: 14,
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
  leaderSub: {
    fontSize: 11,
    color: colors.mutedForeground,
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
    fontWeight: '500',
    color: colors.mutedForeground,
  },
});
