import { Router } from 'express';
import routes from './routes/index';
import { errorHandler } from '../middleware';

const router = Router();

// Mount all routes
router.use('/api', routes);

export { router, errorHandler }; 