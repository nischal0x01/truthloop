import { Router } from 'express';
import healthRouter from './health';
import claimsRouter from './claims';
import commentsRouter from './comments';
import discussionsRouter from './discussions';
import authRouter from './auth';
import usersRouter from './users';
import uploadRouter from './upload';
import reportsRouter from './reports';
import forecastRouter from './forecast';
import leaderboardRouter from './leaderboard';

const router = Router();

router.use('/', healthRouter);
router.use('/claims', claimsRouter);
router.use('/comments', commentsRouter);
router.use('/discussions', discussionsRouter);
router.use('/auth', authRouter);
router.use('/users', usersRouter);
router.use('/upload', uploadRouter);
router.use('/reports', reportsRouter);
router.use('/forecast', forecastRouter);
router.use('/leaderboard', leaderboardRouter);

export default router;
