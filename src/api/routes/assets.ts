import { Router, Request, Response } from 'express';
import { addTraceContext } from '../../middleware';

const router = Router();

/**
 * @swagger
 * /assets:
 *   get:
 *     summary: Get supported assets
 *     description: Retrieve list of all supported assets in the system
 *     tags: [Assets]
 *     responses:
 *       200:
 *         description: List of supported assets
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 assets:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Asset'
 *                 total:
 *                   type: number
 *                 timestamp:
 *                   type: string
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/assets', addTraceContext, async (req: Request, res: Response, next) => {
  const logger = req.logger!;
  
  try {
    logger.info('Assets list request received');
    
    // Return supported assets
    const assets = [
      {
        symbol: 'USDC',
        name: 'USD Coin',
        decimals: 6,
        type: 'stablecoin'
      },
      {
        symbol: 'USDT',
        name: 'Tether USD',
        decimals: 6,
        type: 'stablecoin'
      },
      {
        symbol: 'ETH',
        name: 'Ethereum',
        decimals: 18,
        type: 'cryptocurrency'
      },
      {
        symbol: 'BTC',
        name: 'Bitcoin',
        decimals: 8,
        type: 'cryptocurrency'
      }
    ];
    
    logger.info('Assets list retrieved', { count: assets.length });
    
    res.json({
      assets,
      total: assets.length,
      timestamp: new Date().toISOString()
    });
    return;
  } catch (error) {
    if (error instanceof Error) {
      logger.error('Assets request failed', { error: error.message });
    }
    return next(error);
  }
});

export default router; 