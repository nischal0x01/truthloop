import { Router } from 'express';
import healthRouter from './health.js';
import claimsRouter from './claims.js';
import commentsRouter from './comments.js';
import authRouter from './auth.js';
import usersRouter from './users.js';
import adminRouter from './admin.js';
import forecastRouter from './forecast.js';
import submissionsRouter from './submissions.js';
import discoveriesRouter from './discoveries.js';

const router = Router();

router.use('/', healthRouter);
router.use('/claims', claimsRouter);
router.use('/comments', commentsRouter);
router.use('/auth', authRouter);
router.use('/users', usersRouter);
router.use('/admin', adminRouter);
router.use('/forecast', forecastRouter);
router.use('/submissions', submissionsRouter);
router.use('/discoveries', discoveriesRouter);

export default router;
