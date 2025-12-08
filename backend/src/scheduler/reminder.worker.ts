import { Worker } from 'bullmq';
import { getRedisClient } from './queue.config';
import { ReminderJobData } from './reminder.queue';
import { processReminderJob } from './processors/reminder.processor';
import { logger } from '../utils/logger';

let reminderWorker: Worker<ReminderJobData> | null = null;

export function getReminderWorker(): Worker<ReminderJobData> | null {
  if (!reminderWorker) {
    try {
      reminderWorker = new Worker<ReminderJobData>(
        'reminders',
        async (job) => {
          return await processReminderJob(job);
        },
        {
          connection: getRedisClient(),
          concurrency: 10, // Process up to 10 reminders concurrently
          limiter: {
            max: 100, // Max 100 jobs
            duration: 60000, // Per minute
          },
        }
      );

      reminderWorker.on('completed', (job) => {
        logger.info('Reminder worker completed job', {
          jobId: job.id,
          userId: job.data.userId,
        });
      });

      reminderWorker.on('failed', (job, error) => {
        logger.error('Reminder worker failed job', {
          jobId: job?.id,
          userId: job?.data.userId,
          error: error.message,
        });
      });

      reminderWorker.on('error', (error) => {
        // Log as warning to avoid spam - Redis may not be available
        logger.warn('Reminder worker error (Redis may be unavailable)', { 
          error: error.message,
          note: 'This is expected if Redis is not configured'
        });
      });
    } catch (error) {
      logger.warn('Failed to initialize reminder worker (Redis may be unavailable)', {
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }
  return reminderWorker;
}

// Export the getter function - call getReminderWorker() to get the worker instance

