import { Router } from 'express';
import settlementsRouter from './settlements';
import balancesRouter from './balances';
import assetsRouter from './assets';
import healthRouter from './health';

const router = Router();

// Mount route modules
router.use('/', settlementsRouter);
router.use('/', balancesRouter);
router.use('/', assetsRouter);
router.use('/', healthRouter);

export default router; 