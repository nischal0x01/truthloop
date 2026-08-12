import { Router } from 'express';
import healthRouter from './health';
import claimsRouter from './claims';
import commentsRouter from './comments';
import discussionsRouter from './discussions';
import authRouter from './auth';
import usersRouter from './users';
import uploadRouter from './upload';

const router = Router();

router.use('/', healthRouter);
router.use('/claims', claimsRouter);
router.use('/comments', commentsRouter);
router.use('/discussions', discussionsRouter);
router.use('/auth', authRouter);
router.use('/users', usersRouter);
router.use('/upload', uploadRouter);

export default router;
