import { Router } from 'express';
import { healthCheck } from '@/db';

const router = Router();

router.get('/health', async (_req, res) => {
  const dbHealthy = await healthCheck();
  res.json({
    status: 'ok',
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    database: dbHealthy ? 'connected' : 'disconnected',
  });
});

export default router;
