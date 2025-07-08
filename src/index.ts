import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { router, errorHandler } from './api/routes';
import { dbService } from './db/schema';
import { redisService } from './pubsub/redis';
import { blockchainService } from './services/blockchain';
import { logger } from './utils/logger';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  logger.info('Incoming request', {
    method: req.method,
    path: req.path,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });
  next();
});

// Routes
app.use('/api', router);

// Error handling
app.use(errorHandler);

// Graceful shutdown
const gracefulShutdown = async (signal: string) => {
  logger.info(`Received ${signal}. Starting graceful shutdown...`);
  
  try {
    // Stop accepting new requests
    server.close(() => {
      logger.info('HTTP server closed');
    });
    
    // Stop blockchain service
    await blockchainService.stop();
    
    // Close Redis connections
    await redisService.close();
    
    // Close database connection
    await dbService.close();
    
    logger.info('Graceful shutdown completed');
    process.exit(0);
  } catch (error) {
    logger.error('Error during graceful shutdown', { error });
    process.exit(1);
  }
};

let server: import('http').Server;

// Initialize and start the application
const startApplication = async () => {
  try {
    logger.info('Starting uAsset Settlement Backend...');
    
    // Initialize database
    await dbService.initialize();
    logger.info('Database initialized');
    
    // Initialize Redis
    await redisService.initialize();
    logger.info('Redis initialized');
    
    // Start blockchain service
    await blockchainService.start();
    logger.info('Blockchain service started');
    
    // Start HTTP server
    server = app.listen(PORT, () => {
      logger.info(`Server is running on port ${PORT}`);
      logger.info(`Health check available at http://localhost:${PORT}/api/health`);
    });
    
    // Handle graceful shutdown
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    
    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught Exception', { error });
      gracefulShutdown('uncaughtException');
    });
    
    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled Rejection', { reason, promise });
      gracefulShutdown('unhandledRejection');
    });
    
  } catch (error) {
    logger.error('Failed to start application', { error });
    process.exit(1);
  }
};

// Start the application
startApplication(); 