import { logger } from '../utils/logger';
import { DatabaseService } from '../db/schema';
import { Order, OrderRequest } from '../types';

export interface Trade {
  id: string;
  buyOrderId: string;
  sellOrderId: string;
  asset: string;
  amount: number;
  price: number;
  buyerAddress: string;
  sellerAddress: string;
  timestamp: string;
}

export interface MatchResult {
  trades: Trade[];
  remainingOrder: Order | null;
}

export class TradingEngine {
  private db: DatabaseService;

  constructor(db: DatabaseService) {
    this.db = db;
  }

  /**
   * Process a new order and attempt to match it with existing orders
   */
  async processOrder(orderRequest: OrderRequest): Promise<{
    orderId: string;
    trades: Trade[];
    remainingAmount: number;
  }> {
    const traceId = `trade-${Date.now()}`;
    logger.info('Processing order', { traceId, orderRequest });

    // Create the order
    const orderId = await this.createOrder(orderRequest);
    const order = await this.db.getOrderById(orderId);
    if (!order) {
      throw new Error('Failed to create order');
    }

    // Attempt to match the order
    const matchResult = await this.matchOrder(order);
    
    // Update order status based on matching result
    if (matchResult.trades.length === 0 && matchResult.remainingOrder && matchResult.remainingOrder.remainingAmount === order.amount) {
      // No match at all, keep as pending
      await this.db.updateOrderStatus(orderId, 'pending');
      await this.db.updateOrderRemainingAmount(orderId, order.amount);
    } else if (matchResult.remainingOrder) {
      if (matchResult.remainingOrder.remainingAmount < order.amount) {
        // Partially filled
        await this.db.updateOrderStatus(orderId, 'partially_filled');
        await this.db.updateOrderRemainingAmount(orderId, matchResult.remainingOrder.remainingAmount);
      }
    } else {
      // Fully filled
      await this.db.updateOrderStatus(orderId, 'filled');
      await this.db.updateOrderRemainingAmount(orderId, 0);
    }

    // Execute trades
    for (const trade of matchResult.trades) {
      await this.executeTrade(trade);
    }

    logger.info('Order processed successfully', { 
      traceId, 
      orderId, 
      tradesCount: matchResult.trades.length,
      remainingAmount: matchResult.remainingOrder?.remainingAmount || 0
    });

    return {
      orderId,
      trades: matchResult.trades,
      remainingAmount: matchResult.remainingOrder?.remainingAmount || 0
    };
  }

  /**
   * Match an order with existing orders in the order book
   */
  private async matchOrder(order: Order): Promise<MatchResult> {
    const trades: Trade[] = [];
    let remainingOrder = { ...order };

    // Get opposite side orders (bids for sell orders, asks for buy orders)
    const oppositeSide = order.side === 'buy' ? 'sell' : 'buy';
    const oppositeOrders = await this.getOrdersForMatching(order.asset, oppositeSide);

    for (const oppositeOrder of oppositeOrders) {
      // Check if orders can match
      if (!this.canMatch(remainingOrder, oppositeOrder)) {
        continue;
      }

      // Calculate trade amount
      const tradeAmount = Math.min(remainingOrder.remainingAmount, oppositeOrder.remainingAmount);
      const tradePrice = this.determineTradePrice(remainingOrder, oppositeOrder);

      // Create trade
      const trade: Trade = {
        id: `trade-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        buyOrderId: order.side === 'buy' ? order.id : oppositeOrder.id,
        sellOrderId: order.side === 'sell' ? order.id : oppositeOrder.id,
        asset: order.asset,
        amount: tradeAmount,
        price: tradePrice,
        buyerAddress: order.side === 'buy' ? order.address : oppositeOrder.address,
        sellerAddress: order.side === 'sell' ? order.address : oppositeOrder.address,
        timestamp: new Date().toISOString()
      };

      trades.push(trade);

      // Update remaining amounts
      remainingOrder.remainingAmount -= tradeAmount;
      oppositeOrder.remainingAmount -= tradeAmount;

      // Update opposite order in database
      if (oppositeOrder.remainingAmount === 0) {
        await this.db.updateOrderStatus(oppositeOrder.id, 'filled');
        await this.db.updateOrderRemainingAmount(oppositeOrder.id, 0);
      } else {
        await this.db.updateOrderStatus(oppositeOrder.id, 'partially_filled');
        await this.db.updateOrderRemainingAmount(oppositeOrder.id, oppositeOrder.remainingAmount);
      }

      // Check if current order is fully filled
      if (remainingOrder.remainingAmount === 0) {
        break;
      }
    }

    return {
      trades,
      remainingOrder: remainingOrder.remainingAmount > 0 ? remainingOrder : null
    };
  }

  /**
   * Check if two orders can match
   */
  private canMatch(order1: Order, order2: Order): boolean {
    if (order1.side === order2.side) {
      return false; // Same side orders cannot match
    }

    const buyOrder = order1.side === 'buy' ? order1 : order2;
    const sellOrder = order1.side === 'sell' ? order1 : order2;

    // For limit orders, check if buy price >= sell price
    if (buyOrder.type === 'limit' && sellOrder.type === 'limit') {
      return buyOrder.price >= sellOrder.price;
    }

    // For market orders, they can always match with limit orders
    if (buyOrder.type === 'market' || sellOrder.type === 'market') {
      return true;
    }

    return false;
  }

  /**
   * Determine the trade price based on order types
   */
  private determineTradePrice(order1: Order, order2: Order): number {
    const buyOrder = order1.side === 'buy' ? order1 : order2;
    const sellOrder = order1.side === 'sell' ? order1 : order2;

    // If both are limit orders, use the price of the order that was placed first
    if (buyOrder.type === 'limit' && sellOrder.type === 'limit') {
      return new Date(buyOrder.createdAt) < new Date(sellOrder.createdAt) 
        ? buyOrder.price 
        : sellOrder.price;
    }

    // If one is market order, use the limit order price
    if (buyOrder.type === 'market' && sellOrder.type === 'limit') {
      return sellOrder.price;
    }

    if (buyOrder.type === 'limit' && sellOrder.type === 'market') {
      return buyOrder.price;
    }

    // If both are market orders, use a default price (this should be rare)
    return (buyOrder.price + sellOrder.price) / 2;
  }

  /**
   * Get orders for matching, sorted by best price
   */
  private async getOrdersForMatching(asset: string, side: 'buy' | 'sell'): Promise<Order[]> {
    const orders = await this.db.getOrders(undefined, 'pending');
    
    return orders
      .filter(order => order.asset === asset && order.side === side && order.status !== 'cancelled')
      .sort((a, b) => {
        if (side === 'buy') {
          // For buy orders, sort by highest price first (best bid)
          return b.price - a.price;
        } else {
          // For sell orders, sort by lowest price first (best ask)
          return a.price - b.price;
        }
      });
  }

  /**
   * Create a new order
   */
  private async createOrder(orderRequest: OrderRequest): Promise<string> {
    const orderId = `order-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    await this.db.createOrder({
      id: orderId,
      address: orderRequest.address,
      asset: orderRequest.asset,
      side: orderRequest.side,
      amount: orderRequest.amount,
      price: orderRequest.price,
      type: orderRequest.type
    });

    return orderId;
  }

  /**
   * Execute a trade by updating balances
   */
  private async executeTrade(trade: Trade): Promise<void> {
    logger.info('Executing trade', { tradeId: trade.id, trade });

    // Save trade to database
    await this.db.createTrade({
      id: trade.id,
      buyOrderId: trade.buyOrderId,
      sellOrderId: trade.sellOrderId,
      asset: trade.asset,
      amount: trade.amount,
      price: trade.price,
      buyerAddress: trade.buyerAddress,
      sellerAddress: trade.sellerAddress
    });

    // Update buyer balance
    const buyerBalance = await this.db.getBalance(trade.buyerAddress, trade.asset);
    await this.db.updateBalance(trade.buyerAddress, trade.asset, buyerBalance + trade.amount);

    // Update seller balance
    const sellerBalance = await this.db.getBalance(trade.sellerAddress, trade.asset);
    await this.db.updateBalance(trade.sellerAddress, trade.asset, sellerBalance - trade.amount);

    // Update buyer's quote currency balance (e.g., USDC)
    const quoteAsset = this.getQuoteAsset(trade.asset);
    const buyerQuoteBalance = await this.db.getBalance(trade.buyerAddress, quoteAsset);
    const quoteAmount = trade.amount * trade.price;
    await this.db.updateBalance(trade.buyerAddress, quoteAsset, buyerQuoteBalance - quoteAmount);

    // Update seller's quote currency balance
    const sellerQuoteBalance = await this.db.getBalance(trade.sellerAddress, quoteAsset);
    await this.db.updateBalance(trade.sellerAddress, quoteAsset, sellerQuoteBalance + quoteAmount);

    logger.info('Trade executed successfully', { tradeId: trade.id });
  }

  /**
   * Get the quote currency for a given asset
   */
  private getQuoteAsset(asset: string): string {
    // For now, assume USDC is the quote currency for all assets
    return 'USDC';
  }
} 