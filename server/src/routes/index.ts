import { Router } from 'express';
import healthRouter from './health';
import claimsRouter from './claims';

const router = Router();

router.use('/', healthRouter);
router.use('/claims', claimsRouter);

export default router;
