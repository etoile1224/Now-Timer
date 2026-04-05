// Railway cloud API server
export const API_BASE_URL = 'https://workspaceapi-server-production-1679.up.railway.app';

export interface Member {
  id: string;
  nickname: string;
  status: string;
  ignoreLevel: number;
  nowCount: number;
  dismissedCount: number;
  lastSeen: string;
  todayDate?: string;
  avgReactionMs: number;
  reactionCount: number;
  avatarData: string;
  hasVoice: boolean;
  pokeCount: number;
}

export interface TeamData {
  id: string;
  code: string;
  name: string;
  members: Record<string, Member>;
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  token?: string,
): Promise<T> {
  const headers: Record<string, string> = {};
  if (body) headers['Content-Type'] = 'application/json';
  if (token) headers['X-Member-Token'] = token;

  const res = await fetch(`${API_BASE_URL}/api${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => res.status.toString());
    throw new Error(`${method} /api${path} failed: ${text}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  createTeam(name?: string): Promise<{ code: string; teamId: string; name: string }> {
    return request('POST', '/teams', name ? { name } : undefined);
  },
  renameTeam(code: string, name: string, token: string): Promise<{ name: string }> {
    return request('PATCH', `/teams/${code}`, { name }, token);
  },
  joinTeam(code: string, nickname: string): Promise<{ memberId: string; memberToken: string; team: TeamData }> {
    return request('POST', '/teams/join', { code, nickname });
  },
  getTeam(code: string): Promise<{ team: TeamData }> {
    return request('GET', `/teams/${code}`);
  },
  updateStatus(memberId: string, status: string, ignoreLevel: number, token: string, reactionMs?: number): Promise<void> {
    return request('PATCH', `/members/${memberId}`, { status, ignoreLevel, reactionMs }, token);
  },
  poke(fromId: string, toId: string, token: string): Promise<void> {
    return request('POST', `/members/${fromId}/poke/${toId}`, undefined, token);
  },
  updateAvatar(memberId: string, avatarData: string, token: string): Promise<void> {
    return request('PATCH', `/members/${memberId}`, { avatarData }, token);
  },
  getAvatar(memberId: string): Promise<{ avatarData: string }> {
    return request('GET', `/members/${memberId}/avatar`);
  },
  uploadVoice(memberId: string, audio: string, token: string): Promise<void> {
    return request('POST', `/members/${memberId}/voice`, { audio }, token);
  },
  getVoice(memberId: string): Promise<{ audio: string }> {
    return request('GET', `/members/${memberId}/voice`);
  },
  registerPushToken(memberId: string, pushToken: string, token: string): Promise<void> {
    return request('POST', `/members/${memberId}/push-token`, { pushToken }, token);
  },
  getStats(memberId: string, token: string, period: 'today' | 'week' | 'all'): Promise<{
    totalSessions: number;
    avgReactionMs: number | null;
    complianceRate: number | null;
    streak: number;
    daily: { date: string; sessions: number; complianceRate: number | null }[];
  }> {
    return request('GET', `/stats/${memberId}?period=${period}`, undefined, token);
  },
};
