import Redis from 'ioredis';
import { config } from '../config';
import { logger } from '../utils/logger';

let redisClient: Redis | null = null;

export function getRedisClient(): Redis {
  if (!redisClient) {
    if (config.redis.url) {
      // When URL is provided, use it directly without host/port override
      redisClient = new Redis(config.redis.url, {
        maxRetriesPerRequest: null, // BullMQ requires this to be null
        retryStrategy: (times: number) => {
          const delay = Math.min(times * 50, 2000);
          return delay;
        },
      });
    } else {
      // Fallback to host/port for local development
      const redisConfig: any = {
        host: config.redis.host,
        port: config.redis.port,
        maxRetriesPerRequest: null, // BullMQ requires this to be null
        retryStrategy: (times: number) => {
          const delay = Math.min(times * 50, 2000);
          return delay;
        },
      };

      if (config.redis.password) {
        redisConfig.password = config.redis.password;
      }

      redisClient = new Redis(redisConfig);
    }

    redisClient.on('error', (error) => {
      // Only log as warning to avoid spam - Redis may not be configured
      logger.warn('Redis connection error', { 
        error: error.message,
        note: 'Reminder scheduling features will be unavailable until Redis is configured'
      });
    });

    redisClient.on('connect', () => {
      logger.info('Redis connected');
    });
  }

  return redisClient;
}

export async function closeRedisConnection(): Promise<void> {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
    logger.info('Redis connection closed');
  }
}

