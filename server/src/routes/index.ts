import { Router } from 'express';
import healthRouter from './health';
import claimsRouter from './claims';
import authRouter from './auth';

const router = Router();

router.use('/', healthRouter);
router.use('/claims', claimsRouter);
router.use('/auth', authRouter);

export default router;
