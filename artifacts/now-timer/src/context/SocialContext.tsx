import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { useTimer } from '@/context/TimerContext';
import { api, type Member } from '@/lib/api';
import { clearTeam, getSavedTeam, saveTeam } from '@/lib/teamStorage';

interface SocialState {
  teamCode: string | null;
  memberId: string | null;
  nickname: string | null;
  members: Record<string, Member>;
  pokeFrom: string | null;
  peerAlertMsg: string | null;
  clearPoke: () => void;
  clearPeerAlert: () => void;
  createTeam: (nickname: string) => Promise<string>;
  joinTeam: (code: string, nickname: string) => Promise<void>;
  leaveTeam: () => void;
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

  const [teamCode, setTeamCode] = useState<string | null>(null);
  const [memberId, setMemberId] = useState<string | null>(null);
  const [memberToken, setMemberToken] = useState<string | null>(null);
  const [nickname, setNickname] = useState<string | null>(null);
  const [members, setMembers] = useState<Record<string, Member>>({});
  const [pokeFrom, setPokeFrom] = useState<string | null>(null);
  const [peerAlertMsg, setPeerAlertMsg] = useState<string | null>(null);

  const esRef = useRef<EventSource | null>(null);
  const memberIdRef = useRef<string | null>(null);
  const membersRef = useRef<Record<string, Member>>({});
  const memberTokenRef = useRef<string | null>(null);

  useEffect(() => { memberIdRef.current = memberId; }, [memberId]);
  useEffect(() => { membersRef.current = members; }, [members]);
  useEffect(() => { memberTokenRef.current = memberToken; }, [memberToken]);

  useEffect(() => {
    const saved = getSavedTeam();
    if (saved) {
      setTeamCode(saved.code);
      setMemberId(saved.memberId);
      setNickname(saved.nickname);
      setMemberToken(saved.token);
    }
  }, []);

  useEffect(() => {
    if (!teamCode || !memberId) {
      esRef.current?.close();
      esRef.current = null;
      return;
    }

    let active = true;

    function connect() {
      if (!active || !teamCode || !memberId) return;
      const es = new EventSource(
        `/api/teams/${teamCode}/stream?memberId=${memberId}`,
      );
      esRef.current = es;

      es.onmessage = (ev: MessageEvent) => {
        try {
          const event = JSON.parse(ev.data as string) as {
            type: string;
            team?: { members: Record<string, Member> };
            member?: Member;
            prevIgnoreLevel?: number;
            toMemberId?: string;
            fromNickname?: string;
          };

          if (event.type === 'init' && event.team) {
            setMembers({ ...event.team.members });
          } else if (
            (event.type === 'status' || event.type === 'join') &&
            event.member
          ) {
            const incomingMember = event.member;
            const prevMember = membersRef.current[incomingMember.id];
            const prevLevel = prevMember?.ignoreLevel ?? 0;
            const newLevel = incomingMember.ignoreLevel;

            if (incomingMember.id !== memberIdRef.current) {
              if (
                (prevLevel < 2 && newLevel >= 2) ||
                (prevLevel < 3 && newLevel >= 3)
              ) {
                setPeerAlertMsg(
                  `${incomingMember.nickname}님이 NOW! Lv.${newLevel}을 무시하고 있어요`,
                );
              }
            }

            setMembers((prev) => ({
              ...prev,
              [incomingMember.id]: incomingMember,
            }));
          } else if (
            event.type === 'poke' &&
            event.toMemberId === memberIdRef.current
          ) {
            setPokeFrom(event.fromNickname ?? '팀원');
          }
        } catch {}
      };

      es.onerror = () => {
        es.close();
        if (active) setTimeout(connect, 3000);
      };
    }

    connect();
    return () => {
      active = false;
      esRef.current?.close();
    };
  }, [teamCode, memberId]);

  useEffect(() => {
    if (!memberId || !memberToken) return;
    api.updateStatus(memberId, phase, ignoreLevel, memberToken);
  }, [phase, ignoreLevel, memberId, memberToken]);

  const createTeam = useCallback(async (nick: string): Promise<string> => {
    const { code } = await api.createTeam();
    const { memberId: mid, memberToken: tok, team } = await api.joinTeam(code, nick);
    saveTeam(code, mid, nick, tok);
    setTeamCode(code);
    setMemberId(mid);
    setMemberToken(tok);
    setNickname(nick);
    setMembers(team.members);
    return code;
  }, []);

  const joinTeam = useCallback(
    async (code: string, nick: string): Promise<void> => {
      const upper = code.toUpperCase();
      const { memberId: mid, memberToken: tok, team } = await api.joinTeam(upper, nick);
      saveTeam(upper, mid, nick, tok);
      setTeamCode(upper);
      setMemberId(mid);
      setMemberToken(tok);
      setNickname(nick);
      setMembers(team.members);
    },
    [],
  );

  const leaveTeam = useCallback(() => {
    clearTeam();
    esRef.current?.close();
    setTeamCode(null);
    setMemberId(null);
    setMemberToken(null);
    setNickname(null);
    setMembers({});
  }, []);

  const poke = useCallback(
    (toId: string) => {
      if (!memberId || !memberTokenRef.current) return;
      api.poke(memberId, toId, memberTokenRef.current).catch(() => {});
    },
    [memberId],
  );

  const clearPoke = useCallback(() => setPokeFrom(null), []);
  const clearPeerAlert = useCallback(() => setPeerAlertMsg(null), []);

  return (
    <SocialContext.Provider
      value={{
        teamCode,
        memberId,
        nickname,
        members,
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
