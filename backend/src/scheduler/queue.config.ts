import Redis from 'ioredis';
import { config } from '../config';
import { logger } from '../utils/logger';

let redisClient: Redis | null = null;

export function getRedisClient(): Redis {
  if (!redisClient) {
    const redisConfig: any = {
      maxRetriesPerRequest: null, // BullMQ requires this to be null
      retryStrategy: (times: number) => {
        const delay = Math.min(times * 50, 2000);
        logger.warn(`Redis retry attempt ${times}`, { delay });
        return delay;
      },
      connectTimeout: 10000, // 10 seconds
      lazyConnect: false, // Connect immediately
    };

    // Prefer REDIS_URL (Render provides this as connectionString)
    if (config.redis.url) {
      logger.info('Connecting to Redis using REDIS_URL', {
        url: config.redis.url.replace(/:[^:@]+@/, ':****@'), // Hide password in logs
      });
      redisClient = new Redis(config.redis.url, redisConfig);
    } else if (config.redis.host && config.redis.host !== 'localhost') {
      // Use host/port/password if provided
      logger.info('Connecting to Redis using host/port', {
        host: config.redis.host,
        port: config.redis.port,
      });
      redisConfig.host = config.redis.host;
      redisConfig.port = config.redis.port;
      if (config.redis.password) {
        redisConfig.password = config.redis.password;
      }
      redisClient = new Redis(redisConfig);
    } else {
      // Fallback to localhost (for local development)
      logger.warn('No REDIS_URL provided, trying localhost (may fail in production)', {
        host: config.redis.host,
        port: config.redis.port,
      });
      redisConfig.host = config.redis.host;
      redisConfig.port = config.redis.port;
      if (config.redis.password) {
        redisConfig.password = config.redis.password;
      }
      redisClient = new Redis(redisConfig);
    }

    redisClient.on('error', (error) => {
      logger.warn('Redis connection error', { 
        error: error.message,
        code: (error as any).code,
        syscall: (error as any).syscall,
        address: (error as any).address,
        port: (error as any).port,
        note: 'Reminder scheduling features will be unavailable until Redis is configured. Check Render dashboard to ensure Redis service exists and REDIS_URL is set.'
      });
    });

    redisClient.on('connect', () => {
      logger.info('Redis connected successfully');
    });

    redisClient.on('ready', () => {
      logger.info('Redis ready to accept commands');
    });

    redisClient.on('close', () => {
      logger.warn('Redis connection closed');
    });

    redisClient.on('reconnecting', (delay: number) => {
      logger.info('Redis reconnecting', { delay });
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

