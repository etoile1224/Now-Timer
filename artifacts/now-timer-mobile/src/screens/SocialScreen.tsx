import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Vibration,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import QRCode from 'react-native-qrcode-svg';
import { Users, Copy, Check, LogOut, Zap, QrCode, Plus, Pencil } from 'lucide-react-native';
import { useSocial } from '@/context/SocialContext';
import { API_BASE_URL, type Member } from '@/lib/api';
import { VIBRATION_TAP } from '@/lib/constants';
import { PixelAvatar, parseAvatarData } from '@/components/PixelAvatar';
import { useI18n, type Translations } from '@/lib/i18n';
import { colors } from '@/lib/colors';

const MAX_TEAMS = 5;

function statusLabel(m: Member, t: Translations): { text: string; bgColor: string; textColor: string } {
  switch (m.status) {
    case 'focusing':
      return { text: t.social_statusFocusing, bgColor: colors.blue100, textColor: colors.blue700 };
    case 'breaking':
      return { text: t.social_statusBreaking, bgColor: colors.green100, textColor: colors.green700 };
    case 'nowAlert':
    case 'returnAlert':
      if (m.ignoreLevel >= 3)
        return { text: t.social_statusNowIgnore(m.ignoreLevel), bgColor: '#fef2f2', textColor: colors.red700 };
      if (m.ignoreLevel === 2)
        return { text: t.social_statusNowIgnore(2), bgColor: '#fff7ed', textColor: '#9a3412' };
      return { text: t.social_statusNowAlert, bgColor: '#fef9c3', textColor: '#854d0e' };
    default:
      return { text: t.social_statusIdle, bgColor: colors.gray100, textColor: colors.gray500 };
  }
}

function complianceRate(m: Member): number | null {
  if (m.nowCount === 0) return null;
  return Math.round((m.dismissedCount / m.nowCount) * 100);
}

function MemberCard({
  member,
  isMe,
  onPoke,
}: {
  member: Member;
  isMe: boolean;
  onPoke: () => void;
}) {
  const { t } = useI18n();
  const { text, bgColor, textColor } = statusLabel(member, t);
  const rate = complianceRate(member);
  const canPoke =
    !isMe &&
    (member.status === 'nowAlert' || member.status === 'returnAlert');
  const [pokeSent, setPokeSent] = useState(false);

  const handlePoke = () => {
    onPoke();
    Vibration.vibrate(VIBRATION_TAP);
    setPokeSent(true);
    setTimeout(() => setPokeSent(false), 2000);
  };

  return (
    <View style={[memberStyles.card, isMe && memberStyles.cardMe]}>
      <PixelAvatar
        data={parseAvatarData(member.avatarData)}
        size={36}
        fallbackLetter={member.nickname}
      />

      <View style={memberStyles.info}>
        <View style={memberStyles.nameRow}>
          <Text style={memberStyles.name} numberOfLines={1}>
            {member.nickname}
          </Text>
          {isMe && <Text style={memberStyles.meTag}>{t.social_me}</Text>}
        </View>
        <View style={memberStyles.statusRow}>
          <View style={[memberStyles.statusBadge, { backgroundColor: bgColor }]}>
            <Text style={[memberStyles.statusText, { color: textColor }]}>{text}</Text>
          </View>
          {rate !== null && (
            <Text style={memberStyles.rateText}>{rate}%</Text>
          )}
        </View>
      </View>

      {canPoke && (
        <TouchableOpacity
          onPress={handlePoke}
          disabled={pokeSent}
          style={[memberStyles.pokeButton, pokeSent && memberStyles.pokeSent]}
          activeOpacity={0.7}
        >
          <Zap size={12} color={pokeSent ? '#fff' : '#ea580c'} />
          <Text style={[memberStyles.pokeText, pokeSent && { color: '#fff' }]}>
            {pokeSent ? t.social_pokeSent : t.social_poke}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const memberStyles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    marginBottom: 8,
  },
  cardMe: {
    borderColor: colors.tomato,
    backgroundColor: 'rgba(232,87,58,0.05)',
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.muted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 14,
    fontFamily: 'KotraBold',
    color: colors.mutedForeground,
  },
  info: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  name: {
    fontSize: 14,
    fontFamily: 'KotraBold',
    color: colors.foreground,
    flexShrink: 1,
  },
  meTag: {
    fontSize: 12,
    color: colors.tomato,
    fontFamily: 'KotraGothic',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  statusText: {
    fontSize: 11,
    fontFamily: 'KotraGothic',
  },
  rateText: {
    fontSize: 12,
    color: colors.mutedForeground,
  },
  pokeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#fff7ed',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#fed7aa',
  },
  pokeText: {
    fontSize: 12,
    fontFamily: 'KotraBold',
    color: '#ea580c',
  },
  pokeSent: {
    backgroundColor: '#ea580c',
    borderColor: '#ea580c',
  },
});

function TeamStats({
  members,
  myId,
}: {
  members: Record<string, Member>;
  myId: string;
}) {
  const { t } = useI18n();
  const list = Object.values(members);
  const me = members[myId];
  const totalPokes = list.reduce((s, m) => s + (m.pokeCount ?? 0), 0);
  const myPokes = me?.pokeCount ?? 0;

  return (
    <View style={teamStatsStyles.row}>
      <View style={teamStatsStyles.statCard}>
        <Text style={teamStatsStyles.statValue}>{totalPokes}</Text>
        <Text style={teamStatsStyles.statLabel}>{t.social_teamPokes}</Text>
      </View>
      <View style={teamStatsStyles.statCard}>
        <Text style={teamStatsStyles.statValue}>{myPokes}</Text>
        <Text style={teamStatsStyles.statLabel}>{t.social_myPokes}</Text>
      </View>
    </View>
  );
}

const teamStatsStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: 12,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontFamily: 'Komputa-Bold',
    color: colors.foreground,
  },
  statLabel: {
    fontSize: 12,
    color: colors.mutedForeground,
    marginTop: 2,
  },
});

function TeamView() {
  const { activeTeamCode, memberId, members, memberships, poke, leaveTeam, renameTeam } = useSocial();
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState('');

  const activeMembership = memberships.find((m) => m.code === activeTeamCode);
  const teamName = activeMembership?.teamName || '';

  const joinUrl = activeTeamCode
    ? `${API_BASE_URL}/social?join=${activeTeamCode}`
    : '';

  const copyCode = async () => {
    if (!activeTeamCode) return;
    await Clipboard.setStringAsync(activeTeamCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const startRename = () => {
    setNameInput(teamName);
    setEditingName(true);
  };

  const confirmRename = async () => {
    if (!activeTeamCode) return;
    const trimmed = nameInput.trim();
    await renameTeam(activeTeamCode, trimmed);
    setEditingName(false);
  };

  const memberList = Object.values(members).sort((a) =>
    a.id === memberId ? -1 : 1,
  );

  return (
    <View style={{ gap: 16 }}>
      {/* Team name + code card */}
      <View style={teamStyles.codeCard}>
        {/* Team name */}
        <View style={teamStyles.teamNameRow}>
          {editingName ? (
            <View style={teamStyles.nameEditRow}>
              <TextInput
                style={teamStyles.nameEditInput}
                value={nameInput}
                onChangeText={(v) => setNameInput(v.slice(0, 30))}
                placeholder={t.social_teamNameInput}
                placeholderTextColor={colors.mutedForeground}
                autoFocus
                onSubmitEditing={confirmRename}
              />
              <TouchableOpacity onPress={confirmRename} style={teamStyles.nameEditBtn}>
                <Check size={14} color={colors.stem} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setEditingName(false)} style={teamStyles.nameEditBtn}>
                <Text style={{ fontSize: 14, color: colors.mutedForeground }}>{'✕'}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity onPress={startRename} style={teamStyles.teamNameBtn} activeOpacity={0.7}>
              <Text style={teamStyles.teamNameText} numberOfLines={1}>
                {teamName || t.social_teamName}
              </Text>
              <Pencil size={12} color={colors.mutedForeground} />
            </TouchableOpacity>
          )}
        </View>

        <Text style={teamStyles.codeLabel}>{t.social_teamCode}</Text>
        <View style={teamStyles.codeRow}>
          <Text style={teamStyles.codeText}>{activeTeamCode}</Text>
          <TouchableOpacity
            onPress={copyCode}
            style={[teamStyles.codeButton, copied && { backgroundColor: '#dcfce7' }]}
            activeOpacity={0.7}
          >
            {copied ? <Check size={14} color={colors.green700} /> : <Copy size={14} color={colors.mutedForeground} />}
            <Text style={[teamStyles.codeButtonText, copied && { color: colors.green700 }]}>
              {copied ? t.social_copied : t.social_copy}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setShowQr((v) => !v)}
            style={[teamStyles.iconButton, showQr && { backgroundColor: 'rgba(232,87,58,0.1)' }]}
          >
            <QrCode size={16} color={showQr ? colors.tomato : colors.mutedForeground} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => activeTeamCode && leaveTeam(activeTeamCode)}
            style={teamStyles.iconButton}
          >
            <LogOut size={14} color={colors.mutedForeground} />
          </TouchableOpacity>
        </View>
        <Text style={teamStyles.codeHint}>
          {t.social_shareHint}
        </Text>

        {showQr && joinUrl ? (
          <View style={teamStyles.qrContainer}>
            <View style={teamStyles.qrBox}>
              <QRCode value={joinUrl} size={160} />
            </View>
            <Text style={teamStyles.qrHint}>
              {t.social_qrHint}
            </Text>
          </View>
        ) : null}
      </View>

      {/* Team stats */}
      {memberId && <TeamStats members={members} myId={memberId} />}

      {/* Members */}
      <View>
        <Text style={teamStyles.membersLabel}>
          {t.social_members(memberList.length)}
        </Text>
        {memberList.length === 0 && (
          <Text style={teamStyles.emptyText}>
            {t.social_noMembers}
          </Text>
        )}
        {memberList.map((m) => (
          <MemberCard
            key={m.id}
            member={m}
            isMe={m.id === memberId}
            onPoke={() => poke(m.id)}
          />
        ))}
      </View>
    </View>
  );
}

const teamStyles = StyleSheet.create({
  codeCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: 16,
  },
  teamNameRow: {
    marginBottom: 12,
  },
  teamNameBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  teamNameText: {
    fontSize: 18,
    fontFamily: 'KotraBold',
    color: colors.foreground,
    flexShrink: 1,
  },
  nameEditRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  nameEditInput: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: colors.cream,
    borderWidth: 1,
    borderColor: colors.border,
    fontSize: 16,
    fontFamily: 'KotraBold',
    color: colors.foreground,
  },
  nameEditBtn: {
    padding: 8,
  },
  codeLabel: {
    fontSize: 11,
    fontFamily: 'KotraGothic',
    color: colors.mutedForeground,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  codeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  codeText: {
    fontSize: 24,
    fontFamily: 'Komputa-Bold',
    letterSpacing: 4,
    color: colors.foreground,
    flex: 1,
  },
  codeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: colors.muted,
  },
  codeButtonText: {
    fontSize: 13,
    fontFamily: 'KotraGothic',
    color: colors.mutedForeground,
  },
  iconButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  codeHint: {
    fontSize: 12,
    fontFamily: 'KotraGothic',
    color: colors.mutedForeground,
    marginTop: 8,
  },
  qrContainer: {
    alignItems: 'center',
    gap: 8,
    marginTop: 16,
  },
  qrBox: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  qrHint: {
    fontSize: 12,
    fontFamily: 'KotraGothic',
    color: colors.mutedForeground,
    textAlign: 'center',
  },
  membersLabel: {
    fontSize: 11,
    fontFamily: 'KotraGothic',
    color: colors.mutedForeground,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: colors.mutedForeground,
    textAlign: 'center',
    paddingVertical: 16,
  },
});

type JoinView = 'landing' | 'create' | 'join';

function AddTeamView({ onCancel }: { onCancel?: () => void }) {
  const { createTeam, joinTeam, memberships } = useSocial();
  const { t } = useI18n();
  const [view, setView] = useState<JoinView>('landing');
  const [nickname, setNickname] = useState('');
  const [teamNameInput, setTeamNameInput] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const isAddMode = memberships.length > 0;

  async function handleCreate() {
    if (!nickname.trim()) { setError(t.social_errNickname); return; }
    setLoading(true);
    setError('');
    try {
      await createTeam(nickname.trim(), teamNameInput.trim() || undefined);
    } catch {
      setError(t.social_errCreateFail);
    } finally {
      setLoading(false);
    }
  }

  async function handleJoin() {
    if (!code.trim() || !nickname.trim()) {
      setError(t.social_errBothRequired);
      return;
    }
    setLoading(true);
    setError('');
    try {
      await joinTeam(code.trim(), nickname.trim());
      onCancel?.();
    } catch (e: unknown) {
      if (e instanceof Error && e.message === 'already_joined') {
        setError(t.social_errAlreadyJoined);
      } else {
        setError(t.social_errNotFound);
      }
    } finally {
      setLoading(false);
    }
  }

  if (view === 'landing') {
    return (
      <View style={addStyles.landing}>
        {!isAddMode && (
          <View style={addStyles.iconCircle}>
            <Users size={32} color={colors.tomato} />
          </View>
        )}
        <View style={addStyles.textCenter}>
          <Text style={addStyles.heading}>
            {isAddMode ? t.social_addTeam : t.social_focusTogether}
          </Text>
          <Text style={addStyles.description}>
            {isAddMode ? t.social_addTeamDesc : t.social_focusTogetherDesc}
          </Text>
        </View>
        <View style={addStyles.buttons}>
          <TouchableOpacity
            onPress={() => setView('create')}
            style={addStyles.primaryButton}
            activeOpacity={0.8}
          >
            <Text style={addStyles.primaryButtonText}>{t.social_createTeam}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setView('join')}
            style={addStyles.secondaryButton}
            activeOpacity={0.8}
          >
            <Text style={addStyles.secondaryButtonText}>{t.social_joinByCode}</Text>
          </TouchableOpacity>
          {isAddMode && onCancel && (
            <TouchableOpacity onPress={onCancel}>
              <Text style={addStyles.cancelText}>{t.social_cancel}</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  }

  return (
    <View style={addStyles.formContainer}>
      <TouchableOpacity onPress={() => { setView('landing'); setError(''); }}>
        <Text style={addStyles.backText}>{t.social_back}</Text>
      </TouchableOpacity>

      <Text style={addStyles.formTitle}>
        {view === 'create' ? t.social_createTeam : t.social_joinTeam}
      </Text>

      {view === 'create' && (
        <>
          <Text style={addStyles.inputLabel}>{t.social_teamNameLabel}</Text>
          <TextInput
            style={addStyles.input}
            placeholder={t.social_teamNamePlaceholder}
            placeholderTextColor={colors.mutedForeground}
            value={teamNameInput}
            onChangeText={(v) => setTeamNameInput(v.slice(0, 30))}
            autoCorrect={false}
          />
        </>
      )}

      {view === 'join' && (
        <>
          <Text style={addStyles.inputLabel}>{t.social_teamCode}</Text>
          <TextInput
            style={addStyles.inputCode}
            placeholder={t.social_teamCodePlaceholder}
            placeholderTextColor={colors.mutedForeground}
            value={code}
            onChangeText={(v) => setCode(v.toUpperCase().slice(0, 6))}
            autoCapitalize="characters"
            autoCorrect={false}
          />
        </>
      )}

      <Text style={addStyles.inputLabel}>{t.social_nickname}</Text>
      <TextInput
        style={addStyles.input}
        placeholder={t.social_nicknamePlaceholder}
        placeholderTextColor={colors.mutedForeground}
        value={nickname}
        onChangeText={(v) => setNickname(v.slice(0, 20))}
        autoCorrect={false}
      />

      {error ? <Text style={addStyles.errorText}>{error}</Text> : null}

      <TouchableOpacity
        onPress={view === 'create' ? handleCreate : handleJoin}
        disabled={loading}
        style={[addStyles.primaryButton, loading && { opacity: 0.5 }]}
        activeOpacity={0.8}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={addStyles.primaryButtonText}>
            {view === 'create' ? t.social_createTeam : t.social_join}
          </Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const addStyles = StyleSheet.create({
  landing: {
    alignItems: 'center',
    gap: 24,
    paddingTop: 32,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: 'rgba(232,87,58,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  textCenter: {
    alignItems: 'center',
  },
  heading: {
    fontSize: 20,
    fontFamily: 'KotraBold',
    color: colors.foreground,
    marginBottom: 4,
  },
  description: {
    fontSize: 14,
    fontFamily: 'KotraGothic',
    color: colors.mutedForeground,
    textAlign: 'center',
    lineHeight: 22,
  },
  buttons: {
    width: '100%',
    gap: 12,
  },
  primaryButton: {
    width: '100%',
    paddingVertical: 16,
    backgroundColor: colors.tomato,
    borderRadius: 16,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'KotraBold',
  },
  secondaryButton: {
    width: '100%',
    paddingVertical: 14,
    backgroundColor: colors.cream,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: colors.foreground,
    fontSize: 16,
    fontFamily: 'KotraGothic',
  },
  cancelText: {
    fontSize: 14,
    fontFamily: 'KotraGothic',
    color: colors.mutedForeground,
    textAlign: 'center',
    marginTop: 4,
  },
  formContainer: {
    gap: 12,
  },
  backText: {
    fontSize: 14,
    fontFamily: 'KotraGothic',
    color: colors.mutedForeground,
  },
  formTitle: {
    fontSize: 18,
    fontFamily: 'KotraBold',
    color: colors.foreground,
  },
  inputLabel: {
    fontSize: 14,
    fontFamily: 'KotraGothic',
    color: colors.foreground,
  },
  input: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: colors.cream,
    borderWidth: 1.5,
    borderColor: colors.border,
    fontSize: 14,
    color: colors.foreground,
  },
  inputCode: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: colors.cream,
    borderWidth: 1.5,
    borderColor: colors.border,
    fontSize: 18,
    fontFamily: 'Komputa-Bold',
    letterSpacing: 4,
    color: colors.foreground,
  },
  errorText: {
    fontSize: 14,
    fontFamily: 'KotraGothic',
    color: colors.destructive,
  },
});

export function SocialScreen() {
  const { memberships, activeTeamCode, setActiveTeamCode } = useSocial();
  const { t } = useI18n();
  const insets = useSafeAreaInsets();

  const hasTeams = memberships.length > 0;
  const [addingTeam, setAddingTeam] = useState(false);
  const canAddMore = memberships.length < MAX_TEAMS;
  const showAddView = !hasTeams || addingTeam;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 100 }]}
    >
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t.social_title}</Text>
      </View>

      {hasTeams && !addingTeam && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.teamTabs}
          contentContainerStyle={styles.teamTabsContent}
        >
          {memberships.map((m) => (
            <TouchableOpacity
              key={m.code}
              onPress={() => setActiveTeamCode(m.code)}
              style={[
                styles.teamTab,
                activeTeamCode === m.code && styles.teamTabActive,
              ]}
            >
              <Text
                style={[
                  styles.teamTabText,
                  activeTeamCode === m.code && styles.teamTabTextActive,
                ]}
                numberOfLines={1}
              >
                {m.teamName || m.code}
              </Text>
            </TouchableOpacity>
          ))}
          {canAddMore && (
            <TouchableOpacity
              onPress={() => setAddingTeam(true)}
              style={styles.addTabButton}
            >
              <Plus size={16} color={colors.mutedForeground} />
            </TouchableOpacity>
          )}
        </ScrollView>
      )}

      {showAddView ? (
        <AddTeamView onCancel={hasTeams ? () => setAddingTeam(false) : undefined} />
      ) : (
        <TeamView />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 22,
    fontFamily: 'KotraBold',
    color: colors.foreground,
  },
  teamTabs: {
    marginBottom: 16,
  },
  teamTabsContent: {
    gap: 8,
    paddingRight: 4,
  },
  teamTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: colors.muted,
    maxWidth: 160,
  },
  teamTabActive: {
    backgroundColor: colors.tomato,
  },
  teamTabText: {
    fontSize: 14,
    fontFamily: 'KotraGothic',
    color: colors.mutedForeground,
  },
  teamTabTextActive: {
    color: '#fff',
    fontFamily: 'KotraBold',
  },
  addTabButton: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: colors.muted,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
