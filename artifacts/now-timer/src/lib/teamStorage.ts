const K_CODE = 'now-timer-team-code';
const K_ID = 'now-timer-member-id';
const K_NICK = 'now-timer-nickname';
const K_TOKEN = 'now-timer-member-token';

export function getSavedTeam(): {
  code: string;
  memberId: string;
  nickname: string;
  token: string;
} | null {
  const code = localStorage.getItem(K_CODE);
  const memberId = localStorage.getItem(K_ID);
  const nickname = localStorage.getItem(K_NICK);
  const token = localStorage.getItem(K_TOKEN);
  if (!code || !memberId || !nickname || !token) return null;
  return { code, memberId, nickname, token };
}

export function saveTeam(
  code: string,
  memberId: string,
  nickname: string,
  token: string,
): void {
  localStorage.setItem(K_CODE, code);
  localStorage.setItem(K_ID, memberId);
  localStorage.setItem(K_NICK, nickname);
  localStorage.setItem(K_TOKEN, token);
}

export function clearTeam(): void {
  localStorage.removeItem(K_CODE);
  localStorage.removeItem(K_ID);
  localStorage.removeItem(K_NICK);
  localStorage.removeItem(K_TOKEN);
}
