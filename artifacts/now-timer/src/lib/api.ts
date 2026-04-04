export interface Member {
  id: string;
  nickname: string;
  status: string;
  ignoreLevel: number;
  nowCount: number;
  dismissedCount: number;
  lastSeen: string;
}

export interface TeamData {
  id: string;
  code: string;
  members: Record<string, Member>;
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
): Promise<T> {
  const res = await fetch(`/api${path}`, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : {},
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => res.status.toString());
    throw new Error(`${method} /api${path} failed: ${text}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  createTeam(): Promise<{ code: string; teamId: string }> {
    return request('POST', '/teams');
  },

  joinTeam(
    code: string,
    nickname: string,
  ): Promise<{ memberId: string; team: TeamData }> {
    return request('POST', '/teams/join', { code, nickname });
  },

  getTeam(code: string): Promise<{ team: TeamData }> {
    return request('GET', `/teams/${code}`);
  },

  updateStatus(memberId: string, status: string, ignoreLevel: number): void {
    request('PATCH', `/members/${memberId}`, { status, ignoreLevel }).catch(
      () => {},
    );
  },

  poke(fromId: string, toId: string): Promise<void> {
    return request('POST', `/members/${fromId}/poke/${toId}`);
  },
};
