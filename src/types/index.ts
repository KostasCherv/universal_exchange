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