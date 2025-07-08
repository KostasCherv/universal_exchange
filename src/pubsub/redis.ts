import { createClient, RedisClientType } from 'redis';
import { logger } from '../utils/logger';
import { SettlementEvent } from '../types';

export class RedisService {
  private publisher: RedisClientType | null = null;
  private subscriber: RedisClientType | null = null;

  async initialize(): Promise<void> {
    try {
      const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
      
      this.publisher = createClient({ url: redisUrl });
      this.subscriber = createClient({ url: redisUrl });

      await this.publisher.connect();
      await this.subscriber.connect();

      logger.info('Redis connection established successfully');
    } catch (error) {
      logger.error('Failed to connect to Redis', { error });
      throw error;
    }
  }

  async publishSettlementRequest(event: SettlementEvent): Promise<void> {
    if (!this.publisher) throw new Error('Redis publisher not initialized');

    try {
      await this.publisher.publish('settlement_requests', JSON.stringify(event));
      logger.info('Settlement request published to Redis', { 
        settlementId: event.id,
        channel: 'settlement_requests'
      });
    } catch (error) {
      logger.error('Failed to publish settlement request', { error, event });
      throw error;
    }
  }

  async subscribeToSettlementRequests(
    callback: (event: SettlementEvent) => Promise<void>
  ): Promise<void> {
    if (!this.subscriber) throw new Error('Redis subscriber not initialized');

    try {
      await this.subscriber.subscribe('settlement_requests', async (message) => {
        try {
          const event: SettlementEvent = JSON.parse(message);
          logger.info('Received settlement request from Redis', { 
            settlementId: event.id,
            channel: 'settlement_requests'
          });
          await callback(event);
        } catch (error) {
          logger.error('Failed to process settlement request', { error, message });
        }
      });

      logger.info('Subscribed to settlement_requests channel');
    } catch (error) {
      logger.error('Failed to subscribe to settlement_requests', { error });
      throw error;
    }
  }

  async publishSettlementConfirmed(settlementId: string): Promise<void> {
    if (!this.publisher) throw new Error('Redis publisher not initialized');

    try {
      await this.publisher.publish('settlement_confirmed', JSON.stringify({ id: settlementId }));
      logger.info('Settlement confirmed event published', { settlementId });
    } catch (error) {
      logger.error('Failed to publish settlement confirmed event', { error, settlementId });
      throw error;
    }
  }

  async publishSettlementFailed(settlementId: string, reason: string): Promise<void> {
    if (!this.publisher) throw new Error('Redis publisher not initialized');

    try {
      await this.publisher.publish('settlement_failed', JSON.stringify({ 
        id: settlementId, 
        reason 
      }));
      logger.info('Settlement failed event published', { settlementId, reason });
    } catch (error) {
      logger.error('Failed to publish settlement failed event', { error, settlementId });
      throw error;
    }
  }

  async close(): Promise<void> {
    if (this.publisher) {
      await this.publisher.quit();
      this.publisher = null;
    }
    if (this.subscriber) {
      await this.subscriber.quit();
      this.subscriber = null;
    }
  }
}

export const redisService = new RedisService(); 