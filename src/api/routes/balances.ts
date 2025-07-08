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

// GET /balance/:address - Get balance for an address
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

// GET /balance/:address/all - Get all balances for an address
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