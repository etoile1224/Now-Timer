import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSearch } from 'wouter';
import { QRCodeSVG } from 'qrcode.react';
import { useSocial } from '@/context/SocialContext';
import type { Member } from '@/lib/api';
import { playPokeSound } from '@/lib/sounds';
import {
  Users,
  Copy,
  Check,
  LogOut,
  Zap,
  QrCode,
  Plus,
} from 'lucide-react';

function pokeParticle(name: string): string {
  if (!name) return '가';
  const code = name.charCodeAt(name.length - 1);
  if (code >= 0xac00 && code <= 0xd7a3) {
    return (code - 0xac00) % 28 === 0 ? '가' : '이';
  }
  return '가';
}

const MAX_TEAMS = 5;

function statusLabel(m: Member): { text: string; color: string } {
  switch (m.status) {
    case 'focusing':
      return { text: '집중 중', color: 'bg-blue-100 text-blue-700' };
    case 'breaking':
      return { text: '휴식 중', color: 'bg-green-100 text-green-700' };
    case 'nowAlert':
    case 'returnAlert':
      if (m.ignoreLevel >= 3)
        return { text: `NOW! Lv.${m.ignoreLevel} 무시 중`, color: 'bg-red-100 text-red-700' };
      if (m.ignoreLevel === 2)
        return { text: 'NOW! Lv.2 무시 중', color: 'bg-orange-100 text-orange-700' };
      return { text: 'NOW! 알림 중', color: 'bg-yellow-100 text-yellow-700' };
    default:
      return { text: '대기 중', color: 'bg-gray-100 text-gray-500' };
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
  const { text, color } = statusLabel(member);
  const rate = complianceRate(member);
  const canPoke =
    !isMe &&
    (member.status === 'nowAlert' || member.status === 'returnAlert');

  return (
    <div
      className={`flex items-center gap-3 p-3 rounded-2xl border ${
        isMe ? 'border-primary bg-primary/5' : 'border-border bg-card'
      }`}
    >
      <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center text-sm font-bold text-muted-foreground shrink-0">
        {member.nickname.slice(0, 1).toUpperCase()}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-semibold text-foreground truncate">
            {member.nickname}
          </span>
          {isMe && (
            <span className="text-xs text-primary font-medium">(나)</span>
          )}
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${color}`}>
            {text}
          </span>
          {rate !== null && (
            <span className="text-xs text-muted-foreground">{rate}%</span>
          )}
        </div>
      </div>

      {canPoke && (
        <button
          onClick={onPoke}
          className="flex items-center gap-1 px-2.5 py-1.5 bg-orange-50 text-orange-600 text-xs font-semibold rounded-xl border border-orange-200 active:scale-95 transition-transform"
        >
          <Zap size={12} />
          깨우기
        </button>
      )}
    </div>
  );
}

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
    <div className="grid grid-cols-2 gap-3">
      <div className="bg-card rounded-2xl border border-border p-3 text-center">
        <p className="text-2xl font-black text-foreground">{totalNow}</p>
        <p className="text-xs text-muted-foreground mt-0.5">팀 NOW! 횟수</p>
      </div>
      <div className="bg-card rounded-2xl border border-border p-3 text-center">
        <p className="text-2xl font-black text-foreground">
          {myRate !== null ? `${myRate}%` : '—'}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">내 준수율</p>
      </div>
    </div>
  );
}

function TeamView() {
  const { activeTeamCode, memberId, members, poke, leaveTeam } = useSocial();
  const [copied, setCopied] = useState(false);
  const [showQr, setShowQr] = useState(false);

  const joinUrl = activeTeamCode
    ? `${window.location.origin}/social?join=${activeTeamCode}`
    : '';

  const copyCode = () => {
    if (!activeTeamCode) return;
    navigator.clipboard.writeText(activeTeamCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const memberList = Object.values(members).sort((a) =>
    a.id === memberId ? -1 : 1,
  );

  return (
    <div className="space-y-5">
      <div className="bg-card rounded-2xl border border-border p-4">
        <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mb-2">
          팀 코드
        </p>
        <div className="flex items-center gap-3">
          <span className="text-2xl font-black tracking-widest text-foreground flex-1">
            {activeTeamCode}
          </span>
          <button
            onClick={copyCode}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold transition-all active:scale-95 ${
              copied
                ? 'bg-green-100 text-green-700'
                : 'bg-muted text-muted-foreground hover:bg-muted/60'
            }`}
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
            {copied ? '복사됨' : '복사'}
          </button>
          <button
            onClick={() => setShowQr((v) => !v)}
            className={`flex items-center gap-1 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
              showQr ? 'text-primary bg-primary/10' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <QrCode size={16} />
          </button>
          <button
            onClick={() => activeTeamCode && leaveTeam(activeTeamCode)}
            className="flex items-center gap-1 px-3 py-2 rounded-xl text-sm font-medium text-muted-foreground hover:text-destructive transition-colors"
          >
            <LogOut size={14} />
          </button>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          이 코드를 공유해서 팀원을 초대하세요
        </p>

        <AnimatePresence>
          {showQr && joinUrl && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="mt-4 flex flex-col items-center gap-2">
                <div className="bg-white p-3 rounded-2xl shadow-sm">
                  <QRCodeSVG value={joinUrl} size={160} />
                </div>
                <p className="text-xs text-muted-foreground text-center">
                  QR 코드를 스캔하면 바로 팀에 참가해요
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {memberId && (
        <TeamStats members={members} myId={memberId} />
      )}

      <div className="space-y-2">
        <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">
          팀원 ({memberList.length}명)
        </p>
        {memberList.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">
            아직 팀원이 없어요. 코드를 공유해 보세요!
          </p>
        )}
        {memberList.map((m) => (
          <MemberCard
            key={m.id}
            member={m}
            isMe={m.id === memberId}
            onPoke={() => poke(m.id)}
          />
        ))}
      </div>
    </div>
  );
}

type JoinView = 'landing' | 'create' | 'join';

function AddTeamView({ onCancel }: { onCancel?: () => void }) {
  const { createTeam, joinTeam, memberships } = useSocial();
  const search = useSearch();
  const params = new URLSearchParams(search);
  const urlCode = params.get('join')?.toUpperCase() ?? '';

  const [view, setView] = useState<JoinView>(urlCode ? 'join' : 'landing');
  const [nickname, setNickname] = useState('');
  const [code, setCode] = useState(urlCode);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const isAddMode = memberships.length > 0;

  async function handleCreate() {
    if (!nickname.trim()) { setError('닉네임을 입력해 주세요'); return; }
    setLoading(true);
    setError('');
    try {
      await createTeam(nickname.trim());
    } catch {
      setError('팀 만들기에 실패했어요. 잠시 후 다시 시도해 주세요.');
    } finally {
      setLoading(false);
    }
  }

  async function handleJoin() {
    if (!code.trim() || !nickname.trim()) {
      setError('팀 코드와 닉네임을 모두 입력해 주세요');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await joinTeam(code.trim(), nickname.trim());
    } catch (e: unknown) {
      if (e instanceof Error && e.message === 'already_joined') {
        setError('이미 참가한 팀이에요');
      } else {
        setError('팀을 찾을 수 없어요. 코드를 다시 확인해 주세요.');
      }
    } finally {
      setLoading(false);
    }
  }

  if (view === 'landing') {
    return (
      <div className="flex flex-col items-center gap-6 pt-8">
        {!isAddMode && (
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Users size={32} className="text-primary" />
          </div>
        )}
        <div className="text-center">
          <h2 className="text-xl font-bold text-foreground mb-1">
            {isAddMode ? '팀 추가하기' : '팀으로 집중하기'}
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {isAddMode
              ? '새 팀을 만들거나 기존 팀 코드로 참가하세요'
              : '팀원들과 NOW! 사이클을 함께하면\n혼자보다 훨씬 잘 지킬 수 있어요'
            }
          </p>
        </div>
        <div className="flex flex-col gap-3 w-full">
          <button
            onClick={() => setView('create')}
            className="w-full py-4 bg-primary text-primary-foreground font-bold text-base rounded-2xl active:scale-95 transition-transform"
          >
            팀 만들기
          </button>
          <button
            onClick={() => setView('join')}
            className="w-full py-3.5 bg-muted text-foreground font-semibold text-base rounded-2xl border border-border active:scale-95 transition-transform"
          >
            코드로 참가하기
          </button>
          {isAddMode && onCancel && (
            <button
              onClick={onCancel}
              className="text-sm text-muted-foreground text-center mt-1"
            >
              취소
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <button
        onClick={() => { setView('landing'); setError(''); }}
        className="text-sm text-muted-foreground"
      >
        ← 돌아가기
      </button>

      <h2 className="text-lg font-bold text-foreground">
        {view === 'create' ? '팀 만들기' : '팀 참가하기'}
      </h2>

      {view === 'join' && (
        <div className="space-y-1">
          <label className="text-sm font-medium text-foreground">팀 코드</label>
          <input
            type="text"
            placeholder="예: ABC123"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, 6))}
            className="w-full px-4 py-3 rounded-xl bg-muted border-0 text-foreground text-lg font-bold tracking-widest placeholder:font-normal placeholder:tracking-normal outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      )}

      <div className="space-y-1">
        <label className="text-sm font-medium text-foreground">닉네임</label>
        <input
          type="text"
          placeholder="팀원들에게 표시될 이름"
          value={nickname}
          onChange={(e) => setNickname(e.target.value.slice(0, 20))}
          className="w-full px-4 py-3 rounded-xl bg-muted border-0 text-foreground outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      {error && (
        <p className="text-sm text-destructive font-medium">{error}</p>
      )}

      <button
        onClick={view === 'create' ? handleCreate : handleJoin}
        disabled={loading}
        className="w-full py-4 bg-primary text-primary-foreground font-bold text-base rounded-2xl active:scale-95 transition-transform disabled:opacity-50"
      >
        {loading ? '처리 중...' : view === 'create' ? '팀 만들기' : '참가하기'}
      </button>
    </div>
  );
}

export function PeerAlertToast() {
  const { peerAlertMsg, clearPeerAlert } = useSocial();

  useEffect(() => {
    if (!peerAlertMsg) return;
    const t = setTimeout(clearPeerAlert, 6000);
    return () => clearTimeout(t);
  }, [peerAlertMsg, clearPeerAlert]);

  return (
    <AnimatePresence>
      {peerAlertMsg && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className="fixed bottom-24 left-0 right-0 z-50 flex justify-center px-4 pointer-events-none"
        >
          <div className="flex items-center gap-2 bg-orange-600 text-white px-4 py-2.5 rounded-2xl shadow-lg text-sm font-semibold pointer-events-auto max-w-xs">
            <Zap size={15} className="shrink-0" />
            <span className="truncate">{peerAlertMsg}</span>
            <button onClick={clearPeerAlert} className="ml-1 opacity-70 hover:opacity-100 shrink-0">
              ✕
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function SocialPage() {
  const { memberships, activeTeamCode, setActiveTeamCode } = useSocial();
  const [addingTeam, setAddingTeam] = useState(false);

  const hasTeams = memberships.length > 0;
  const canAddMore = memberships.length < MAX_TEAMS;

  const showAddView = !hasTeams || addingTeam;

  return (
    <div className="min-h-screen bg-background pb-24 lg:pb-8">
      <div className="max-w-md lg:max-w-2xl mx-auto px-5 pt-12">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold text-foreground">소셜</h1>
        </div>

        {hasTeams && !addingTeam && (
          <div className="flex items-center gap-2 mb-5 overflow-x-auto pb-1 scrollbar-none">
            {memberships.map((m) => (
              <button
                key={m.code}
                onClick={() => setActiveTeamCode(m.code)}
                className={`shrink-0 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                  activeTeamCode === m.code
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-muted/60'
                }`}
              >
                {m.code}
              </button>
            ))}
            {canAddMore && (
              <button
                onClick={() => setAddingTeam(true)}
                className="shrink-0 w-9 h-9 rounded-xl bg-muted text-muted-foreground hover:bg-muted/60 flex items-center justify-center transition-all"
              >
                <Plus size={16} />
              </button>
            )}
          </div>
        )}

        <AnimatePresence mode="wait">
          {showAddView ? (
            <motion.div
              key="add"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              <AddTeamView onCancel={hasTeams ? () => setAddingTeam(false) : undefined} />
            </motion.div>
          ) : (
            <motion.div
              key={activeTeamCode ?? 'team'}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              <TeamView />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export function PokeToast() {
  const { pokeFrom, clearPoke } = useSocial();

  useEffect(() => {
    if (!pokeFrom) return;

    if ('vibrate' in navigator) {
      navigator.vibrate([120, 60, 120, 60, 280]);
    }
    playPokeSound();

    const t = setTimeout(clearPoke, 7000);
    return () => clearTimeout(t);
  }, [pokeFrom, clearPoke]);

  return (
    <AnimatePresence>
      {pokeFrom && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-black/30"
            onClick={clearPoke}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none px-8">
            <motion.div
              initial={{ opacity: 0, scale: 0.55 }}
              animate={{
                opacity: 1,
                scale: 1,
                x: [0, -18, 18, -18, 18, -9, 9, -4, 4, 0],
              }}
              exit={{ opacity: 0, scale: 0.75 }}
              transition={{
                opacity: { duration: 0.18 },
                scale: { type: 'spring', stiffness: 380, damping: 20 },
                x: { duration: 0.55, delay: 0.12, ease: 'easeInOut' },
              }}
              className="pointer-events-auto w-full max-w-xs"
              onClick={clearPoke}
            >
              <div className="bg-orange-500 text-white rounded-3xl p-7 shadow-2xl text-center relative overflow-hidden">
                <motion.div
                  className="absolute inset-0 bg-white/15 rounded-3xl"
                  animate={{ scale: [1, 1.5, 1], opacity: [0.4, 0, 0.4] }}
                  transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
                />
                <div className="relative">
                  <motion.div
                    className="text-5xl mb-4 select-none"
                    animate={{ rotate: [0, -25, 25, -25, 25, -12, 12, 0] }}
                    transition={{ duration: 0.55, delay: 0.1 }}
                  >
                    👊
                  </motion.div>
                  <div className="text-2xl font-black leading-snug">
                    {pokeFrom}{pokeParticle(pokeFrom)}
                  </div>
                  <div className="text-2xl font-black leading-snug">
                    재촉합니다!
                  </div>
                  <div className="text-sm opacity-70 mt-4">탭해서 닫기</div>
                </div>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
