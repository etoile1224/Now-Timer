import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { useTimer } from '@/context/TimerContext';
import { useAuth } from '@/context/AuthContext';
import { api, type Member } from '@/lib/api';
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
  pokeFromId: string | null;
  pokeHasVoice: boolean;
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
  const [pokeFromId, setPokeFromId] = useState<string | null>(null);
  const [pokeHasVoice, setPokeHasVoice] = useState(false);
  const [peerAlertMsg, setPeerAlertMsg] = useState<string | null>(null);

  const esMap = useRef<Map<string, EventSource>>(new Map());
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

  function connectTeam(m: Membership) {
    if (esMap.current.has(m.code)) return;

    let active = true;

    function connect() {
      if (!active) return;
      const es = new EventSource(
        `/api/teams/${m.code}/stream?memberId=${m.memberId}`,
      );
      esMap.current.set(m.code, es);

      es.onmessage = (ev: MessageEvent) => {
        try {
          const event = JSON.parse(ev.data as string) as {
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
                  ? `[${m.code}] ${incoming.nickname}님이 NOW! Lv.3을 무시하고 있어요`
                  : `${incoming.nickname}님이 NOW! Lv.3을 무시하고 있어요`;
                setPeerAlertMsg(msg);
                if (
                  'Notification' in window &&
                  Notification.permission === 'granted'
                ) {
                  new Notification(msg, {
                    body: '흔들어 깨워서 집중으로 돌아오게 해주세요!',
                    tag: `peer-lv3-${incoming.id}`,
                  });
                }
              } else if (prevLevel < 2 && newLevel >= 2) {
                const hasMultiple = membershipsRef.current.length > 1;
                const msg = hasMultiple
                  ? `[${m.code}] ${incoming.nickname}님이 NOW! Lv.2를 무시하고 있어요`
                  : `${incoming.nickname}님이 NOW! Lv.2를 무시하고 있어요`;
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
            setPokeFrom(event.fromNickname ?? '팀원');
            setPokeFromId((event as { fromMemberId?: string }).fromMemberId ?? null);
            setPokeHasVoice((event as { hasVoice?: boolean }).hasVoice ?? false);
          }
        } catch {}
      };

      es.onerror = () => {
        es.close();
        esMap.current.delete(m.code);
        if (active) setTimeout(connect, 3000);
      };
    }

    connect();

    return () => {
      active = false;
      esMap.current.get(m.code)?.close();
      esMap.current.delete(m.code);
    };
  }

  useEffect(() => {
    const cleanups: Array<(() => void) | undefined> = [];
    for (const m of memberships) {
      cleanups.push(connectTeam(m));
    }
    const codes = new Set(memberships.map((m) => m.code));
    for (const [code, es] of esMap.current) {
      if (!codes.has(code)) {
        es.close();
        esMap.current.delete(code);
      }
    }
    return () => {
      cleanups.forEach((fn) => fn?.());
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
    esMap.current.get(code)?.close();
    esMap.current.delete(code);
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

  const clearPoke = useCallback(() => {
    setPokeFrom(null);
    setPokeFromId(null);
    setPokeHasVoice(false);
  }, []);
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
        pokeFromId,
        pokeHasVoice,
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
