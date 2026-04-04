import { Router } from 'express';
import * as statsStore from '../lib/statsStore';
import * as teamStore from '../lib/teamStore';

const router = Router();

router.get('/stats/:memberId', (req, res) => {
  const token = req.headers['x-member-token'] as string | undefined;
  if (!token || !teamStore.verifyToken(req.params.memberId, token)) {
    res.status(401).json({ error: 'Invalid or missing member token' });
    return;
  }

  const period = (req.query['period'] as string | undefined) ?? 'week';
  if (period !== 'today' && period !== 'week' && period !== 'all') {
    res.status(400).json({ error: 'period must be today, week, or all' });
    return;
  }

  const stats = statsStore.getStats(req.params.memberId, period);
  res.json(stats);
});

export default router;
