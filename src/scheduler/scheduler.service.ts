import cron from 'node-cron';
import { reminderWorker } from './reminder.worker';
import { reminderDispatcher } from './jobs/reminder-dispatcher.job';
import { runDailyHebCalSync } from './jobs/daily-hebcal-sync.job';
import { closeRedisConnection } from './queue.config';
import { logger } from '../utils/logger';

export class SchedulerService {
  private hebcalSyncJob: cron.ScheduledTask | null = null;

  async initialize(): Promise<void> {
    try {
      // Start reminder dispatcher (runs every minute)
      reminderDispatcher.start();

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
      throw error;
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
      await reminderWorker.close();

      // Close Redis connection
      await closeRedisConnection();

      logger.info('Scheduler service shut down');
    } catch (error) {
      logger.error('Error shutting down scheduler service', { error });
    }
  }
}

export const schedulerService = new SchedulerService();

