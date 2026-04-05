import { Router } from 'express';
import * as store from '../lib/teamStore';
import type { MemberStatus } from '../lib/teamStore';

const router = Router();

router.post('/teams', async (_req, res) => {
  const team = await store.createTeam();
  res.status(201).json({ code: team.code, teamId: team.id });
});

router.post('/teams/join', async (req, res) => {
  const { code, nickname } = req.body as {
    code?: string;
    nickname?: string;
  };
  if (!code || !nickname || !nickname.trim()) {
    res.status(400).json({ error: 'code and nickname are required' });
    return;
  }
  const result = await store.joinTeam(code.trim(), nickname.trim());
  if (!result) {
    res.status(404).json({ error: 'Team not found' });
    return;
  }
  res.status(201).json({
    memberId: result.member.id,
    memberToken: result.token,
    team: result.team,
  });
});

router.get('/teams/:code', (req, res) => {
  const team = store.getTeam(req.params.code);
  if (!team) {
    res.status(404).json({ error: 'Team not found' });
    return;
  }
  res.json({ team });
});

router.patch('/members/:id', (req, res) => {
  const token = req.headers['x-member-token'] as string | undefined;
  if (!token || !store.verifyToken(req.params.id, token)) {
    res.status(401).json({ error: 'Invalid or missing member token' });
    return;
  }

  const { status, ignoreLevel, reactionMs, avatarData } = req.body as {
    status?: MemberStatus;
    ignoreLevel?: number;
    reactionMs?: number;
    avatarData?: string;
  };

  // Handle avatar update
  if (avatarData !== undefined && !status) {
    const result = store.updateAvatar(req.params.id, avatarData);
    if (!result) { res.status(404).json({ error: 'Member not found' }); return; }
    res.json({ member: result.member });
    return;
  }

  if (!status) {
    res.status(400).json({ error: 'status is required' });
    return;
  }
  const result = store.updateStatus(req.params.id, status, ignoreLevel ?? 0, reactionMs);
  if (!result) {
    res.status(404).json({ error: 'Member not found' });
    return;
  }
  res.json({ member: result.member });
});

router.post('/members/:fromId/poke/:toId', (req, res) => {
  const token = req.headers['x-member-token'] as string | undefined;
  if (!token || !store.verifyToken(req.params.fromId, token)) {
    res.status(401).json({ error: 'Invalid or missing member token' });
    return;
  }

  const ok = store.pokeMember(req.params.fromId, req.params.toId);
  if (!ok) {
    res.status(404).json({ error: 'Member not found' });
    return;
  }
  res.json({ ok: true });
});

router.post('/members/:id/voice', async (req, res) => {
  const token = req.headers['x-member-token'] as string | undefined;
  if (!token || !store.verifyToken(req.params.id, token)) {
    res.status(401).json({ error: 'Invalid or missing member token' });
    return;
  }
  const { audio } = req.body as { audio?: string };
  if (!audio) {
    res.status(400).json({ error: 'audio (base64) is required' });
    return;
  }
  // Limit to ~200KB base64 (roughly 150KB audio)
  if (audio.length > 200_000) {
    res.status(413).json({ error: 'Audio too large (max 5 seconds)' });
    return;
  }
  const ok = await store.saveVoice(req.params.id, audio);
  if (!ok) { res.status(404).json({ error: 'Member not found' }); return; }
  res.json({ ok: true });
});

router.get('/members/:id/voice', async (req, res) => {
  const audio = await store.getVoice(req.params.id);
  if (!audio) {
    res.status(404).json({ error: 'No voice recording found' });
    return;
  }
  res.json({ audio });
});

router.get('/teams/:code/stream', (req, res) => {
  const team = store.getTeam(req.params.code);
  if (!team) {
    res.status(404).end();
    return;
  }

  const memberId = String(req.query['memberId'] ?? '');

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  res.write(`data: ${JSON.stringify({ type: 'init', team })}\n\n`);

  const unsub = store.addSseClient(req.params.code, res, memberId);

  const heartbeat = setInterval(() => {
    try { res.write(':\n\n'); } catch { cleanup(); }
  }, 25000);

  function cleanup() {
    clearInterval(heartbeat);
    unsub();
  }

  req.on('close', cleanup);
  res.on('close', cleanup);
});

export default router;
