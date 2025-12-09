import cron from 'node-cron';
import { getReminderWorker } from './reminder.worker';
import { reminderDispatcher } from './jobs/reminder-dispatcher.job';
import { runDailyHebCalSync } from './jobs/daily-hebcal-sync.job';
import { closeRedisConnection, getRedisClient } from './queue.config';
import { logger } from '../utils/logger';

export class SchedulerService {
  private hebcalSyncJob: cron.ScheduledTask | null = null;

  async initialize(): Promise<void> {
    try {
      // Check Redis connection first (with timeout to prevent blocking)
      try {
        const redisClient = getRedisClient();
        // Use Promise.race to add timeout - don't wait more than 2 seconds
        await Promise.race([
          redisClient.ping(),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Redis ping timeout')), 2000)
          ),
        ]);
        logger.info('Redis connection verified');
      } catch (redisError) {
        logger.warn('Redis not available - reminder scheduling will be disabled', {
          error: redisError instanceof Error ? redisError.message : String(redisError),
        });
        // Continue without Redis - webhook and admin features will still work
      }

      // Start reminder dispatcher (runs every minute) - only if Redis is available
      try {
        reminderDispatcher.start();
      } catch (error) {
        logger.warn('Reminder dispatcher failed to start (Redis may be unavailable)', {
          error: error instanceof Error ? error.message : String(error),
        });
      }

      // Schedule daily HebCal sync (runs at 2 AM Israel time)
      this.hebcalSyncJob = cron.schedule('0 2 * * *', async () => {
        try {
          await runDailyHebCalSync();
        } catch (error) {
          logger.error('Scheduled HebCal sync failed', { error });
        }
      });

      // Run initial HebCal sync
      await runDailyHebCalSync().catch((error) => {
        logger.warn('Initial HebCal sync failed', { error });
      });

      logger.info('Scheduler service initialized');
    } catch (error) {
      logger.error('Error initializing scheduler service', { error });
      // Don't throw - allow server to start even if scheduler fails
      logger.warn('Server will continue without scheduler features');
    }
  }

  async shutdown(): Promise<void> {
    try {
      // Stop reminder dispatcher
      reminderDispatcher.stop();

      // Stop HebCal sync job
      if (this.hebcalSyncJob) {
        this.hebcalSyncJob.stop();
        this.hebcalSyncJob = null;
      }

      // Close worker
      const worker = getReminderWorker();
      if (worker) {
        await worker.close();
      }

      // Close Redis connection
      await closeRedisConnection();

      logger.info('Scheduler service shut down');
    } catch (error) {
      logger.error('Error shutting down scheduler service', { error });
    }
  }
}

export const schedulerService = new SchedulerService();

