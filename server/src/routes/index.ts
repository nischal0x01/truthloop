import { Router } from 'express';
import healthRouter from './health';
import claimsRouter from './claims';
import authRouter from './auth';
import usersRouter from './users';

const router = Router();

router.use('/', healthRouter);
router.use('/claims', claimsRouter);
router.use('/auth', authRouter);
router.use('/users', usersRouter);

export default router;
