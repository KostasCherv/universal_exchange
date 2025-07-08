import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { SettlementRequest, SettlementResponse } from '../../types';
import { 
  validateSettlementRequest, 
  validateSettlementIdParam,
  isValidAddress,
  isValidAsset 
} from '../../utils/validation';
import { dbService } from '../../db/schema';
import { redisService } from '../../pubsub/redis';
import { addTraceContext } from '../../middleware';

const router = Router();

/**
 * @swagger
 * /settle:
 *   post:
 *     summary: Create a new settlement
 *     description: Initiate a new uAsset settlement between two addresses
 *     tags: [Settlements]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SettlementRequest'
 *     responses:
 *       202:
 *         description: Settlement created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SettlementResponse'
 *       400:
 *         description: Bad request - validation error
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
router.post('/settle', addTraceContext, async (req: Request, res: Response, next) => {
  const logger = req.logger!;
  
  try {
    logger.info('Settlement request received', { body: req.body });
    
    // Validate request body
    const settlementRequest: SettlementRequest = validateSettlementRequest(req.body);
    
    // Additional validation
    if (!isValidAddress(settlementRequest.from)) {
      return res.status(400).json({
        error: 'Invalid Address',
        message: 'From address must be a valid Ethereum address',
        statusCode: 400
      });
    }
    
    if (!isValidAddress(settlementRequest.to)) {
      return res.status(400).json({
        error: 'Invalid Address',
        message: 'To address must be a valid Ethereum address',
        statusCode: 400
      });
    }
    
    if (!isValidAsset(settlementRequest.asset)) {
      return res.status(400).json({
        error: 'Invalid Asset',
        message: 'Asset must be a valid asset symbol (3-10 uppercase alphanumeric characters)',
        statusCode: 400
      });
    }
    
    if (settlementRequest.from === settlementRequest.to) {
      return res.status(400).json({
        error: 'Invalid Transaction',
        message: 'From and to addresses cannot be the same',
        statusCode: 400
      });
    }
    
    // Generate settlement ID
    const settlementId = uuidv4();
    
    // Create settlement in database
    await dbService.createSettlement({
      id: settlementId,
      from: settlementRequest.from,
      to: settlementRequest.to,
      amount: settlementRequest.amount,
      asset: settlementRequest.asset
    });
    
    logger.info('Settlement created in database', { settlementId });
    
    // Publish to Redis
    await redisService.publishSettlementRequest({
      id: settlementId,
      from: settlementRequest.from,
      to: settlementRequest.to,
      amount: settlementRequest.amount,
      asset: settlementRequest.asset
    });
    
    logger.info('Settlement request published to Redis', { settlementId });
    
    // Return response
    const response: SettlementResponse = {
      settlementId,
      status: 'pending'
    };
    
    res.status(202).json(response);
    return;
  } catch (error) {
    if (error instanceof Error) {
      logger.error('Settlement request failed', { error: error.message });
      
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
 * /settlements:
 *   get:
 *     summary: Get all settlements
 *     description: Retrieve all settlements from the system
 *     tags: [Settlements]
 *     responses:
 *       200:
 *         description: List of all settlements
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Settlement'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/settlements', addTraceContext, async (req: Request, res: Response, next) => {
  const logger = req.logger!;
  
  try {
    logger.info('Settlements list request received');
    
    // Get settlements from database
    const settlements = await dbService.getSettlements();
    
    logger.info('Settlements retrieved', { count: settlements.length });
    
    res.json(settlements);
    return;
  } catch (error) {
    if (error instanceof Error) {
      logger.error('Settlements request failed', { error: error.message });
    }
    return next(error);
  }
});

/**
 * @swagger
 * /settlements/address/{address}:
 *   get:
 *     summary: Get settlements by address
 *     description: Retrieve all settlements for a specific Ethereum address
 *     tags: [Settlements]
 *     parameters:
 *       - in: path
 *         name: address
 *         required: true
 *         schema:
 *           type: string
 *         description: Ethereum address to get settlements for
 *     responses:
 *       200:
 *         description: Settlements for the address
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 address:
 *                   type: string
 *                 settlements:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Settlement'
 *                 total:
 *                   type: number
 *                 timestamp:
 *                   type: string
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
router.get('/settlements/address/:address', addTraceContext, async (req: Request, res: Response, next) => {
  const logger = req.logger!;
  
  try {
    logger.info('Settlements by address request received', { 
      address: req.params.address 
    });
    
    // Validate address parameter
    const { address } = req.params;
    
    if (!address) {
      return res.status(400).json({
        error: 'Missing Address',
        message: 'Address parameter is required',
        statusCode: 400
      });
    }
    
    // Additional validation
    if (!isValidAddress(address)) {
      return res.status(400).json({
        error: 'Invalid Address',
        message: 'Address must be a valid Ethereum address',
        statusCode: 400
      });
    }
    
    // Get settlements from database
    const settlements = await dbService.getSettlementsByAddress(address);
    
    logger.info('Settlements by address retrieved', { address, count: settlements.length });
    
    // Return response
    const response = {
      address,
      settlements,
      total: settlements.length,
      timestamp: new Date().toISOString()
    };
    
    res.json(response);
    return;
  } catch (error) {
    if (error instanceof Error) {
      logger.error('Settlements by address request failed', { error: error.message });
      
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
 * /settlements/{id}:
 *   get:
 *     summary: Get settlement by ID
 *     description: Retrieve a specific settlement by its ID
 *     tags: [Settlements]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Settlement ID
 *     responses:
 *       200:
 *         description: Settlement details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Settlement'
 *       404:
 *         description: Settlement not found
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
router.get('/settlements/:id', addTraceContext, async (req: Request, res: Response, next) => {
  const logger = req.logger!;
  
  try {
    logger.info('Settlement by ID request received', { 
      settlementId: req.params.id 
    });
    
    // Validate settlement ID parameter
    const { id } = validateSettlementIdParam({ id: req.params.id });
    
    if (!id) {
      return res.status(400).json({
        error: 'Missing Settlement ID',
        message: 'Settlement ID parameter is required',
        statusCode: 400
      });
    }
    
    // Get settlement from database
    const settlement = await dbService.getSettlementById(id);
    
    if (!settlement) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Settlement not found',
        statusCode: 404
      });
    }
    
    logger.info('Settlement retrieved', { settlementId: id });
    
    res.json(settlement);
    return;
  } catch (error) {
    if (error instanceof Error) {
      logger.error('Settlement by ID request failed', { error: error.message });
      
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