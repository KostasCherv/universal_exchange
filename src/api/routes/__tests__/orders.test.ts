import request from 'supertest';
import express from 'express';
import { DatabaseService } from '../../../db/schema';
import ordersRouter from '../orders';
import { TradingEngine } from '../../../services/trading-engine';

// Mock the database service
jest.mock('../../../db/schema');
const MockDatabaseService = DatabaseService as jest.MockedClass<typeof DatabaseService>;

// Mock logger
jest.mock('../../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
  }
}));

jest.mock('../../../services/trading-engine');
const MockTradingEngine = TradingEngine as jest.MockedClass<typeof TradingEngine>;

describe('Orders Routes', () => {
  let app: express.Application;
  let mockDb: jest.Mocked<DatabaseService>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Create mock database instance
    mockDb = {
      getBalance: jest.fn(),
      createOrder: jest.fn(),
      getOrders: jest.fn(),
      getOrderById: jest.fn(),
      getOrderBook: jest.fn(),
      cancelOrder: jest.fn(),
      // Add other methods as needed for the mock
    } as any;

    // Mock TradingEngine
    MockTradingEngine.mockImplementation(() => ({
      processOrder: jest.fn().mockResolvedValue({
        orderId: 'order-1',
        trades: [],
        remainingAmount: 1.5
      })
    }) as any);

    // Create Express app
    app = express();
    app.use(express.json());
    app.use((req, res, next) => {
      req.headers['x-trace-id'] = 'test-trace-id';
      req.app.locals.db = mockDb;
      next();
    });
    app.use('/api/orders', ordersRouter);
  });

  describe('POST /api/orders', () => {
    const validOrderData = {
      address: '0x742d35cc6634c0532925a3b8d4c9db96c4b4d8b6',
      asset: 'ETH',
      side: 'buy' as const,
      amount: 1.5,
      price: 2000,
      type: 'limit' as const
    };

    it('should create a buy order successfully', async () => {
      // For buy orders, first call is for asset (ETH), second is for USDC
      mockDb.getBalance
        .mockResolvedValueOnce(1000) // ETH balance (not used for buy)
        .mockResolvedValueOnce(10000); // USDC balance (should be enough)

      const response = await request(app)
        .post('/api/orders')
        .send(validOrderData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        orderId: 'order-1',
        trades: [],
        remainingAmount: 1.5
      });
      expect(response.body.data.tradeId).toBeDefined();
    });

    it('should create a sell order successfully when user has sufficient balance', async () => {
      const sellOrderData = { ...validOrderData, side: 'sell' as const };
      mockDb.getBalance.mockResolvedValue(2.0); // User has more than required
      mockDb.createOrder.mockResolvedValue();

      const response = await request(app)
        .post('/api/orders')
        .send(sellOrderData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(mockDb.getBalance).toHaveBeenCalledWith(sellOrderData.address, sellOrderData.asset);
    });

    it('should reject sell order when user has insufficient balance', async () => {
      const sellOrderData = { ...validOrderData, side: 'sell' as const, amount: 2.0 };
      mockDb.getBalance.mockResolvedValue(1.0); // User has less than required

      const response = await request(app)
        .post('/api/orders')
        .send(sellOrderData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Insufficient balance');
      expect(mockDb.createOrder).not.toHaveBeenCalled();
    });

    it('should validate required fields', async () => {
      const invalidOrderData = {
        address: '0x742d35cc6634c0532925a3b8d4c9db96c4b4d8b6',
        // Missing required fields
      };

      const response = await request(app)
        .post('/api/orders')
        .send(invalidOrderData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Validation Error');
    });

    it('should validate Ethereum address format', async () => {
      const invalidOrderData = {
        ...validOrderData,
        address: 'invalid-address'
      };

      const response = await request(app)
        .post('/api/orders')
        .send(invalidOrderData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Validation Error');
    });

    it('should validate order side enum', async () => {
      const invalidOrderData = {
        ...validOrderData,
        side: 'invalid'
      };

      const response = await request(app)
        .post('/api/orders')
        .send(invalidOrderData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Validation Error');
    });

    it('should validate order type enum', async () => {
      const invalidOrderData = {
        ...validOrderData,
        type: 'invalid'
      };

      const response = await request(app)
        .post('/api/orders')
        .send(invalidOrderData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Validation Error');
    });
  });

  describe('GET /api/orders', () => {
    const mockOrders = [
      {
        id: 'order-1',
        address: '0x742d35cc6634c0532925a3b8d4c9db96c4b4d8b6',
        asset: 'ETH',
        side: 'buy' as const,
        amount: 1.5,
        remainingAmount: 1.5,
        price: 2000,
        type: 'limit' as const,
        status: 'pending',
        createdAt: '2024-01-01T12:00:00Z',
        updatedAt: '2024-01-01T12:00:00Z'
      }
    ];

    it('should get all orders', async () => {
      mockDb.getOrders.mockResolvedValue(mockOrders);

      const response = await request(app)
        .get('/api/orders')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockOrders);
      expect(mockDb.getOrders).toHaveBeenCalledWith(undefined, undefined);
    });

    it('should filter orders by address', async () => {
      const address = '0x742d35cc6634c0532925a3b8d4c9db96c4b4d8b6';
      mockDb.getOrders.mockResolvedValue(mockOrders);

      const response = await request(app)
        .get(`/api/orders?address=${address}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(mockDb.getOrders).toHaveBeenCalledWith(address, undefined);
    });

    it('should filter orders by status', async () => {
      const status = 'pending';
      mockDb.getOrders.mockResolvedValue(mockOrders);

      const response = await request(app)
        .get(`/api/orders?status=${status}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(mockDb.getOrders).toHaveBeenCalledWith(undefined, status);
    });

    it('should filter orders by both address and status', async () => {
      const address = '0x742d35cc6634c0532925a3b8d4c9db96c4b4d8b6';
      const status = 'pending';
      mockDb.getOrders.mockResolvedValue(mockOrders);

      const response = await request(app)
        .get(`/api/orders?address=${address}&status=${status}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(mockDb.getOrders).toHaveBeenCalledWith(address, status);
    });
  });

  describe('GET /api/orders/:id', () => {
    const mockOrder = {
      id: 'order-1',
      address: '0x742d35cc6634c0532925a3b8d4c9db96c4b4d8b6',
      asset: 'ETH',
      side: 'buy' as const,
      amount: 1.5,
      remainingAmount: 1.5,
      price: 2000,
      type: 'limit' as const,
      status: 'pending',
      createdAt: '2024-01-01T12:00:00Z',
      updatedAt: '2024-01-01T12:00:00Z'
    };

    it('should get order by ID', async () => {
      mockDb.getOrderById.mockResolvedValue(mockOrder);

      const response = await request(app)
        .get('/api/orders/order-1')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockOrder);
      expect(mockDb.getOrderById).toHaveBeenCalledWith('order-1');
    });

    it('should return 404 when order not found', async () => {
      mockDb.getOrderById.mockResolvedValue(null);

      const response = await request(app)
        .get('/api/orders/non-existent')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Not Found');
    });
  });

  describe('GET /api/orders/book/:asset', () => {
    const mockOrderBook = {
      bids: [
        { price: 2000, totalAmount: 2.5, orderCount: 3 },
        { price: 1999, totalAmount: 1.0, orderCount: 1 }
      ],
      asks: [
        { price: 2001, totalAmount: 1.5, orderCount: 2 },
        { price: 2002, totalAmount: 3.0, orderCount: 4 }
      ]
    };

    it('should get order book for asset', async () => {
      mockDb.getOrderBook.mockResolvedValue(mockOrderBook);

      const response = await request(app)
        .get('/api/orders/book/ETH')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        asset: 'ETH',
        bids: mockOrderBook.bids,
        asks: mockOrderBook.asks
      });
      expect(response.body.data.timestamp).toBeDefined();
      expect(mockDb.getOrderBook).toHaveBeenCalledWith('ETH');
    });

    it('should return 400 when asset parameter is missing', async () => {
      const response = await request(app)
        .get('/api/orders/book/')
        .expect(404); // Express will return 404 for this route

      expect(response.status).toBe(404);
    });
  });

  describe('POST /api/orders/:id/cancel', () => {
    it('should cancel a pending order', async () => {
      mockDb.cancelOrder.mockResolvedValue(true);
      mockDb.getOrderById.mockResolvedValue({
        id: 'order-1',
        address: '0xabc',
        asset: 'ETH',
        side: 'buy',
        amount: 1,
        remainingAmount: 1,
        price: 100,
        type: 'limit',
        status: 'pending',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      });

      const response = await request(app)
        .post('/api/orders/order-1/cancel')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Order cancelled successfully');
      expect(mockDb.cancelOrder).toHaveBeenCalledWith('order-1');
    });

    it('should not cancel a filled order', async () => {
      mockDb.cancelOrder.mockResolvedValue(false);
      mockDb.getOrderById.mockResolvedValue({
        id: 'order-2',
        address: '0xabc',
        asset: 'ETH',
        side: 'buy',
        amount: 1,
        remainingAmount: 0,
        price: 100,
        type: 'limit',
        status: 'filled',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      });

      const response = await request(app)
        .post('/api/orders/order-2/cancel')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Cannot Cancel');
      expect(response.body.message).toMatch(/Current status: filled/);
    });

    it('should return 404 for non-existent order', async () => {
      mockDb.cancelOrder.mockResolvedValue(false);
      mockDb.getOrderById.mockResolvedValue(null);

      const response = await request(app)
        .post('/api/orders/non-existent/cancel')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Not Found');
    });
  });
}); 