import { randomBytes } from 'crypto';
import type { Response } from 'express';

function todayKst(): string {
  return new Date().toLocaleDateString('ko-KR', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

export type MemberStatus =
  | 'idle'
  | 'focusing'
  | 'breaking'
  | 'nowAlert'
  | 'returnAlert';

export interface Member {
  id: string;
  nickname: string;
  status: MemberStatus;
  ignoreLevel: number;
  nowCount: number;
  dismissedCount: number;
  lastSeen: string;
  todayDate: string;
}

export interface TeamData {
  id: string;
  code: string;
  members: Record<string, Member>;
}

const teams = new Map<string, TeamData>();
const memberTokens = new Map<string, string>();
const sseClients = new Map<
  string,
  Set<{ res: Response; memberId: string }>
>();

const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function genCode(): string {
  return Array.from({ length: 6 }, () =>
    CHARS[Math.floor(Math.random() * CHARS.length)],
  ).join('');
}

function genId(): string {
  return randomBytes(8).toString('hex');
}

function clients(code: string) {
  if (!sseClients.has(code)) sseClients.set(code, new Set());
  return sseClients.get(code)!;
}

function broadcast(code: string, payload: Record<string, unknown>): void {
  const data = `data: ${JSON.stringify(payload)}\n\n`;
  for (const { res } of clients(code)) {
    try {
      res.write(data);
    } catch {}
  }
}

export function createTeam(): TeamData {
  let code: string;
  do { code = genCode(); } while (teams.has(code));
  const team: TeamData = { id: genId(), code, members: {} };
  teams.set(code, team);
  return team;
}

export function getTeam(code: string): TeamData | undefined {
  return teams.get(code.toUpperCase());
}

export function joinTeam(
  code: string,
  nickname: string,
): { team: TeamData; member: Member; token: string } | null {
  const team = teams.get(code.toUpperCase());
  if (!team) return null;

  const member: Member = {
    id: genId(),
    nickname: nickname.slice(0, 20),
    status: 'idle',
    ignoreLevel: 0,
    nowCount: 0,
    dismissedCount: 0,
    lastSeen: new Date().toISOString(),
    todayDate: todayKst(),
  };

  const token = randomBytes(16).toString('hex');
  team.members[member.id] = member;
  memberTokens.set(member.id, token);
  broadcast(team.code, { type: 'join', member });
  return { team, member, token };
}

export function verifyToken(memberId: string, token: string): boolean {
  return memberTokens.get(memberId) === token;
}

export function getMember(
  memberId: string,
): { team: TeamData; member: Member } | null {
  for (const team of teams.values()) {
    if (team.members[memberId]) {
      return { team, member: team.members[memberId] };
    }
  }
  return null;
}

export function updateStatus(
  memberId: string,
  status: MemberStatus,
  ignoreLevel: number,
): { team: TeamData; member: Member } | null {
  const found = getMember(memberId);
  if (!found) return null;
  const { team, member } = found;

  const wasAlert =
    member.status === 'nowAlert' || member.status === 'returnAlert';
  const isEntering =
    (status === 'nowAlert' || status === 'returnAlert') && !wasAlert;
  const isDismissedOnTime =
    wasAlert &&
    (status === 'focusing' || status === 'breaking') &&
    member.ignoreLevel <= 1;

  const today = todayKst();
  if (member.todayDate !== today) {
    member.nowCount = 0;
    member.dismissedCount = 0;
    member.todayDate = today;
  }

  const prevIgnoreLevel = member.ignoreLevel;
  member.status = status;
  member.ignoreLevel = ignoreLevel;
  member.lastSeen = new Date().toISOString();
  if (isEntering) member.nowCount += 1;
  if (isDismissedOnTime) member.dismissedCount += 1;

  broadcast(team.code, { type: 'status', member: { ...member }, prevIgnoreLevel });
  return { team, member };
}

export function pokeMember(fromId: string, toId: string): boolean {
  const from = getMember(fromId);
  const to = getMember(toId);
  if (!from || !to || from.team.code !== to.team.code) return false;
  broadcast(to.team.code, {
    type: 'poke',
    toMemberId: toId,
    fromNickname: from.member.nickname,
  });
  return true;
}

export function addSseClient(
  code: string,
  res: Response,
  memberId: string,
): () => void {
  const entry = { res, memberId };
  clients(code).add(entry);
  return () => clients(code).delete(entry);
}
