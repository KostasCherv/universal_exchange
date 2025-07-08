import { TradingEngine } from '../trading-engine';
import { DatabaseService } from '../../db/schema';
import { OrderRequest } from '../../types';

// Mock the database service
jest.mock('../../db/schema');
const MockDatabaseService = DatabaseService as jest.MockedClass<typeof DatabaseService>;

// Mock logger
jest.mock('../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
  }
}));

describe('TradingEngine', () => {
  let tradingEngine: TradingEngine;
  let mockDb: jest.Mocked<DatabaseService>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Create mock database instance
    mockDb = {
      getBalance: jest.fn(),
      createOrder: jest.fn(),
      getOrderById: jest.fn(),
      getOrders: jest.fn(),
      updateOrderStatus: jest.fn(),
      updateOrderRemainingAmount: jest.fn(),
      createTrade: jest.fn(),
      updateBalance: jest.fn(),
      // Add other methods as needed for the mock
    } as any;

    tradingEngine = new TradingEngine(mockDb);
  });

  describe('processOrder', () => {
    const validOrderRequest: OrderRequest = {
      address: '0x742d35cc6634c0532925a3b8d4c9db96c4b4d8b6',
      asset: 'ETH',
      side: 'buy',
      amount: 1.0,
      price: 2000,
      type: 'limit'
    };

    const mockOrder = {
      id: 'order-1',
      address: '0x742d35cc6634c0532925a3b8d4c9db96c4b4d8b6',
      asset: 'ETH',
      side: 'buy' as const,
      amount: 1.0,
      remainingAmount: 1.0,
      price: 2000,
      type: 'limit' as const,
      status: 'pending',
      createdAt: '2024-01-01T12:00:00Z',
      updatedAt: '2024-01-01T12:00:00Z'
    };

    it('should process a buy order that matches with existing sell order', async () => {
      // Mock existing sell order
      const existingSellOrder = {
        id: 'sell-order-1',
        address: '0x8ba1f109551bd432803012645aac136c772c3e3c',
        asset: 'ETH',
        side: 'sell' as const,
        amount: 2.0,
        remainingAmount: 2.0,
        price: 1999, // Lower price, should match
        type: 'limit' as const,
        status: 'pending',
        createdAt: '2024-01-01T11:00:00Z',
        updatedAt: '2024-01-01T11:00:00Z'
      };

      mockDb.createOrder.mockResolvedValue();
      mockDb.getOrderById.mockResolvedValue(mockOrder);
      mockDb.getOrders.mockResolvedValue([existingSellOrder]);
      mockDb.updateOrderStatus.mockResolvedValue();
      mockDb.updateOrderRemainingAmount.mockResolvedValue();
      mockDb.createTrade.mockResolvedValue();
      mockDb.getBalance.mockResolvedValue(1000); // USDC balance
      mockDb.updateBalance.mockResolvedValue();

      const result = await tradingEngine.processOrder(validOrderRequest);

      expect(result.orderId).toBeDefined();
      expect(result.trades).toHaveLength(1);
      expect(result.remainingAmount).toBe(0); // Fully filled

      const trade = result.trades[0]!;
      expect(trade.asset).toBe('ETH');
      expect(trade.amount).toBe(1.0);
      expect(trade.price).toBe(1999); // Should use seller's price (first in time)
      expect(trade.buyerAddress).toBe(validOrderRequest.address);
      expect(trade.sellerAddress).toBe(existingSellOrder.address);

      // Verify database calls
      expect(mockDb.createOrder).toHaveBeenCalled();
      expect(mockDb.createTrade).toHaveBeenCalled();
      expect(mockDb.updateOrderStatus).toHaveBeenCalledWith(result.orderId, 'filled');
      expect(mockDb.updateOrderRemainingAmount).toHaveBeenCalledWith(result.orderId, 0);
    });

    it('should process a sell order that matches with existing buy order', async () => {
      const sellOrderRequest: OrderRequest = {
        ...validOrderRequest,
        side: 'sell',
        price: 2001
      };

      const sellOrder = {
        ...mockOrder,
        side: 'sell' as const,
        price: 2001
      };

      // Mock existing buy order
      const existingBuyOrder = {
        id: 'buy-order-1',
        address: '0x8ba1f109551bd432803012645aac136c772c3e3c',
        asset: 'ETH',
        side: 'buy' as const,
        amount: 2.0,
        remainingAmount: 2.0,
        price: 2002, // Higher price, should match
        type: 'limit' as const,
        status: 'pending',
        createdAt: '2024-01-01T11:00:00Z',
        updatedAt: '2024-01-01T11:00:00Z'
      };

      mockDb.createOrder.mockResolvedValue();
      mockDb.getOrderById.mockResolvedValue(sellOrder);
      mockDb.getOrders.mockResolvedValue([existingBuyOrder]);
      mockDb.updateOrderStatus.mockResolvedValue();
      mockDb.updateOrderRemainingAmount.mockResolvedValue();
      mockDb.createTrade.mockResolvedValue();
      mockDb.getBalance.mockResolvedValue(1000); // ETH balance
      mockDb.updateBalance.mockResolvedValue();

      const result = await tradingEngine.processOrder(sellOrderRequest);

      expect(result.trades).toHaveLength(1);
      expect(result.remainingAmount).toBe(0); // Fully filled

      const trade = result.trades[0]!;
      expect(trade.price).toBe(2002); // Should use buyer's price (first in time)
      expect(trade.buyerAddress).toBe(existingBuyOrder.address);
      expect(trade.sellerAddress).toBe(sellOrderRequest.address);
    });

    it('should partially fill an order when matching order has insufficient amount', async () => {
      // Mock existing sell order with less amount
      const existingSellOrder = {
        id: 'sell-order-1',
        address: '0x8ba1f109551bd432803012645aac136c772c3e3c',
        asset: 'ETH',
        side: 'sell' as const,
        amount: 0.5,
        remainingAmount: 0.5,
        price: 1999,
        type: 'limit' as const,
        status: 'pending',
        createdAt: '2024-01-01T11:00:00Z',
        updatedAt: '2024-01-01T11:00:00Z'
      };

      mockDb.createOrder.mockResolvedValue();
      mockDb.getOrderById.mockResolvedValue(mockOrder);
      mockDb.getOrders.mockResolvedValue([existingSellOrder]);
      mockDb.updateOrderStatus.mockResolvedValue();
      mockDb.updateOrderRemainingAmount.mockResolvedValue();
      mockDb.createTrade.mockResolvedValue();
      mockDb.getBalance.mockResolvedValue(1000);
      mockDb.updateBalance.mockResolvedValue();

      const result = await tradingEngine.processOrder(validOrderRequest);

      expect(result.trades).toHaveLength(1);
      expect(result.remainingAmount).toBe(0.5); // Partially filled

      const trade = result.trades[0]!;
      expect(trade.amount).toBe(0.5);

      // Verify order status is partially filled
      expect(mockDb.updateOrderStatus).toHaveBeenCalledWith(result.orderId, 'partially_filled');
      expect(mockDb.updateOrderRemainingAmount).toHaveBeenCalledWith(result.orderId, 0.5);
    });

    it('should not match orders with same side', async () => {
      // Mock existing buy order (same side)
      const existingBuyOrder = {
        id: 'buy-order-1',
        address: '0x8ba1f109551bd432803012645aac136c772c3e3c',
        asset: 'ETH',
        side: 'buy' as const,
        amount: 2.0,
        remainingAmount: 2.0,
        price: 2001,
        type: 'limit' as const,
        status: 'pending',
        createdAt: '2024-01-01T11:00:00Z',
        updatedAt: '2024-01-01T11:00:00Z'
      };

      mockDb.createOrder.mockResolvedValue();
      mockDb.getOrderById.mockResolvedValue(mockOrder);
      mockDb.getOrders.mockResolvedValue([existingBuyOrder]);
      mockDb.updateOrderStatus.mockResolvedValue();
      mockDb.updateOrderRemainingAmount.mockResolvedValue();

      const result = await tradingEngine.processOrder(validOrderRequest);

      expect(result.trades).toHaveLength(0);
      expect(result.remainingAmount).toBe(1.0); // No trades executed

      // Verify order status remains pending
      expect(mockDb.updateOrderStatus).toHaveBeenCalledWith(result.orderId, 'pending');
    });

    it('should not match orders when buy price is lower than sell price', async () => {
      // Mock existing sell order with higher price
      const existingSellOrder = {
        id: 'sell-order-1',
        address: '0x8ba1f109551bd432803012645aac136c772c3e3c',
        asset: 'ETH',
        side: 'sell' as const,
        amount: 2.0,
        remainingAmount: 2.0,
        price: 2001, // Higher than buy order price (2000)
        type: 'limit' as const,
        status: 'pending',
        createdAt: '2024-01-01T11:00:00Z',
        updatedAt: '2024-01-01T11:00:00Z'
      };

      mockDb.createOrder.mockResolvedValue();
      mockDb.getOrderById.mockResolvedValue(mockOrder);
      mockDb.getOrders.mockResolvedValue([existingSellOrder]);
      mockDb.updateOrderStatus.mockResolvedValue();
      mockDb.updateOrderRemainingAmount.mockResolvedValue();

      const result = await tradingEngine.processOrder(validOrderRequest);

      expect(result.trades).toHaveLength(0);
      expect(result.remainingAmount).toBe(1.0); // No trades executed
    });

    it('should handle market orders correctly', async () => {
      const marketOrderRequest: OrderRequest = {
        ...validOrderRequest,
        type: 'market',
        price: 0 // Market orders don't need a price
      };

      const marketOrder = {
        ...mockOrder,
        type: 'market' as const,
        price: 0
      };

      // Mock existing sell order
      const existingSellOrder = {
        id: 'sell-order-1',
        address: '0x8ba1f109551bd432803012645aac136c772c3e3c',
        asset: 'ETH',
        side: 'sell' as const,
        amount: 2.0,
        remainingAmount: 2.0,
        price: 1999,
        type: 'limit' as const,
        status: 'pending',
        createdAt: '2024-01-01T11:00:00Z',
        updatedAt: '2024-01-01T11:00:00Z'
      };

      mockDb.createOrder.mockResolvedValue();
      mockDb.getOrderById.mockResolvedValue(marketOrder);
      mockDb.getOrders.mockResolvedValue([existingSellOrder]);
      mockDb.updateOrderStatus.mockResolvedValue();
      mockDb.updateOrderRemainingAmount.mockResolvedValue();
      mockDb.createTrade.mockResolvedValue();
      mockDb.getBalance.mockResolvedValue(1000);
      mockDb.updateBalance.mockResolvedValue();

      const result = await tradingEngine.processOrder(marketOrderRequest);

      expect(result.trades).toHaveLength(1);
      expect(result.remainingAmount).toBe(0);

      const trade = result.trades[0]!;
      expect(trade.price).toBe(1999); // Should use limit order price
    });
  });
}); 