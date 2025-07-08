import { z } from 'zod';
import { SettlementRequest, OrderRequest } from '../types';

// Validation schema for settlement requests
export const settlementRequestSchema = z.object({
  from: z.string().min(1, 'From address is required'),
  to: z.string().min(1, 'To address is required'),
  amount: z.number().positive('Amount must be positive'),
  asset: z.string().min(1, 'Asset is required')
});

// Validation schema for address parameters
export const addressParamSchema = z.object({
  address: z.string().min(1, 'Address is required')
});

// Validation schema for asset query parameters
export const assetQuerySchema = z.object({
  asset: z.string().min(1, 'Asset is required')
});

// Validation schema for settlement ID parameter
export const settlementIdParamSchema = z.object({
  id: z.string().min(1, 'Settlement ID is required')
});

// Validate settlement request
export const validateSettlementRequest = (data: unknown): SettlementRequest => {
  return settlementRequestSchema.parse(data);
};

// Validate address parameter
export const validateAddressParam = (data: unknown): { address: string } => {
  return addressParamSchema.parse(data);
};

// Validate asset query parameter
export const validateAssetQuery = (data: unknown): { asset: string } => {
  return assetQuerySchema.parse(data);
};

// Validate settlement ID parameter
export const validateSettlementIdParam = (data: unknown): { id: string } => {
  return settlementIdParamSchema.parse(data);
};

// Custom validation for Ethereum-like addresses (basic check)
export const isValidAddress = (address: string): boolean => {
  // Basic check for Ethereum-like addresses (0x followed by 40 hex characters)
  return /^0x[a-fA-F0-9]{40}$/.test(address);
};

// Custom validation for asset symbols
export const isValidAsset = (asset: string): boolean => {
  // Basic check for asset symbols (3-10 alphanumeric characters)
  return /^[A-Z0-9]{3,10}$/.test(asset);
};

// Order validation schemas
export const orderRequestSchema = z.object({
  address: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid Ethereum address'),
  asset: z.string().regex(/^[A-Z]{3,10}$/, 'Invalid asset format'),
  side: z.enum(['buy', 'sell'], { errorMap: () => ({ message: 'Side must be either "buy" or "sell"' }) }),
  amount: z.number().positive('Amount must be positive'),
  price: z.number().positive('Price must be positive'),
  type: z.enum(['limit', 'market'], { errorMap: () => ({ message: 'Type must be either "limit" or "market"' }) })
});

export const validateOrderRequest = (data: unknown): OrderRequest => {
  return orderRequestSchema.parse(data);
}; 