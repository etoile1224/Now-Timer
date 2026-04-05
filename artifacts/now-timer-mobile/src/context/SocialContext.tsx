import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { Vibration } from 'react-native';
import * as Notifications from 'expo-notifications';
import { useTimer } from '@/context/TimerContext';
import { useAuth } from '@/context/AuthContext';
import EventSource from 'react-native-sse';
import { api, API_BASE_URL, type Member } from '@/lib/api';
import { registerForPushNotifications } from '@/lib/pushNotifications';
import {
  type Membership,
  getMemberships,
  getActiveCode,
  setActiveCode,
  addMembership,
  removeMembership,
  updateMembershipName,
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
  createTeam: (nickname: string, teamName?: string) => Promise<string>;
  joinTeam: (code: string, nickname: string) => Promise<void>;
  leaveTeam: (code: string) => void;
  poke: (toId: string) => void;
  renameTeam: (code: string, name: string) => Promise<void>;
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

    let retryTimeout: ReturnType<typeof setTimeout> | null = null;

    function doConnect() {
      const url = `${API_BASE_URL}/api/teams/${m.code}/stream?memberId=${m.memberId}`;
      const es = new EventSource(url, { lineEndingCharacter: '\n' });

      es.addEventListener('message', (evt: { data?: string }) => {
        if (!evt.data) return;
        try {
          const event = JSON.parse(evt.data) as {
            type: string;
            team?: { members: Record<string, Member>; name?: string };
            member?: Member;
            memberId?: string;
            avatarData?: string;
            toMemberId?: string;
            fromNickname?: string;
            fromMemberId?: string;
            hasVoice?: boolean;
            name?: string;
          };

          if (event.type === 'init' && event.team) {
            setAllMembers((prev) => ({ ...prev, [m.code]: { ...event.team!.members } }));
            // Sync team name from server
            if (event.team.name) {
              updateMembershipName(m.code, event.team.name);
              setMemberships(getMemberships());
            }
          } else if (event.type === 'teamRename' && event.name !== undefined) {
            updateMembershipName(m.code, event.name);
            setMemberships(getMemberships());
          } else if ((event.type === 'status' || event.type === 'join') && event.member) {
            const incoming = event.member;
            const prevLevel = allMembersRef.current[m.code]?.[incoming.id]?.ignoreLevel ?? 0;

            if (incoming.id !== m.memberId && phaseRef.current !== 'focusing') {
              if (prevLevel < 3 && incoming.ignoreLevel >= 3) {
                const hasMultiple = membershipsRef.current.length > 1;
                setPeerAlertMsg(
                  hasMultiple
                    ? `[${m.code}] ${incoming.nickname}\uB2D8\uC774 NOW! Lv.3\uC744 \uBB34\uC2DC\uD558\uACE0 \uC788\uC5B4\uC694`
                    : `${incoming.nickname}\uB2D8\uC774 NOW! Lv.3\uC744 \uBB34\uC2DC\uD558\uACE0 \uC788\uC5B4\uC694`,
                );
                Vibration.vibrate([120, 60, 120, 60, 280]);
              } else if (prevLevel < 2 && incoming.ignoreLevel >= 2) {
                const hasMultiple = membershipsRef.current.length > 1;
                setPeerAlertMsg(
                  hasMultiple
                    ? `[${m.code}] ${incoming.nickname}\uB2D8\uC774 NOW! Lv.2\uB97C \uBB34\uC2DC\uD558\uACE0 \uC788\uC5B4\uC694`
                    : `${incoming.nickname}\uB2D8\uC774 NOW! Lv.2\uB97C \uBB34\uC2DC\uD558\uACE0 \uC788\uC5B4\uC694`,
                );
              }
            }

            setAllMembers((prev) => ({
              ...prev,
              [m.code]: { ...(prev[m.code] ?? {}), [incoming.id]: incoming },
            }));
          } else if (event.type === 'avatar' && event.memberId && event.avatarData !== undefined) {
            setAllMembers((prev) => {
              const teamMembers = prev[m.code] ?? {};
              const existing = teamMembers[event.memberId!];
              if (!existing) return prev;
              return {
                ...prev,
                [m.code]: { ...teamMembers, [event.memberId!]: { ...existing, avatarData: event.avatarData! } },
              };
            });
          } else if (event.type === 'poke' && event.toMemberId === m.memberId) {
            setPokeFrom(event.fromNickname ?? '\uD300\uC6D0');
            setPokeFromId(event.fromMemberId ?? null);
            setPokeHasVoice(event.hasVoice ?? false);
          }
        } catch {}
      });

      es.addEventListener('error', () => {
        es.close();
        retryTimeout = setTimeout(doConnect, 3000);
      });

      cancelMap.current.set(m.code, () => {
        es.close();
        if (retryTimeout) clearTimeout(retryTimeout);
      });
    }

    doConnect();
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
    // Register push token for all memberships
    registerForPushNotifications().then((pushToken) => {
      if (!pushToken) return;
      for (const m of memberships) {
        api.registerPushToken(m.memberId, pushToken, m.token).catch(() => {});
      }
    });

    return () => {
      for (const [, cancel] of cancelMap.current) {
        cancel();
      }
      cancelMap.current.clear();
    };
  }, [memberships]);

  // Push notification listener — handles poke + alert when SSE is disconnected or app is in background
  useEffect(() => {
    function handlePushData(data: Record<string, unknown> | undefined) {
      if (!data?.type) return;
      if (data.type === 'poke') {
        setPokeFrom((data.fromNickname as string) ?? '팀원');
        setPokeFromId((data.fromId as string) ?? null);
        setPokeHasVoice(!!(data.hasVoice));
      } else if (data.type === 'alert') {
        // 집중 중에는 남의 NOW 무시 알림 차단
        if (phaseRef.current === 'focusing') return;
        const level = (data.level as number) ?? 2;
        const memberId = data.memberId as string | undefined;
        let nick = '팀원';
        for (const teamMembers of Object.values(allMembersRef.current)) {
          if (memberId && teamMembers[memberId]) {
            nick = teamMembers[memberId].nickname;
            break;
          }
        }
        setPeerAlertMsg(`${nick}님이 NOW! Lv.${level}을 무시하고 있어요`);
        Vibration.vibrate([120, 60, 120, 60, 280]);
      }
    }

    const sub = Notifications.addNotificationReceivedListener((notification) => {
      handlePushData(notification.request.content.data as Record<string, unknown> | undefined);
    });
    const responseSub = Notifications.addNotificationResponseReceivedListener((response) => {
      handlePushData(response.notification.request.content.data as Record<string, unknown> | undefined);
    });
    return () => {
      sub.remove();
      responseSub.remove();
    };
  }, []);

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

  const createTeam = useCallback(async (nick: string, teamName?: string): Promise<string> => {
    const { code } = await api.createTeam(teamName);
    const { memberId: mid, memberToken: tok, team } = await api.joinTeam(code, nick);
    const m: Membership = { code, memberId: mid, nickname: nick, token: tok, teamName: teamName || '' };
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

  const renameTeam = useCallback(async (code: string, name: string): Promise<void> => {
    const m = membershipsRef.current.find((x) => x.code === code);
    if (!m) return;
    await api.renameTeam(code, name, m.token);
    updateMembershipName(code, name);
    setMemberships(getMemberships());
  }, []);

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
        renameTeam,
      }}
    >
      {children}
    </SocialContext.Provider>
  );
}
