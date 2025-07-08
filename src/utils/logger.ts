import winston from 'winston';
import { LogContext } from '../types';

const logFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  defaultMeta: { service: 'uasset-backend' },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

export const createLoggerWithContext = (context: LogContext) => {
  return {
    info: (message: string, meta?: any) => {
      logger.info(message, { ...meta, ...context });
    },
    error: (message: string, meta?: any) => {
      logger.error(message, { ...meta, ...context });
    },
    warn: (message: string, meta?: any) => {
      logger.warn(message, { ...meta, ...context });
    },
    debug: (message: string, meta?: any) => {
      logger.debug(message, { ...meta, ...context });
    }
  };
};

export const generateTraceId = (): string => {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}; 