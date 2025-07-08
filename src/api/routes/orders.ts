import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../../utils/logger';
import { validateOrderRequest } from '../../utils/validation';
import { OrderRequest, OrderResponse, Order, OrderBook, TradeResponse } from '../../types';
import { DatabaseService } from '../../db/schema';
import { TradingEngine } from '../../services/trading-engine';

const router = Router();

/**
 * @swagger
 * /api/orders:
 *   post:
 *     summary: Create a new order
 *     tags: [Orders]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - address
 *               - asset
 *               - side
 *               - amount
 *               - price
 *               - type
 *             properties:
 *               address:
 *                 type: string
 *                 description: Ethereum address of the order creator
 *                 example: "0x742d35cc6634c0532925a3b8d4c9db96c4b4d8b6"
 *               asset:
 *                 type: string
 *                 description: Asset symbol to trade
 *                 example: "ETH"
 *               side:
 *                 type: string
 *                 enum: [buy, sell]
 *                 description: Order side
 *                 example: "buy"
 *               amount:
 *                 type: number
 *                 description: Order amount
 *                 example: 1.5
 *               price:
 *                 type: number
 *                 description: Order price
 *                 example: 2000
 *               type:
 *                 type: string
 *                 enum: [limit, market]
 *                 description: Order type
 *                 example: "limit"
 *     responses:
 *       201:
 *         description: Order processed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/TradeResponse'
 *       400:
 *         description: Invalid request data
 *       500:
 *         description: Internal server error
 */
router.post('/', async (req: Request, res: Response): Promise<void> => {
  const traceId = req.headers['x-trace-id'] as string;
  
  try {
    logger.info('Creating new order', { traceId, body: req.body });
    
    const orderData = validateOrderRequest(req.body);
    
    // Check if user has sufficient balance
    const db = req.app.locals.db as DatabaseService;
    const userBalance = await db.getBalance(orderData.address, orderData.asset);
    
    if (orderData.side === 'sell' && userBalance < orderData.amount) {
      res.status(400).json({
        success: false,
        error: 'Insufficient balance',
        message: `Insufficient ${orderData.asset} balance. Available: ${userBalance}, Required: ${orderData.amount}`
      });
      return;
    }

    // Check if user has sufficient quote currency for buy orders
    if (orderData.side === 'buy') {
      const quoteAsset = 'USDC'; // For now, assume USDC is the quote currency
      const quoteBalance = await db.getBalance(orderData.address, quoteAsset);
      const requiredQuote = orderData.amount * orderData.price;
      
      if (quoteBalance < requiredQuote) {
        res.status(400).json({
          success: false,
          error: 'Insufficient balance',
          message: `Insufficient ${quoteAsset} balance. Available: ${quoteBalance}, Required: ${requiredQuote}`
        });
        return;
      }
    }
    
    // Process order through trading engine
    const tradingEngine = new TradingEngine(db);
    const result = await tradingEngine.processOrder(orderData);
    
    const response: TradeResponse = {
      tradeId: `trade-${Date.now()}`,
      orderId: result.orderId,
      trades: result.trades,
      remainingAmount: result.remainingAmount
    };
    
    logger.info('Order processed successfully', { 
      traceId, 
      orderId: result.orderId,
      tradesCount: result.trades.length,
      remainingAmount: result.remainingAmount
    });
    
    res.status(201).json({
      success: true,
      data: response
    });
    
  } catch (error) {
    logger.error('Failed to process order', { traceId, error });
    
    if (error instanceof Error) {
      res.status(400).json({
        success: false,
        error: 'Validation Error',
        message: error.message
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Internal Server Error',
        message: 'Failed to process order'
      });
    }
  }
});

/**
 * @swagger
 * /api/orders:
 *   get:
 *     summary: Get orders with optional filters
 *     tags: [Orders]
 *     parameters:
 *       - in: query
 *         name: address
 *         schema:
 *           type: string
 *         description: Filter by Ethereum address
 *         example: "0x742d35cc6634c0532925a3b8d4c9db96c4b4d8b6"
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *         description: Filter by order status
 *         example: "pending"
 *     responses:
 *       200:
 *         description: Orders retrieved successfully
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
 *                     $ref: '#/components/schemas/Order'
 *       500:
 *         description: Internal server error
 */
router.get('/', async (req: Request, res: Response): Promise<void> => {
  const traceId = req.headers['x-trace-id'] as string;
  
  try {
    logger.info('Getting orders', { traceId, query: req.query });
    
    const db = req.app.locals.db as DatabaseService;
    const { address, status } = req.query;
    
    const orders = await db.getOrders(
      address as string | undefined,
      status as string | undefined
    );
    
    logger.info('Orders retrieved successfully', { traceId, count: orders.length });
    
    res.json({
      success: true,
      data: orders
    });
    
  } catch (error) {
    logger.error('Failed to get orders', { traceId, error });
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to retrieve orders'
    });
  }
});

/**
 * @swagger
 * /api/orders/{id}:
 *   get:
 *     summary: Get order by ID
 *     tags: [Orders]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Order ID
 *         example: "123e4567-e89b-12d3-a456-426614174000"
 *     responses:
 *       200:
 *         description: Order retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Order'
 *       404:
 *         description: Order not found
 *       500:
 *         description: Internal server error
 */
router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  const traceId = req.headers['x-trace-id'] as string;
  
  try {
    const { id } = req.params;
    if (!id) {
      res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'Order ID parameter is required'
      });
      return;
    }
    
    logger.info('Getting order by ID', { traceId, orderId: id });
    
    const db = req.app.locals.db as DatabaseService;
    const order = await db.getOrderById(id);
    
    if (!order) {
      res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'Order not found'
      });
      return;
    }
    
    logger.info('Order retrieved successfully', { traceId, orderId: id });
    
    res.json({
      success: true,
      data: order
    });
    
  } catch (error) {
    logger.error('Failed to get order', { traceId, error });
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to retrieve order'
    });
  }
});

/**
 * @swagger
 * /api/orders/book/{asset}:
 *   get:
 *     summary: Get order book for an asset
 *     tags: [Orders]
 *     parameters:
 *       - in: path
 *         name: asset
 *         required: true
 *         schema:
 *           type: string
 *         description: Asset symbol
 *         example: "ETH"
 *     responses:
 *       200:
 *         description: Order book retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/OrderBook'
 *       500:
 *         description: Internal server error
 */
router.get('/book/:asset', async (req: Request, res: Response): Promise<void> => {
  const traceId = req.headers['x-trace-id'] as string;
  
  try {
    const { asset } = req.params;
    if (!asset) {
      res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'Asset parameter is required'
      });
      return;
    }
    
    logger.info('Getting order book', { traceId, asset });
    
    const db = req.app.locals.db as DatabaseService;
    const orderBook = await db.getOrderBook(asset);
    
    const response: OrderBook = {
      asset,
      bids: orderBook.bids,
      asks: orderBook.asks,
      timestamp: new Date().toISOString()
    };
    
    logger.info('Order book retrieved successfully', { 
      traceId, 
      asset, 
      bidCount: orderBook.bids.length,
      askCount: orderBook.asks.length
    });
    
    res.json({
      success: true,
      data: response
    });
    
  } catch (error) {
    logger.error('Failed to get order book', { traceId, error });
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to retrieve order book'
    });
  }
});

/**
 * @swagger
 * /api/orders/{id}/cancel:
 *   post:
 *     summary: Cancel an order
 *     tags: [Orders]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Order ID to cancel
 *         example: "order-1234567890"
 *     responses:
 *       200:
 *         description: Order cancelled successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Order cancelled successfully"
 *       404:
 *         description: Order not found
 *       400:
 *         description: Order cannot be cancelled
 *       500:
 *         description: Internal server error
 */
router.post('/:id/cancel', async (req, res) => {
  const traceId = req.headers['x-trace-id'] as string;
  try {
    const { id } = req.params;
    if (!id) {
      res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'Order ID parameter is required'
      });
      return;
    }
    const db = req.app.locals.db;
    const cancelled = await db.cancelOrder(id);
    if (!cancelled) {
      const order = await db.getOrderById(id);
      if (!order) {
        res.status(404).json({
          success: false,
          error: 'Not Found',
          message: 'Order not found'
        });
        return;
      }
      res.status(400).json({
        success: false,
        error: 'Cannot Cancel',
        message: `Order cannot be cancelled. Current status: ${order.status}`
      });
      return;
    }
    res.json({
      success: true,
      message: 'Order cancelled successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to cancel order'
    });
  }
});

export default router; 