import { Request, Response, NextFunction } from 'express';
import { ApiError, LogContext } from '../types';
import { createLoggerWithContext, generateTraceId } from '../utils/logger';

// Middleware to add trace ID and logger to request
export const addTraceContext = (req: Request, res: Response, next: NextFunction) => {
  const traceId = generateTraceId();
  const context: LogContext = {
    traceId,
    method: req.method,
    path: req.path
  };
  
  req.traceId = traceId;
  req.logger = createLoggerWithContext(context);
  
  next();
};

// Error handling middleware
export const errorHandler = (err: Error, req: Request, res: Response, next: NextFunction) => {
  const logger = req.logger || createLoggerWithContext({ traceId: generateTraceId() });
  
  logger.error('API Error', { error: err.message, stack: err.stack });
  
  const apiError: ApiError = {
    error: 'Internal Server Error',
    message: err.message,
    statusCode: 500
  };
  
  res.status(500).json(apiError);
}; 