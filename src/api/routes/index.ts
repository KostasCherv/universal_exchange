import { Router } from 'express';
import settlementsRouter from './settlements';
import balancesRouter from './balances';
import assetsRouter from './assets';
import ordersRouter from './orders';
import tradesRouter from './trades';

const router = Router();

// Mount route modules
router.use('/', settlementsRouter);
router.use('/', balancesRouter);
router.use('/', assetsRouter);
router.use('/', ordersRouter);
router.use('/', tradesRouter);

export default router; 