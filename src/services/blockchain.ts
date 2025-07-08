import { SettlementEvent } from '../types';
import { dbService } from '../db/schema';
import { redisService } from '../pubsub/redis';
import { createLoggerWithContext, generateTraceId } from '../utils/logger';

export class BlockchainService {
  private isRunning = false;
  private logger = createLoggerWithContext({ traceId: generateTraceId() });

  async start(): Promise<void> {
    if (this.isRunning) {
      this.logger.warn('Blockchain service is already running');
      return;
    }

    try {
      this.logger.info('Starting blockchain service');
      
      // Subscribe to settlement requests
      await redisService.subscribeToSettlementRequests(
        this.processSettlementRequest.bind(this)
      );
      
      this.isRunning = true;
      this.logger.info('Blockchain service started successfully');
    } catch (error) {
      this.logger.error('Failed to start blockchain service', { error });
      throw error;
    }
  }

  async stop(): Promise<void> {
    this.isRunning = false;
    this.logger.info('Blockchain service stopped');
  }

  private async processSettlementRequest(event: SettlementEvent): Promise<void> {
    const traceId = generateTraceId();
    const logger = createLoggerWithContext({ traceId });
    
    logger.info('Processing settlement request', { 
      settlementId: event.id,
      from: event.from,
      to: event.to,
      amount: event.amount,
      asset: event.asset
    });

    try {
      // Simulate blockchain confirmation delay (1-3 seconds)
      const delay = Math.floor(Math.random() * 2000) + 1000; // 1-3 seconds
      logger.info('Simulating blockchain confirmation delay', { delayMs: delay });
      
      await new Promise(resolve => setTimeout(resolve, delay));

      // Check sender balance
      const senderBalance = await dbService.getBalance(event.from, event.asset);
      logger.info('Sender balance retrieved', { 
        address: event.from, 
        asset: event.asset, 
        balance: senderBalance 
      });

      if (senderBalance < event.amount) {
        // Insufficient balance
        logger.warn('Insufficient balance for settlement', {
          settlementId: event.id,
          required: event.amount,
          available: senderBalance
        });

        await dbService.updateSettlementStatus(event.id, 'failed');
        await redisService.publishSettlementFailed(
          event.id, 
          `Insufficient balance. Required: ${event.amount}, Available: ${senderBalance}`
        );

        logger.info('Settlement marked as failed', { settlementId: event.id });
        return;
      }

      // Process the settlement
      const newSenderBalance = senderBalance - event.amount;
      const receiverBalance = await dbService.getBalance(event.to, event.asset);
      const newReceiverBalance = receiverBalance + event.amount;

      // Update balances atomically (in a real system, this would be a transaction)
      await dbService.updateBalance(event.from, event.asset, newSenderBalance);
      await dbService.updateBalance(event.to, event.asset, newReceiverBalance);

      // Update settlement status
      await dbService.updateSettlementStatus(event.id, 'confirmed');

      // Publish confirmation event
      await redisService.publishSettlementConfirmed(event.id);

      logger.info('Settlement processed successfully', {
        settlementId: event.id,
        senderNewBalance: newSenderBalance,
        receiverNewBalance: newReceiverBalance,
        confirmationTime: delay
      });

    } catch (error) {
      logger.error('Failed to process settlement request', { 
        settlementId: event.id, 
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      // Mark settlement as failed
      try {
        await dbService.updateSettlementStatus(event.id, 'failed');
        await redisService.publishSettlementFailed(
          event.id, 
          'Processing error occurred'
        );
      } catch (updateError) {
        logger.error('Failed to update settlement status after error', { 
          settlementId: event.id, 
          error: updateError instanceof Error ? updateError.message : 'Unknown error'
        });
      }
    }
  }

  isServiceRunning(): boolean {
    return this.isRunning;
  }
}

export const blockchainService = new BlockchainService(); 