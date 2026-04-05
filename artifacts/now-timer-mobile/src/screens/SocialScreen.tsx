import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Modal,
  Vibration,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import QRCode from 'react-native-qrcode-svg';
import { Users, Copy, Check, LogOut, Zap, QrCode, Plus, Pencil } from 'lucide-react-native';
import { useSocial } from '@/context/SocialContext';
import { playPokeSound, playVoicePoke } from '@/lib/sounds';
import { api, API_BASE_URL, type Member } from '@/lib/api';
import { PixelAvatar, parseAvatarData } from '@/components/PixelAvatar';
import { colors } from '@/lib/colors';

function pokeParticle(name: string): string {
  if (!name) return '\uAC00';
  const code = name.charCodeAt(name.length - 1);
  if (code >= 0xac00 && code <= 0xd7a3) {
    return (code - 0xac00) % 28 === 0 ? '\uAC00' : '\uC774';
  }
  return '\uAC00';
}

const MAX_TEAMS = 5;

function statusLabel(m: Member): { text: string; bgColor: string; textColor: string } {
  switch (m.status) {
    case 'focusing':
      return { text: '\uC9D1\uC911 \uC911', bgColor: colors.blue100, textColor: colors.blue700 };
    case 'breaking':
      return { text: '\uD734\uC2DD \uC911', bgColor: colors.green100, textColor: colors.green700 };
    case 'nowAlert':
    case 'returnAlert':
      if (m.ignoreLevel >= 3)
        return { text: `NOW! Lv.${m.ignoreLevel} \uBB34\uC2DC \uC911`, bgColor: '#fef2f2', textColor: colors.red700 };
      if (m.ignoreLevel === 2)
        return { text: 'NOW! Lv.2 \uBB34\uC2DC \uC911', bgColor: '#fff7ed', textColor: '#9a3412' };
      return { text: 'NOW! \uC54C\uB9BC \uC911', bgColor: '#fef9c3', textColor: '#854d0e' };
    default:
      return { text: '\uB300\uAE30 \uC911', bgColor: colors.gray100, textColor: colors.gray500 };
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
  const { text, bgColor, textColor } = statusLabel(member);
  const rate = complianceRate(member);
  const canPoke =
    !isMe &&
    (member.status === 'nowAlert' || member.status === 'returnAlert');
  const [pokeSent, setPokeSent] = useState(false);

  const handlePoke = () => {
    onPoke();
    Vibration.vibrate(100);
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
          {isMe && <Text style={memberStyles.meTag}>({'\uB098'})</Text>}
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
            {pokeSent ? '\uBCF4\uB0C4!' : '\uAE68\uC6B0\uAE30'}
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
  const list = Object.values(members);
  const me = members[myId];
  const totalNow = list.reduce((s, m) => s + m.nowCount, 0);
  const myRate = me ? complianceRate(me) : null;

  return (
    <View style={teamStatsStyles.row}>
      <View style={teamStatsStyles.statCard}>
        <Text style={teamStatsStyles.statValue}>{totalNow}</Text>
        <Text style={teamStatsStyles.statLabel}>{'\uD300 NOW! \uD69F\uC218'}</Text>
      </View>
      <View style={teamStatsStyles.statCard}>
        <Text style={teamStatsStyles.statValue}>
          {myRate !== null ? `${myRate}%` : '\u2014'}
        </Text>
        <Text style={teamStatsStyles.statLabel}>{'\uB0B4 \uC900\uC218\uC728'}</Text>
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
                onChangeText={(t) => setNameInput(t.slice(0, 30))}
                placeholder={'팀 이름 입력'}
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
                {teamName || '팀 이름 설정'}
              </Text>
              <Pencil size={12} color={colors.mutedForeground} />
            </TouchableOpacity>
          )}
        </View>

        <Text style={teamStyles.codeLabel}>{'\uD300 \uCF54\uB4DC'}</Text>
        <View style={teamStyles.codeRow}>
          <Text style={teamStyles.codeText}>{activeTeamCode}</Text>
          <TouchableOpacity
            onPress={copyCode}
            style={[teamStyles.codeButton, copied && { backgroundColor: '#dcfce7' }]}
            activeOpacity={0.7}
          >
            {copied ? <Check size={14} color={colors.green700} /> : <Copy size={14} color={colors.mutedForeground} />}
            <Text style={[teamStyles.codeButtonText, copied && { color: colors.green700 }]}>
              {copied ? '\uBCF5\uC0AC\uB428' : '\uBCF5\uC0AC'}
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
          {'\uC774 \uCF54\uB4DC\uB97C \uACF5\uC720\uD574\uC11C \uD300\uC6D0\uC744 \uCD08\uB300\uD558\uC138\uC694'}
        </Text>

        {showQr && joinUrl ? (
          <View style={teamStyles.qrContainer}>
            <View style={teamStyles.qrBox}>
              <QRCode value={joinUrl} size={160} />
            </View>
            <Text style={teamStyles.qrHint}>
              {'QR \uCF54\uB4DC\uB97C \uC2A4\uCE94\uD558\uBA74 \uBC14\uB85C \uD300\uC5D0 \uCC38\uAC00\uD574\uC694'}
            </Text>
          </View>
        ) : null}
      </View>

      {/* Team stats */}
      {memberId && <TeamStats members={members} myId={memberId} />}

      {/* Members */}
      <View>
        <Text style={teamStyles.membersLabel}>
          {'\uD300\uC6D0 ('}{memberList.length}{'\uBA85)'}
        </Text>
        {memberList.length === 0 && (
          <Text style={teamStyles.emptyText}>
            {'\uC544\uC9C1 \uD300\uC6D0\uC774 \uC5C6\uC5B4\uC694. \uCF54\uB4DC\uB97C \uACF5\uC720\uD574 \uBCF4\uC138\uC694!'}
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
  const [view, setView] = useState<JoinView>('landing');
  const [nickname, setNickname] = useState('');
  const [teamNameInput, setTeamNameInput] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const isAddMode = memberships.length > 0;

  async function handleCreate() {
    if (!nickname.trim()) { setError('\uB2C9\uB124\uC784\uC744 \uC785\uB825\uD574 \uC8FC\uC138\uC694'); return; }
    setLoading(true);
    setError('');
    try {
      await createTeam(nickname.trim(), teamNameInput.trim() || undefined);
    } catch {
      setError('\uD300 \uB9CC\uB4E4\uAE30\uC5D0 \uC2E4\uD328\uD588\uC5B4\uC694. \uC7A0\uC2DC \uD6C4 \uB2E4\uC2DC \uC2DC\uB3C4\uD574 \uC8FC\uC138\uC694.');
    } finally {
      setLoading(false);
    }
  }

  async function handleJoin() {
    if (!code.trim() || !nickname.trim()) {
      setError('\uD300 \uCF54\uB4DC\uC640 \uB2C9\uB124\uC784\uC744 \uBAA8\uB450 \uC785\uB825\uD574 \uC8FC\uC138\uC694');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await joinTeam(code.trim(), nickname.trim());
      onCancel?.();
    } catch (e: unknown) {
      if (e instanceof Error && e.message === 'already_joined') {
        setError('\uC774\uBBF8 \uCC38\uAC00\uD55C \uD300\uC774\uC5D0\uC694');
      } else {
        setError('\uD300\uC744 \uCC3E\uC744 \uC218 \uC5C6\uC5B4\uC694. \uCF54\uB4DC\uB97C \uB2E4\uC2DC \uD655\uC778\uD574 \uC8FC\uC138\uC694.');
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
            {isAddMode ? '\uD300 \uCD94\uAC00\uD558\uAE30' : '\uD300\uC73C\uB85C \uC9D1\uC911\uD558\uAE30'}
          </Text>
          <Text style={addStyles.description}>
            {isAddMode
              ? '\uC0C8 \uD300\uC744 \uB9CC\uB4E4\uAC70\uB098 \uAE30\uC874 \uD300 \uCF54\uB4DC\uB85C \uCC38\uAC00\uD558\uC138\uC694'
              : '\uD300\uC6D0\uB4E4\uACFC NOW! \uC0AC\uC774\uD074\uC744 \uD568\uAED8\uD558\uBA74\n\uD63C\uC790\uBCF4\uB2E4 \uD6E8\uC52C \uC798 \uC9C0\uD0AC \uC218 \uC788\uC5B4\uC694'}
          </Text>
        </View>
        <View style={addStyles.buttons}>
          <TouchableOpacity
            onPress={() => setView('create')}
            style={addStyles.primaryButton}
            activeOpacity={0.8}
          >
            <Text style={addStyles.primaryButtonText}>{'\uD300 \uB9CC\uB4E4\uAE30'}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setView('join')}
            style={addStyles.secondaryButton}
            activeOpacity={0.8}
          >
            <Text style={addStyles.secondaryButtonText}>{'\uCF54\uB4DC\uB85C \uCC38\uAC00\uD558\uAE30'}</Text>
          </TouchableOpacity>
          {isAddMode && onCancel && (
            <TouchableOpacity onPress={onCancel}>
              <Text style={addStyles.cancelText}>{'\uCDE8\uC18C'}</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  }

  return (
    <View style={addStyles.formContainer}>
      <TouchableOpacity onPress={() => { setView('landing'); setError(''); }}>
        <Text style={addStyles.backText}>{'\u2190 \uB3CC\uC544\uAC00\uAE30'}</Text>
      </TouchableOpacity>

      <Text style={addStyles.formTitle}>
        {view === 'create' ? '\uD300 \uB9CC\uB4E4\uAE30' : '\uD300 \uCC38\uAC00\uD558\uAE30'}
      </Text>

      {view === 'create' && (
        <>
          <Text style={addStyles.inputLabel}>{'팀 이름'}</Text>
          <TextInput
            style={addStyles.input}
            placeholder={'예: 스터디 그룹, 개발팀'}
            placeholderTextColor={colors.mutedForeground}
            value={teamNameInput}
            onChangeText={(t) => setTeamNameInput(t.slice(0, 30))}
            autoCorrect={false}
          />
        </>
      )}

      {view === 'join' && (
        <>
          <Text style={addStyles.inputLabel}>{'\uD300 \uCF54\uB4DC'}</Text>
          <TextInput
            style={addStyles.inputCode}
            placeholder="\uC608: ABC123"
            placeholderTextColor={colors.mutedForeground}
            value={code}
            onChangeText={(t) => setCode(t.toUpperCase().slice(0, 6))}
            autoCapitalize="characters"
            autoCorrect={false}
          />
        </>
      )}

      <Text style={addStyles.inputLabel}>{'\uB2C9\uB124\uC784'}</Text>
      <TextInput
        style={addStyles.input}
        placeholder={'\uD300\uC6D0\uB4E4\uC5D0\uAC8C \uD45C\uC2DC\uB420 \uC774\uB984'}
        placeholderTextColor={colors.mutedForeground}
        value={nickname}
        onChangeText={(t) => setNickname(t.slice(0, 20))}
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
            {view === 'create' ? '\uD300 \uB9CC\uB4E4\uAE30' : '\uCC38\uAC00\uD558\uAE30'}
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

export function PeerAlertToast() {
  const { peerAlertMsg, clearPeerAlert } = useSocial();

  useEffect(() => {
    if (!peerAlertMsg) return;
    const t = setTimeout(clearPeerAlert, 6000);
    return () => clearTimeout(t);
  }, [peerAlertMsg, clearPeerAlert]);

  if (!peerAlertMsg) return null;

  return (
    <View style={toastStyles.peerContainer}>
      <View style={toastStyles.peerToast}>
        <Zap size={15} color="#fff" />
        <Text style={toastStyles.peerText} numberOfLines={1}>{peerAlertMsg}</Text>
        <TouchableOpacity onPress={clearPeerAlert}>
          <Text style={toastStyles.peerClose}>{'\u2715'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export function PokeToast() {
  const { pokeFrom, pokeFromId, pokeHasVoice, clearPoke } = useSocial();

  useEffect(() => {
    if (!pokeFrom) return;
    Vibration.vibrate([120, 60, 120, 60, 280]);
    if (pokeHasVoice && pokeFromId) {
      api.getVoice(pokeFromId).then(({ audio }) => {
        void playVoicePoke(audio);
      }).catch(() => {
        void playPokeSound();
      });
    } else {
      void playPokeSound();
    }
    const t = setTimeout(clearPoke, 7000);
    return () => clearTimeout(t);
  }, [pokeFrom, clearPoke]);

  if (!pokeFrom) return null;

  return (
    <Modal visible transparent animationType="fade" statusBarTranslucent>
      <TouchableOpacity
        style={toastStyles.pokeOverlay}
        activeOpacity={1}
        onPress={clearPoke}
      >
        <View style={toastStyles.pokeCard}>
          <Text style={toastStyles.pokeEmoji}>{'\uD83D\uDC4A'}</Text>
          <Text style={toastStyles.pokeName}>
            {pokeFrom}{pokeParticle(pokeFrom)}
          </Text>
          <Text style={toastStyles.pokeName}>
            {'\uC7AC\uCD09\uD569\uB2C8\uB2E4!'}
          </Text>
          <Text style={toastStyles.pokeDismiss}>{'\uD0ED\uD574\uC11C \uB2EB\uAE30'}</Text>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const toastStyles = StyleSheet.create({
  peerContainer: {
    position: 'absolute',
    bottom: 100,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: 16,
    zIndex: 60,
  },
  peerToast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#ea580c',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
    maxWidth: 320,
  },
  peerText: {
    fontSize: 14,
    fontFamily: 'KotraBold',
    color: '#fff',
    flex: 1,
  },
  peerClose: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    marginLeft: 4,
  },
  pokeOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  pokeCard: {
    backgroundColor: '#f97316',
    borderRadius: 24,
    padding: 28,
    alignItems: 'center',
    width: '100%',
    maxWidth: 300,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  pokeEmoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  pokeName: {
    fontSize: 24,
    fontFamily: 'KotraBold',
    color: '#fff',
    lineHeight: 32,
  },
  pokeDismiss: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 16,
  },
});

export function SocialScreen() {
  const { memberships, activeTeamCode, setActiveTeamCode } = useSocial();
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
        <Text style={styles.headerTitle}>{'\uC18C\uC15C'}</Text>
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
