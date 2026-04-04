import { randomBytes } from 'crypto';
import type { Response } from 'express';
import * as db from './db.js';
import * as statsStore from './statsStore.js';

function todayKst(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
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
  avgReactionMs: number;
  reactionCount: number;
}

export interface TeamData {
  id: string;
  code: string;
  members: Record<string, Member>;
}

const teams = new Map<string, TeamData>();
const memberTokens = new Map<string, string>();
const sseClients = new Map<string, Set<{ res: Response; memberId: string }>>();

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
    try { res.write(data); } catch {}
  }
}

export async function initTeams(): Promise<void> {
  try {
    type TeamRow = { id: string; code: string };
    type MemberRow = {
      id: string; team_code: string; nickname: string; status: string;
      ignore_level: number; now_count: number; dismissed_count: number;
      last_seen: string; today_date: string; avg_reaction_ms: number; reaction_count: number;
    };
    type TokenRow = { token: string; member_id: string };

    const [teamRows, memberRows, tokenRows] = await Promise.all([
      db.query<TeamRow>('SELECT id, code FROM teams'),
      db.query<MemberRow>(
        `SELECT id, team_code, nickname, status, ignore_level, now_count,
                dismissed_count, last_seen, today_date, avg_reaction_ms, reaction_count
         FROM team_members`,
      ),
      db.query<TokenRow>('SELECT token, member_id FROM member_tokens'),
    ]);

    for (const t of teamRows) {
      teams.set(t.code, { id: t.id, code: t.code, members: {} });
    }
    for (const m of memberRows) {
      const team = teams.get(m.team_code);
      if (team) {
        team.members[m.id] = {
          id: m.id,
          nickname: m.nickname,
          status: m.status as MemberStatus,
          ignoreLevel: Number(m.ignore_level),
          nowCount: Number(m.now_count),
          dismissedCount: Number(m.dismissed_count),
          lastSeen: m.last_seen,
          todayDate: m.today_date,
          avgReactionMs: Number(m.avg_reaction_ms),
          reactionCount: Number(m.reaction_count),
        };
      }
    }
    for (const t of tokenRows) {
      memberTokens.set(t.member_id, t.token);
    }
    console.log(`[teamStore] Loaded ${teams.size} teams, ${memberRows.length} members`);
  } catch (err) {
    console.error('[teamStore] initTeams failed:', err);
    throw err;
  }
}

export async function createTeam(): Promise<TeamData> {
  let code: string;
  do { code = genCode(); } while (teams.has(code));
  const id = genId();
  const team: TeamData = { id, code, members: {} };
  teams.set(code, team);
  await db.run('INSERT INTO teams (id, code) VALUES ($1, $2)', [id, code]);
  return team;
}

export function getTeam(code: string): TeamData | undefined {
  return teams.get(code.toUpperCase());
}

export async function joinTeam(
  code: string,
  nickname: string,
): Promise<{ team: TeamData; member: Member; token: string } | null> {
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
    avgReactionMs: 0,
    reactionCount: 0,
  };

  const token = randomBytes(16).toString('hex');
  team.members[member.id] = member;
  memberTokens.set(member.id, token);

  await Promise.all([
    db.run(
      `INSERT INTO team_members
         (id, team_code, nickname, status, ignore_level, now_count,
          dismissed_count, last_seen, today_date, avg_reaction_ms, reaction_count)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [member.id, team.code, member.nickname, 'idle', 0, 0, 0,
       member.lastSeen, member.todayDate, 0, 0],
    ),
    db.run(
      'INSERT INTO member_tokens (token, member_id) VALUES ($1, $2)',
      [token, member.id],
    ),
  ]);

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
  reactionMs?: number,
): { team: TeamData; member: Member } | null {
  const found = getMember(memberId);
  if (!found) return null;
  const { team, member } = found;

  const wasAlert = member.status === 'nowAlert' || member.status === 'returnAlert';
  const isEntering = (status === 'nowAlert' || status === 'returnAlert') && !wasAlert;
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
  const prevStatus = member.status;
  member.status = status;
  member.ignoreLevel = ignoreLevel;
  member.lastSeen = new Date().toISOString();

  if (isEntering) member.nowCount += 1;
  if (isDismissedOnTime) member.dismissedCount += 1;

  if (typeof reactionMs === 'number' && reactionMs > 0) {
    member.avgReactionMs = Math.round(
      (member.avgReactionMs * member.reactionCount + reactionMs) /
        (member.reactionCount + 1),
    );
    member.reactionCount += 1;
  }

  void (async () => {
    try {
      if (isEntering) await statsStore.trackAlertEntry(memberId);
      if (isDismissedOnTime) await statsStore.trackDismissal(memberId);
      if (typeof reactionMs === 'number' && reactionMs > 0) {
        await statsStore.addReaction(memberId, reactionMs, isDismissedOnTime);
      }
      if (prevStatus === 'nowAlert' && status === 'breaking') {
        await statsStore.addSession(memberId, 'work');
      } else if (prevStatus === 'returnAlert' && status === 'focusing') {
        await statsStore.addSession(memberId, 'break');
      }
      await db.run(
        `UPDATE team_members
         SET status = $1, ignore_level = $2, now_count = $3, dismissed_count = $4,
             last_seen = $5, today_date = $6, avg_reaction_ms = $7, reaction_count = $8
         WHERE id = $9`,
        [member.status, member.ignoreLevel, member.nowCount, member.dismissedCount,
         member.lastSeen, member.todayDate, member.avgReactionMs, member.reactionCount,
         memberId],
      );
    } catch (err) {
      console.error('[teamStore] updateStatus DB write failed:', err);
    }
  })();

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
