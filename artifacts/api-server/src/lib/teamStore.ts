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
  avatarData: string;
  hasVoice: boolean;
  pushToken: string;
  pokeCount: number;
}

export interface TeamData {
  id: string;
  code: string;
  name: string;
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

export function broadcastMemberStatus(teamCode: string, member: Member): void {
  broadcast(teamCode, { type: 'status', member: { ...member } });
}

export async function initTeams(): Promise<void> {
  try {
    type TeamRow = { id: string; code: string; name: string };
    type MemberRow = {
      id: string; team_code: string; nickname: string; status: string;
      ignore_level: number; now_count: number; dismissed_count: number;
      last_seen: string; today_date: string; avg_reaction_ms: number; reaction_count: number;
      has_voice: boolean; push_token: string; avatar_data: string; poke_count: number;
    };
    type TokenRow = { token: string; member_id: string };

    // Ensure columns exist (migration for existing DBs)
    await db.run("ALTER TABLE teams ADD COLUMN IF NOT EXISTS name TEXT NOT NULL DEFAULT ''").catch(() => {});
    await db.run("ALTER TABLE team_members ADD COLUMN IF NOT EXISTS poke_count INTEGER NOT NULL DEFAULT 0").catch(() => {});
    await db.run("ALTER TABLE users ADD COLUMN IF NOT EXISTS voice_poke TEXT DEFAULT ''").catch(() => {});

    const [teamRows, memberRows, tokenRows] = await Promise.all([
      db.query<TeamRow>('SELECT id, code, name FROM teams'),
      db.query<MemberRow>(
        `SELECT tm.id, tm.team_code, tm.nickname, tm.status, tm.ignore_level, tm.now_count,
                tm.dismissed_count, tm.last_seen, tm.today_date, tm.avg_reaction_ms, tm.reaction_count,
                ((tm.voice_poke IS NOT NULL AND tm.voice_poke != '') OR
                 EXISTS(SELECT 1 FROM user_memberships um JOIN users u ON u.id = um.user_id
                        WHERE um.member_id = tm.id AND u.voice_poke IS NOT NULL AND u.voice_poke != '')) AS has_voice,
                COALESCE(tm.push_token, '') AS push_token,
                COALESCE(tm.avatar_data, '') AS avatar_data,
                COALESCE(tm.poke_count, 0) AS poke_count
         FROM team_members tm`,
      ),
      db.query<TokenRow>('SELECT token, member_id FROM member_tokens'),
    ]);

    for (const t of teamRows) {
      teams.set(t.code, { id: t.id, code: t.code, name: t.name || '', members: {} });
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
          avatarData: m.avatar_data || '',
          hasVoice: !!m.has_voice,
          pushToken: m.push_token || '',
          pokeCount: Number(m.poke_count) || 0,
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

export async function createTeam(name?: string): Promise<TeamData> {
  let code: string;
  do { code = genCode(); } while (teams.has(code));
  const id = genId();
  const teamName = name?.trim() || '';
  const team: TeamData = { id, code, name: teamName, members: {} };
  teams.set(code, team);
  await db.run('INSERT INTO teams (id, code, name) VALUES ($1, $2, $3)', [id, code, teamName]);
  return team;
}

export function renameTeam(code: string, name: string): TeamData | null {
  const team = teams.get(code.toUpperCase());
  if (!team) return null;
  team.name = name.slice(0, 30);
  void db.run('UPDATE teams SET name = $1 WHERE code = $2', [team.name, team.code]);
  broadcast(team.code, { type: 'teamRename', name: team.name });
  return team;
}

export function getTeam(code: string): TeamData | undefined {
  return teams.get(code.toUpperCase());
}

async function loadTeamFromDb(upperCode: string): Promise<TeamData | null> {
  type TeamRow = { id: string; code: string; name: string };
  type MemberRow = {
    id: string; team_code: string; nickname: string; status: string;
    ignore_level: number; now_count: number; dismissed_count: number;
    last_seen: string; today_date: string; avg_reaction_ms: number; reaction_count: number;
    has_voice: boolean; push_token: string; avatar_data: string; poke_count: number;
  };
  type TokenRow = { token: string; member_id: string };

  const teamRow = await db.queryOne<TeamRow>(
    'SELECT id, code, name FROM teams WHERE code = $1',
    [upperCode],
  );
  if (!teamRow) return null;

  const team: TeamData = { id: teamRow.id, code: teamRow.code, name: teamRow.name || '', members: {} };

  const [memberRows, tokenRows] = await Promise.all([
    db.query<MemberRow>(
      `SELECT tm.id, tm.team_code, tm.nickname, tm.status, tm.ignore_level, tm.now_count,
              tm.dismissed_count, tm.last_seen, tm.today_date, tm.avg_reaction_ms, tm.reaction_count,
              ((tm.voice_poke IS NOT NULL AND tm.voice_poke != '') OR
               EXISTS(SELECT 1 FROM user_memberships um JOIN users u ON u.id = um.user_id
                      WHERE um.member_id = tm.id AND u.voice_poke IS NOT NULL AND u.voice_poke != '')) AS has_voice,
              COALESCE(tm.push_token, '') AS push_token,
              COALESCE(tm.avatar_data, '') AS avatar_data,
              COALESCE(tm.poke_count, 0) AS poke_count
       FROM team_members tm WHERE tm.team_code = $1`,
      [upperCode],
    ),
    db.query<TokenRow>(
      'SELECT token, member_id FROM member_tokens WHERE member_id IN (SELECT id FROM team_members WHERE team_code = $1)',
      [upperCode],
    ),
  ]);

  for (const m of memberRows) {
    team.members[m.id] = {
      id: m.id, nickname: m.nickname, status: m.status as MemberStatus,
      ignoreLevel: Number(m.ignore_level), nowCount: Number(m.now_count),
      dismissedCount: Number(m.dismissed_count), lastSeen: m.last_seen,
      todayDate: m.today_date, avgReactionMs: Number(m.avg_reaction_ms),
      reactionCount: Number(m.reaction_count),
      avatarData: m.avatar_data || '',
      hasVoice: !!m.has_voice,
      pushToken: m.push_token || '',
      pokeCount: Number(m.poke_count) || 0,
    };
  }
  for (const t of tokenRows) {
    memberTokens.set(t.member_id, t.token);
  }

  teams.set(team.code, team);
  console.log(`[teamStore] Lazy-loaded team ${team.code} from DB`);
  return team;
}

export async function joinTeam(
  code: string,
  nickname: string,
): Promise<{ team: TeamData; member: Member; token: string } | null> {
  const upper = code.toUpperCase();
  let team = teams.get(upper);
  if (!team) {
    team = await loadTeamFromDb(upper) ?? undefined;
  }
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
    avatarData: '',
    hasVoice: false,
    pushToken: '',
    pokeCount: 0,
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

  // Push notifications for NOW! level escalation
  if (prevIgnoreLevel < 2 && member.ignoreLevel >= 2) {
    sendPushToTeammates(
      team.code,
      memberId,
      `${member.nickname}님이 NOW! Lv.2 무시 중`,
      '깨워주세요!',
      { type: 'alert', memberId, level: 2 },
    );
  } else if (prevIgnoreLevel < 3 && member.ignoreLevel >= 3) {
    sendPushToTeammates(
      team.code,
      memberId,
      `🚨 ${member.nickname}님이 NOW! Lv.3 무시 중!`,
      '긴급! 깨워주세요!',
      { type: 'alert', memberId, level: 3 },
    );
  }

  return { team, member };
}

export function updateAvatar(memberId: string, avatarData: string): { team: TeamData; member: Member } | null {
  const found = getMember(memberId);
  if (!found) return null;
  const { team, member } = found;
  member.avatarData = avatarData;

  void db.run('UPDATE team_members SET avatar_data = $1 WHERE id = $2', [avatarData, memberId]);
  // Separate event type — avatar changes are infrequent, no need to send full member object
  broadcast(team.code, { type: 'avatar', memberId, avatarData });
  return { team, member };
}

export async function getAvatar(memberId: string): Promise<string | null> {
  const row = await db.queryOne<{ avatar_data: string }>('SELECT avatar_data FROM team_members WHERE id = $1', [memberId]);
  return row?.avatar_data || null;
}

export async function saveVoice(memberId: string, audioBase64: string): Promise<boolean> {
  const found = getMember(memberId);
  if (!found) return false;
  found.member.hasVoice = !!audioBase64;
  await db.run('UPDATE team_members SET voice_poke = $1 WHERE id = $2', [audioBase64, memberId]);
  return true;
}

export async function getVoice(memberId: string): Promise<string | null> {
  // Look up user-level voice first (via user_memberships → users)
  const row = await db.queryOne<{ voice_poke: string }>(
    `SELECT u.voice_poke FROM users u
     JOIN user_memberships um ON um.user_id = u.id
     WHERE um.member_id = $1 AND u.voice_poke IS NOT NULL AND u.voice_poke != ''`,
    [memberId],
  );
  if (row?.voice_poke) return row.voice_poke;
  // Fallback: legacy per-member voice
  const legacy = await db.queryOne<{ voice_poke: string }>(
    'SELECT voice_poke FROM team_members WHERE id = $1',
    [memberId],
  );
  return legacy?.voice_poke || null;
}

const pokeCooldowns = new Map<string, number>();

export function pokeMember(fromId: string, toId: string): boolean {
  const from = getMember(fromId);
  const to = getMember(toId);
  console.log(`[poke] fromId=${fromId} toId=${toId} from=${!!from} to=${!!to}`);
  if (!from || !to || from.team.code !== to.team.code) return false;

  // 10초 쿨다운
  const cooldownKey = `${fromId}→${toId}`;
  const now = Date.now();
  const lastPoke = pokeCooldowns.get(cooldownKey) ?? 0;
  if (now - lastPoke < 10_000) {
    console.log(`[poke] COOLDOWN — ${from.member.nickname} → ${to.member.nickname} (${Math.round((10000 - (now - lastPoke)) / 1000)}s left)`);
    return true; // 성공으로 리턴하되 실제 전송 안 함
  }
  pokeCooldowns.set(cooldownKey, now);

  console.log(`[poke] ${from.member.nickname} → ${to.member.nickname} | pushToken=${to.member.pushToken ? 'YES' : 'NONE'} | sseClients=${clients(to.team.code).size}`);

  // Increment poke count for the sender
  from.member.pokeCount += 1;
  void db.run('UPDATE team_members SET poke_count = $1 WHERE id = $2', [from.member.pokeCount, fromId]);

  // Broadcast poke event + updated sender status (with new pokeCount)
  broadcast(to.team.code, {
    type: 'poke',
    toMemberId: toId,
    fromNickname: from.member.nickname,
    fromMemberId: fromId,
    hasVoice: from.member.hasVoice,
  });
  broadcast(from.team.code, { type: 'status', member: { ...from.member } });
  // Send push notification to poked member
  if (to.member.pushToken) {
    void sendPushNotification(
      to.member.pushToken,
      `${from.member.nickname}님이 깨웁니다! 👊`,
      'NOW! 알림을 무시하지 마세요!',
      { type: 'poke', fromId, fromNickname: from.member.nickname, hasVoice: from.member.hasVoice },
    );
  }
  return true;
}

// --- Expo Push Notifications ---

async function sendPushNotification(
  pushToken: string,
  title: string,
  body: string,
  data?: Record<string, unknown>,
): Promise<void> {
  console.log(`[push] Sending to ${pushToken?.slice(0, 30)}... title="${title}"`);
  if (!pushToken || !pushToken.startsWith('ExponentPushToken')) {
    console.log('[push] SKIPPED — invalid token');
    return;
  }
  try {
    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: pushToken,
        title,
        body,
        sound: 'default',
        priority: 'high',
        data,
      }),
    });
  } catch (err) {
    console.warn('[push] Failed to send push:', err);
  }
}

function sendPushToTeammates(
  teamCode: string,
  excludeMemberId: string,
  title: string,
  body: string,
  data?: Record<string, unknown>,
): void {
  const team = teams.get(teamCode);
  if (!team) return;
  for (const m of Object.values(team.members)) {
    if (m.id === excludeMemberId) continue;
    if (m.pushToken) {
      void sendPushNotification(m.pushToken, title, body, data);
    }
  }
}

export function registerPushToken(memberId: string, pushToken: string): boolean {
  const found = getMember(memberId);
  if (!found) {
    console.log(`[push-reg] FAILED — member ${memberId} not found`);
    return false;
  }
  console.log(`[push-reg] ${found.member.nickname} → ${pushToken.slice(0, 30)}...`);
  found.member.pushToken = pushToken;
  void db.run('UPDATE team_members SET push_token = $1 WHERE id = $2', [pushToken, memberId]);
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
