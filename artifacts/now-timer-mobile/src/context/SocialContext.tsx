import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { Vibration } from 'react-native';
import { useTimer } from '@/context/TimerContext';
import { useAuth } from '@/context/AuthContext';
import { api, API_BASE_URL, type Member } from '@/lib/api';
import {
  type Membership,
  getMemberships,
  getActiveCode,
  setActiveCode,
  addMembership,
  removeMembership,
} from '@/lib/teamStorage';

interface SocialState {
  memberships: Membership[];
  activeTeamCode: string | null;
  setActiveTeamCode: (code: string) => void;
  memberId: string | null;
  nickname: string | null;
  members: Record<string, Member>;
  allMembers: Record<string, Record<string, Member>>;
  pokeFrom: string | null;
  peerAlertMsg: string | null;
  clearPoke: () => void;
  clearPeerAlert: () => void;
  createTeam: (nickname: string) => Promise<string>;
  joinTeam: (code: string, nickname: string) => Promise<void>;
  leaveTeam: (code: string) => void;
  poke: (toId: string) => void;
}

const SocialContext = createContext<SocialState | null>(null);

export function useSocial(): SocialState {
  const ctx = useContext(SocialContext);
  if (!ctx) throw new Error('useSocial must be used inside SocialProvider');
  return ctx;
}

async function connectSSE(
  url: string,
  onMessage: (data: unknown) => void,
  onError: () => void,
): Promise<() => void> {
  let cancelled = false;
  const cancel = () => { cancelled = true; };

  try {
    const res = await fetch(url, {
      headers: { Accept: 'text/event-stream' },
    });
    const reader = res.body?.getReader();
    if (!reader) { onError(); return cancel; }
    const decoder = new TextDecoder();
    let buffer = '';

    (async () => {
      try {
        while (!cancelled) {
          const { done, value } = await reader.read();
          if (done || cancelled) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() ?? '';
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try { onMessage(JSON.parse(line.slice(6))); } catch {}
            }
          }
        }
      } catch {
        if (!cancelled) onError();
      }
    })();
  } catch {
    onError();
  }

  return cancel;
}

export function SocialProvider({ children }: { children: React.ReactNode }) {
  const { phase, ignoreLevel } = useTimer();
  const { user, linkMembership, unlinkMembership } = useAuth();

  const [memberships, setMemberships] = useState<Membership[]>(() => {
    const local = getMemberships();
    if (!user) return local;
    const merged = [...local];
    for (const sm of user.memberships) {
      if (!merged.some((m) => m.code === sm.code)) {
        addMembership(sm);
        merged.push(sm);
      }
    }
    return getMemberships();
  });

  const [activeTeamCode, setActiveTeamCodeState] = useState<string | null>(() => {
    const saved = getMemberships();
    const active = getActiveCode();
    if (!saved.length) return null;
    return saved.find((m) => m.code === active)?.code ?? saved[0].code;
  });

  const [allMembers, setAllMembers] = useState<Record<string, Record<string, Member>>>({});
  const [pokeFrom, setPokeFrom] = useState<string | null>(null);
  const [peerAlertMsg, setPeerAlertMsg] = useState<string | null>(null);

  const cancelMap = useRef<Map<string, () => void>>(new Map());
  const membershipsRef = useRef<Membership[]>(memberships);
  const allMembersRef = useRef<Record<string, Record<string, Member>>>({});
  const phaseRef = useRef(phase);
  const ignoreLevelRef = useRef(ignoreLevel);
  const prevPhaseForApiRef = useRef(phase);
  const alertStartForApiRef = useRef<number | null>(null);

  useEffect(() => { membershipsRef.current = memberships; }, [memberships]);
  useEffect(() => { allMembersRef.current = allMembers; }, [allMembers]);
  useEffect(() => { phaseRef.current = phase; }, [phase]);
  useEffect(() => { ignoreLevelRef.current = ignoreLevel; }, [ignoreLevel]);

  const setActiveTeamCode = useCallback((code: string) => {
    setActiveCode(code);
    setActiveTeamCodeState(code);
  }, []);

  function connectTeamSSE(m: Membership) {
    if (cancelMap.current.has(m.code)) return;

    let active = true;
    let cancelFn: (() => void) | null = null;

    function doConnect() {
      if (!active) return;
      const url = `${API_BASE_URL}/api/teams/${m.code}/stream?memberId=${m.memberId}`;

      connectSSE(
        url,
        (data) => {
          const event = data as {
            type: string;
            team?: { members: Record<string, Member> };
            member?: Member;
            toMemberId?: string;
            fromNickname?: string;
          };

          if (event.type === 'init' && event.team) {
            setAllMembers((prev) => ({
              ...prev,
              [m.code]: { ...event.team!.members },
            }));
          } else if (
            (event.type === 'status' || event.type === 'join') &&
            event.member
          ) {
            const incoming = event.member;
            const prevLevel =
              allMembersRef.current[m.code]?.[incoming.id]?.ignoreLevel ?? 0;
            const newLevel = incoming.ignoreLevel;

            if (incoming.id !== m.memberId) {
              if (prevLevel < 3 && newLevel >= 3) {
                const hasMultiple = membershipsRef.current.length > 1;
                const msg = hasMultiple
                  ? `[${m.code}] ${incoming.nickname}\uB2D8\uC774 NOW! Lv.3\uC744 \uBB34\uC2DC\uD558\uACE0 \uC788\uC5B4\uC694`
                  : `${incoming.nickname}\uB2D8\uC774 NOW! Lv.3\uC744 \uBB34\uC2DC\uD558\uACE0 \uC788\uC5B4\uC694`;
                setPeerAlertMsg(msg);
                Vibration.vibrate([120, 60, 120, 60, 280]);
              } else if (prevLevel < 2 && newLevel >= 2) {
                const hasMultiple = membershipsRef.current.length > 1;
                const msg = hasMultiple
                  ? `[${m.code}] ${incoming.nickname}\uB2D8\uC774 NOW! Lv.2\uB97C \uBB34\uC2DC\uD558\uACE0 \uC788\uC5B4\uC694`
                  : `${incoming.nickname}\uB2D8\uC774 NOW! Lv.2\uB97C \uBB34\uC2DC\uD558\uACE0 \uC788\uC5B4\uC694`;
                setPeerAlertMsg(msg);
              }
            }

            setAllMembers((prev) => ({
              ...prev,
              [m.code]: {
                ...(prev[m.code] ?? {}),
                [incoming.id]: incoming,
              },
            }));
          } else if (event.type === 'poke' && event.toMemberId === m.memberId) {
            setPokeFrom(event.fromNickname ?? '\uD300\uC6D0');
          }
        },
        () => {
          cancelMap.current.delete(m.code);
          if (active) setTimeout(doConnect, 3000);
        },
      ).then((cancel) => {
        cancelFn = cancel;
      });
    }

    doConnect();
    cancelMap.current.set(m.code, () => {
      active = false;
      cancelFn?.();
    });
  }

  useEffect(() => {
    for (const m of memberships) {
      connectTeamSSE(m);
    }
    const codes = new Set(memberships.map((m) => m.code));
    for (const [code, cancel] of cancelMap.current) {
      if (!codes.has(code)) {
        cancel();
        cancelMap.current.delete(code);
      }
    }
    return () => {
      for (const [, cancel] of cancelMap.current) {
        cancel();
      }
      cancelMap.current.clear();
    };
  }, [memberships]);

  useEffect(() => {
    const prevPhase = prevPhaseForApiRef.current;
    prevPhaseForApiRef.current = phase;

    const enteringAlert =
      (phase === 'nowAlert' || phase === 'returnAlert') &&
      (prevPhase === 'focusing' || prevPhase === 'breaking');
    if (enteringAlert && ignoreLevel === 1) {
      alertStartForApiRef.current = Date.now();
    }

    const wasDismissed =
      (phase === 'breaking' && prevPhase === 'nowAlert') ||
      (phase === 'focusing' && prevPhase === 'returnAlert');
    let reactionMs: number | undefined;
    if (wasDismissed && alertStartForApiRef.current !== null) {
      reactionMs = Date.now() - alertStartForApiRef.current;
      alertStartForApiRef.current = null;
    }

    for (const m of membershipsRef.current) {
      api.updateStatus(m.memberId, phase, ignoreLevel, m.token, reactionMs).catch(() => {});
    }
  }, [phase, ignoreLevel]);

  const createTeam = useCallback(async (nick: string): Promise<string> => {
    const { code } = await api.createTeam();
    const { memberId: mid, memberToken: tok, team } = await api.joinTeam(code, nick);
    const m: Membership = { code, memberId: mid, nickname: nick, token: tok };
    addMembership(m);
    setMemberships(getMemberships());
    setAllMembers((prev) => ({ ...prev, [code]: team.members }));
    setActiveCode(code);
    setActiveTeamCodeState(code);
    linkMembership(m).catch(() => {});
    return code;
  }, [linkMembership]);

  const joinTeam = useCallback(async (code: string, nick: string): Promise<void> => {
    const upper = code.toUpperCase();
    if (membershipsRef.current.some((m) => m.code === upper)) {
      throw new Error('already_joined');
    }
    const { memberId: mid, memberToken: tok, team } = await api.joinTeam(upper, nick);
    const m: Membership = { code: upper, memberId: mid, nickname: nick, token: tok };
    addMembership(m);
    setMemberships(getMemberships());
    setAllMembers((prev) => ({ ...prev, [upper]: team.members }));
    setActiveCode(upper);
    setActiveTeamCodeState(upper);
    linkMembership(m).catch(() => {});
  }, [linkMembership]);

  const leaveTeam = useCallback((code: string) => {
    const cancel = cancelMap.current.get(code);
    if (cancel) {
      cancel();
      cancelMap.current.delete(code);
    }
    removeMembership(code);
    const remaining = getMemberships();
    setMemberships(remaining);
    setAllMembers((prev) => {
      const next = { ...prev };
      delete next[code];
      return next;
    });
    const newActive = getActiveCode() || remaining[0]?.code || null;
    setActiveTeamCodeState(newActive);
    unlinkMembership(code).catch(() => {});
  }, [unlinkMembership]);

  const poke = useCallback(
    (toId: string) => {
      const m = membershipsRef.current.find((x) => x.code === activeTeamCode);
      if (!m) return;
      api.poke(m.memberId, toId, m.token).catch(() => {});
    },
    [activeTeamCode],
  );

  const clearPoke = useCallback(() => setPokeFrom(null), []);
  const clearPeerAlert = useCallback(() => setPeerAlertMsg(null), []);

  const activeMembership = memberships.find((m) => m.code === activeTeamCode) ?? null;
  const members = allMembers[activeTeamCode ?? ''] ?? {};

  return (
    <SocialContext.Provider
      value={{
        memberships,
        activeTeamCode,
        setActiveTeamCode,
        memberId: activeMembership?.memberId ?? null,
        nickname: activeMembership?.nickname ?? null,
        members,
        allMembers,
        pokeFrom,
        peerAlertMsg,
        clearPoke,
        clearPeerAlert,
        createTeam,
        joinTeam,
        leaveTeam,
        poke,
      }}
    >
      {children}
    </SocialContext.Provider>
  );
}
