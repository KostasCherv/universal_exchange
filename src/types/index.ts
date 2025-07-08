export interface SettlementRequest {
  from: string;
  to: string;
  amount: number;
  asset: string;
}

export interface Settlement {
  id: string;
  from: string;
  to: string;
  amount: number;
  asset: string;
  status: 'pending' | 'confirmed' | 'failed';
  createdAt: Date;
  confirmedAt: Date | null;
}

export interface Balance {
  address: string;
  asset: string;
  balance: number;
}

export interface SettlementResponse {
  settlementId: string;
  status: 'pending';
}

export interface BalanceResponse {
  address: string;
  asset: string;
  balance: number;
}

export interface SettlementEvent {
  id: string;
  from: string;
  to: string;
  amount: number;
  asset: string;
}

export interface ApiError {
  error: string;
  message: string;
  statusCode: number;
}

export interface LogContext {
  traceId: string;
  method?: string;
  path?: string;
  userId?: string;
}

export interface OrderRequest {
  address: string;
  asset: string;
  side: 'buy' | 'sell';
  amount: number;
  price: number;
  type: 'limit' | 'market';
}

export interface OrderResponse {
  orderId: string;
  status: string;
  address: string;
  asset: string;
  side: 'buy' | 'sell';
  amount: number;
  price: number;
  type: 'limit' | 'market';
}

export interface Order {
  id: string;
  address: string;
  asset: string;
  side: 'buy' | 'sell';
  amount: number;
  remainingAmount: number;
  price: number;
  type: 'limit' | 'market';
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface OrderBookLevel {
  price: number;
  totalAmount: number;
  orderCount: number;
}

export interface OrderBook {
  asset: string;
  bids: OrderBookLevel[];
  asks: OrderBookLevel[];
  timestamp: string;
}

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

export interface TradeResponse {
  tradeId: string;
  orderId: string;
  trades: Trade[];
  remainingAmount: number;
} 