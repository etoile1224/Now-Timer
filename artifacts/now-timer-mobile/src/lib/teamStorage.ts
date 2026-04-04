import { getItem, setItem, removeItem } from './storage';

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
    const raw = getItem(K_MEMBERSHIPS);
    if (!raw) return [];
    return JSON.parse(raw) as Membership[];
  } catch {
    return [];
  }
}

export function getActiveCode(): string | null {
  return getItem(K_ACTIVE);
}

export function setActiveCode(code: string): void {
  setItem(K_ACTIVE, code);
}

export function addMembership(m: Membership): void {
  const list = getMemberships().filter((x) => x.code !== m.code);
  list.push(m);
  setItem(K_MEMBERSHIPS, JSON.stringify(list));
  if (!getItem(K_ACTIVE)) {
    setItem(K_ACTIVE, m.code);
  }
}

export function removeMembership(code: string): void {
  const list = getMemberships().filter((x) => x.code !== code);
  setItem(K_MEMBERSHIPS, JSON.stringify(list));
  if (getItem(K_ACTIVE) === code) {
    setItem(K_ACTIVE, list[0]?.code ?? '');
  }
}
