import { Worker } from 'bullmq';
import { getRedisClient } from './queue.config';
import { ReminderJobData } from './reminder.queue';
import { processReminderJob } from './processors/reminder.processor';
import { logger } from '../utils/logger';

export const reminderWorker = new Worker<ReminderJobData>(
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
  logger.error('Reminder worker error', { error: error.message });
});

