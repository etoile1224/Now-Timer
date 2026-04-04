const K_CODE = 'now-timer-team-code';
const K_ID = 'now-timer-member-id';
const K_NICK = 'now-timer-nickname';

export function getSavedTeam(): {
  code: string;
  memberId: string;
  nickname: string;
} | null {
  const code = localStorage.getItem(K_CODE);
  const memberId = localStorage.getItem(K_ID);
  const nickname = localStorage.getItem(K_NICK);
  if (!code || !memberId || !nickname) return null;
  return { code, memberId, nickname };
}

export function saveTeam(
  code: string,
  memberId: string,
  nickname: string,
): void {
  localStorage.setItem(K_CODE, code);
  localStorage.setItem(K_ID, memberId);
  localStorage.setItem(K_NICK, nickname);
}

export function clearTeam(): void {
  localStorage.removeItem(K_CODE);
  localStorage.removeItem(K_ID);
  localStorage.removeItem(K_NICK);
}
