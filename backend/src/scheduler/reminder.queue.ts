import { Queue } from 'bullmq';
import { getRedisClient } from './queue.config';
import { logger } from '../utils/logger';

export interface ReminderJobData {
  userId: string;
  reminderType: string;
  scheduledTime: string; // ISO timestamp
  location: string;
  reminderPreferenceId: string;
}

export const reminderQueue = new Queue<ReminderJobData>('reminders', {
  connection: getRedisClient(),
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000, // 2s, 4s, 8s
    },
    removeOnComplete: {
      age: 24 * 3600, // Keep completed jobs for 24 hours
      count: 1000,
    },
    removeOnFail: {
      age: 7 * 24 * 3600, // Keep failed jobs for 7 days
    },
  },
});

reminderQueue.on('error', (error) => {
  // Log as warning to avoid spam - Redis may not be available
  logger.warn('Reminder queue error (Redis may be unavailable)', { 
    error: error.message,
    note: 'This is expected if Redis is not configured'
  });
});

// Event listeners for queue monitoring
(reminderQueue as any).on('waiting', (job: any) => {
  logger.debug('Reminder job waiting', { jobId: job?.id });
});

(reminderQueue as any).on('active', (job: any) => {
  logger.info('Reminder job started', {
    jobId: job?.id,
    userId: job?.data?.userId,
    type: job?.data?.reminderType,
  });
});

(reminderQueue as any).on('completed', (job: any) => {
  logger.info('Reminder job completed', {
    jobId: job?.id,
    userId: job?.data?.userId,
    type: job?.data?.reminderType,
  });
});

(reminderQueue as any).on('failed', (job: any, error: any) => {
  logger.error('Reminder job failed', {
    jobId: job?.id,
    userId: job?.data?.userId,
    type: job?.data?.reminderType,
    error: error?.message || 'Unknown error',
  });
});

