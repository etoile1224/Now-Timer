export interface Membership {
  code: string;
  memberId: string;
  nickname: string;
  token: string;
}

const K_MEMBERSHIPS = 'now-timer-memberships';
const K_ACTIVE = 'now-timer-active-team';

export function getMemberships(): Membership[] {
  try {
    const raw = localStorage.getItem(K_MEMBERSHIPS);
    if (!raw) return migrateLegacy();
    return JSON.parse(raw) as Membership[];
  } catch {
    return [];
  }
}

function migrateLegacy(): Membership[] {
  const code = localStorage.getItem('now-timer-team-code');
  const memberId = localStorage.getItem('now-timer-member-id');
  const nickname = localStorage.getItem('now-timer-nickname');
  const token = localStorage.getItem('now-timer-member-token');
  if (!code || !memberId || !nickname || !token) return [];
  const memberships: Membership[] = [{ code, memberId, nickname, token }];
  localStorage.setItem(K_MEMBERSHIPS, JSON.stringify(memberships));
  localStorage.setItem(K_ACTIVE, code);
  ['now-timer-team-code', 'now-timer-member-id', 'now-timer-nickname', 'now-timer-member-token']
    .forEach((k) => localStorage.removeItem(k));
  return memberships;
}

export function getActiveCode(): string | null {
  return localStorage.getItem(K_ACTIVE);
}

export function setActiveCode(code: string): void {
  localStorage.setItem(K_ACTIVE, code);
}

export function addMembership(m: Membership): void {
  const list = getMemberships().filter((x) => x.code !== m.code);
  list.push(m);
  localStorage.setItem(K_MEMBERSHIPS, JSON.stringify(list));
  if (!localStorage.getItem(K_ACTIVE)) {
    localStorage.setItem(K_ACTIVE, m.code);
  }
}

export function removeMembership(code: string): void {
  const list = getMemberships().filter((x) => x.code !== code);
  localStorage.setItem(K_MEMBERSHIPS, JSON.stringify(list));
  if (localStorage.getItem(K_ACTIVE) === code) {
    localStorage.setItem(K_ACTIVE, list[0]?.code ?? '');
  }
}

export function clearAllMemberships(): void {
  localStorage.removeItem(K_MEMBERSHIPS);
  localStorage.removeItem(K_ACTIVE);
}
