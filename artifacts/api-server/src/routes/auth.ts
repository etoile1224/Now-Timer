import { Router } from 'express';
import * as userStore from '../lib/userStore';
import * as jwt from '../lib/jwt';

const router = Router();

function safeUser(u: userStore.User) {
  return {
    id: u.id,
    username: u.username,
    memberships: u.memberships,
    createdAt: u.createdAt,
  };
}

router.post('/auth/register', async (req, res) => {
  const { username, password } = req.body as { username?: string; password?: string };

  if (!username || typeof username !== 'string' || username.length < 2 || username.length > 20) {
    res.status(400).json({ error: '아이디는 2~20자여야 해요' });
    return;
  }
  if (!password || typeof password !== 'string' || password.length < 6) {
    res.status(400).json({ error: '비밀번호는 6자 이상이어야 해요' });
    return;
  }

  const result = await userStore.register(username.trim(), password);
  if ('error' in result) {
    res.status(409).json({ error: '이미 사용 중인 아이디예요' });
    return;
  }

  const token = jwt.signToken({ userId: result.id, username: result.username });
  res.json({ token, user: safeUser(result) });
});

router.post('/auth/login', async (req, res) => {
  const { username, password } = req.body as { username?: string; password?: string };

  if (!username || !password) {
    res.status(400).json({ error: '아이디와 비밀번호를 입력해주세요' });
    return;
  }

  const user = await userStore.login(username.trim(), password);
  if (!user) {
    res.status(401).json({ error: '아이디 또는 비밀번호가 틀렸어요' });
    return;
  }

  const token = jwt.signToken({ userId: user.id, username: user.username });
  res.json({ token, user: safeUser(user) });
});

router.get('/auth/me', async (req, res) => {
  const header = req.headers['authorization'];
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'unauthorized' });
    return;
  }
  const payload = jwt.verifyToken(header.slice(7));
  if (!payload) {
    res.status(401).json({ error: 'invalid_token' });
    return;
  }
  const user = await userStore.getUser(payload.userId);
  if (!user) {
    res.status(404).json({ error: 'user_not_found' });
    return;
  }
  res.json({ user: safeUser(user) });
});

router.post('/auth/link-membership', async (req, res) => {
  const header = req.headers['authorization'];
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'unauthorized' });
    return;
  }
  const payload = jwt.verifyToken(header.slice(7));
  if (!payload) {
    res.status(401).json({ error: 'invalid_token' });
    return;
  }
  const { code, memberId, nickname, token } = req.body as userStore.SavedMembership;
  if (!code || !memberId || !nickname || !token) {
    res.status(400).json({ error: 'missing_fields' });
    return;
  }
  await userStore.linkMembership(payload.userId, { code, memberId, nickname, token });
  res.json({ ok: true });
});

router.delete('/auth/link-membership/:code', async (req, res) => {
  const header = req.headers['authorization'];
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'unauthorized' });
    return;
  }
  const payload = jwt.verifyToken(header.slice(7));
  if (!payload) {
    res.status(401).json({ error: 'invalid_token' });
    return;
  }
  await userStore.unlinkMembership(payload.userId, req.params.code);
  res.json({ ok: true });
});

// Voice poke — per-user (account)
router.post('/auth/voice', async (req, res) => {
  const header = req.headers['authorization'];
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'unauthorized' });
    return;
  }
  const payload = jwt.verifyToken(header.slice(7));
  if (!payload) {
    res.status(401).json({ error: 'invalid_token' });
    return;
  }
  const { audio } = req.body as { audio?: string };
  if (!audio) {
    res.status(400).json({ error: 'audio (base64) is required' });
    return;
  }
  if (audio.length > 200_000) {
    res.status(413).json({ error: 'Audio too large (max 5 seconds)' });
    return;
  }
  await userStore.saveVoice(payload.userId, audio);

  // Update hasVoice flag on all team members linked to this user
  const user = await userStore.getUser(payload.userId);
  if (user) {
    const store = await import('../lib/teamStore.js');
    for (const m of user.memberships) {
      const found = store.getMember(m.memberId);
      if (found) {
        found.member.hasVoice = true;
        store.broadcastMemberStatus(found.team.code, found.member);
      }
    }
  }

  res.json({ ok: true });
});

router.delete('/auth/voice', async (req, res) => {
  const header = req.headers['authorization'];
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'unauthorized' });
    return;
  }
  const payload = jwt.verifyToken(header.slice(7));
  if (!payload) {
    res.status(401).json({ error: 'invalid_token' });
    return;
  }
  await userStore.saveVoice(payload.userId, '');

  // Clear hasVoice on all team members
  const user = await userStore.getUser(payload.userId);
  if (user) {
    const store = await import('../lib/teamStore.js');
    for (const m of user.memberships) {
      const found = store.getMember(m.memberId);
      if (found) {
        found.member.hasVoice = false;
        store.broadcastMemberStatus(found.team.code, found.member);
      }
    }
  }

  res.json({ ok: true });
});

router.get('/auth/voice', async (req, res) => {
  const header = req.headers['authorization'];
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'unauthorized' });
    return;
  }
  const payload = jwt.verifyToken(header.slice(7));
  if (!payload) {
    res.status(401).json({ error: 'invalid_token' });
    return;
  }
  const audio = await userStore.getVoice(payload.userId);
  if (!audio) {
    res.status(404).json({ error: 'No voice recording found' });
    return;
  }
  res.json({ audio });
});

export default router;
