import { Router, Request, Response } from 'express';
import { logger } from '../../utils/logger';
import { DatabaseService } from '../../db/schema';

const router = Router();

/**
 * @swagger
 * /api/trades:
 *   get:
 *     summary: Get trade history with optional filters
 *     tags: [Trades]
 *     parameters:
 *       - in: query
 *         name: asset
 *         schema:
 *           type: string
 *         description: Filter by asset symbol
 *         example: "ETH"
 *       - in: query
 *         name: address
 *         schema:
 *           type: string
 *         description: Filter by Ethereum address (buyer or seller)
 *         example: "0x742d35cc6634c0532925a3b8d4c9db96c4b4d8b6"
 *     responses:
 *       200:
 *         description: Trades retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Trade'
 *       500:
 *         description: Internal server error
 */
router.get('/', async (req: Request, res: Response): Promise<void> => {
  const traceId = req.headers['x-trace-id'] as string;
  
  try {
    logger.info('Getting trades', { traceId, query: req.query });
    
    const db = req.app.locals.db as DatabaseService;
    const { asset, address } = req.query;
    
    const trades = await db.getTrades(
      asset as string | undefined,
      address as string | undefined
    );
    
    logger.info('Trades retrieved successfully', { traceId, count: trades.length });
    
    res.json({
      success: true,
      data: trades
    });
    
  } catch (error) {
    logger.error('Failed to get trades', { traceId, error });
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to retrieve trades'
    });
  }
});

export default router; 