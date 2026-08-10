import { Router } from 'express';
import healthRouter from './health';
import claimsRouter from './claims';
import commentsRouter from './comments';
import authRouter from './auth';
import usersRouter from './users';

const router = Router();

router.use('/', healthRouter);
router.use('/claims', claimsRouter);
router.use('/comments', commentsRouter);
router.use('/auth', authRouter);
router.use('/users', usersRouter);

export default router;
