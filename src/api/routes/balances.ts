import { Router, Request, Response } from 'express';
import { BalanceResponse } from '../../types';
import { 
  validateAddressParam, 
  validateAssetQuery,
  isValidAddress,
  isValidAsset 
} from '../../utils/validation';
import { dbService } from '../../db/schema';
import { addTraceContext } from '../../middleware';

const router = Router();

/**
 * @swagger
 * /balance/{address}:
 *   get:
 *     summary: Get balance for address and asset
 *     description: Retrieve the balance of a specific asset for a given address
 *     tags: [Balances]
 *     parameters:
 *       - in: path
 *         name: address
 *         required: true
 *         schema:
 *           type: string
 *         description: Ethereum address
 *       - in: query
 *         name: asset
 *         required: true
 *         schema:
 *           type: string
 *         description: Asset symbol (USDC, USDT, ETH, BTC)
 *     responses:
 *       200:
 *         description: Balance information
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Balance'
 *       400:
 *         description: Bad request - invalid address or asset
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/balance/:address', addTraceContext, async (req: Request, res: Response, next) => {
  const logger = req.logger!;
  
  try {
    logger.info('Balance request received', { 
      address: req.params.address, 
      query: req.query 
    });
    
    // Validate address parameter
    const { address } = validateAddressParam({ address: req.params.address });
    
    // Validate asset query parameter
    const { asset } = validateAssetQuery({ asset: req.query.asset as string });
    
    // Additional validation
    if (!isValidAddress(address)) {
      return res.status(400).json({
        error: 'Invalid Address',
        message: 'Address must be a valid Ethereum address',
        statusCode: 400
      });
    }
    
    if (!isValidAsset(asset)) {
      return res.status(400).json({
        error: 'Invalid Asset',
        message: 'Asset must be a valid asset symbol',
        statusCode: 400
      });
    }
    
    // Get balance from database
    const balance = await dbService.getBalance(address, asset);
    
    logger.info('Balance retrieved', { address, asset, balance });
    
    // Return response
    const response: BalanceResponse = {
      address,
      asset,
      balance
    };
    
    res.json(response);
    return;
  } catch (error) {
    if (error instanceof Error) {
      logger.error('Balance request failed', { error: error.message });
      
      if (error.message.includes('validation')) {
        return res.status(400).json({
          error: 'Validation Error',
          message: error.message,
          statusCode: 400
        });
      }
    }
    return next(error);
  }
});

/**
 * @swagger
 * /balance/{address}/all:
 *   get:
 *     summary: Get all balances for address
 *     description: Retrieve all asset balances for a given address
 *     tags: [Balances]
 *     parameters:
 *       - in: path
 *         name: address
 *         required: true
 *         schema:
 *           type: string
 *         description: Ethereum address
 *     responses:
 *       200:
 *         description: All balances for the address
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AllBalances'
 *       400:
 *         description: Bad request - invalid address
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/balance/:address/all', addTraceContext, async (req: Request, res: Response, next) => {
  const logger = req.logger!;
  
  try {
    logger.info('All balances request received', { 
      address: req.params.address 
    });
    
    // Validate address parameter
    const { address } = validateAddressParam({ address: req.params.address });
    
    // Additional validation
    if (!isValidAddress(address)) {
      return res.status(400).json({
        error: 'Invalid Address',
        message: 'Address must be a valid Ethereum address',
        statusCode: 400
      });
    }
    
    // Get all balances from database
    const balances = await dbService.getAllBalances(address);
    
    logger.info('All balances retrieved', { address, count: balances.length });
    
    // Return response
    const response = {
      address,
      balances,
      total: balances.length,
      timestamp: new Date().toISOString()
    };
    
    res.json(response);
    return;
  } catch (error) {
    if (error instanceof Error) {
      logger.error('All balances request failed', { error: error.message });
      
      if (error.message.includes('validation')) {
        return res.status(400).json({
          error: 'Validation Error',
          message: error.message,
          statusCode: 400
        });
      }
    }
    return next(error);
  }
});

export default router; 