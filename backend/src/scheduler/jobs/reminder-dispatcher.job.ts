import cron from 'node-cron';
import { getReminderQueue, ReminderJobData } from '../reminder.queue';
import { reminderRepository } from '../../db/repositories/reminder.repository';
import { hebcalSyncService } from '../../services/hebcal-sync.service';
import { logger } from '../../utils/logger';
import { parseTime, getIsraelTime } from '../../utils/timezone.utils';

export class ReminderDispatcher {
  private cronJob: cron.ScheduledTask | null = null;

  start(): void {
    // Run every minute to check for pending reminders
    this.cronJob = cron.schedule('* * * * *', async () => {
      try {
        await this.dispatchReminders();
      } catch (error) {
        logger.error('Error in reminder dispatcher', {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    });

    logger.info('Reminder dispatcher started');
  }

  stop(): void {
    if (this.cronJob) {
      this.cronJob.stop();
      this.cronJob = null;
      logger.info('Reminder dispatcher stopped');
    }
  }

  private async dispatchReminders(): Promise<void> {
    const queue = getReminderQueue();
    if (!queue) {
      // Redis not available, skip dispatching
      return;
    }

    const now = getIsraelTime();
    const nowMinutes = now.getHours() * 60 + now.getMinutes();

    // Get all enabled reminders
    const reminders = await reminderRepository.findEnabledReminders();

    for (const reminder of reminders) {
      try {
        const scheduledTime = await this.calculateNextReminderTime(reminder);

        if (!scheduledTime) {
          continue; // Skip if we can't calculate time
        }

        const scheduledMinutes = scheduledTime.getHours() * 60 + scheduledTime.getMinutes();
        const timeDiff = scheduledMinutes - nowMinutes;

        // Schedule if reminder is within the next minute
        if (timeDiff >= 0 && timeDiff <= 1) {
          // Check if job already exists for this reminder
          const existingJobs = await queue.getJobs(['waiting', 'delayed']);
          const jobExists = existingJobs.some(
            (job) =>
              job.data.userId === reminder.user_id &&
              job.data.reminderType === reminder.type &&
              Math.abs(
                new Date(job.data.scheduledTime).getTime() - scheduledTime.getTime()
              ) < 60000 // Within 1 minute
          );

          if (!jobExists) {
            const jobData: ReminderJobData = {
              userId: reminder.user_id,
              reminderType: reminder.type,
              scheduledTime: scheduledTime.toISOString(),
              location: reminder.location,
              reminderPreferenceId: reminder.id,
              offsetMinutes: reminder.offset_minutes || undefined,
              sunsetTime: reminder.sunset_time || undefined,
            };

            await queue.add(`reminder-${reminder.id}`, jobData, {
              delay: Math.max(0, scheduledTime.getTime() - now.getTime()),
            });

            logger.info('Reminder job scheduled', {
              userId: reminder.user_id,
              type: reminder.type,
              scheduledTime: scheduledTime.toISOString(),
            });
          }
        }
      } catch (error) {
        logger.error('Error dispatching reminder', {
          reminderId: reminder.id,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }

  private async calculateNextReminderTime(reminder: any): Promise<Date | null> {
    const now = getIsraelTime();

    if (reminder.type === 'tefillin' && reminder.offset_minutes) {
      // Tefillin reminder - calculate from today's sunset
      try {
        const location = reminder.location || 'Jerusalem';
        const hebcalData = await hebcalSyncService.getCachedData(location, now);

        if (!hebcalData.sunsetTime) {
          logger.warn('Sunset time not available for tefillin reminder', {
            reminderId: reminder.id,
            location,
          });
          return null;
        }

        const sunsetTime = hebcalData.sunsetTime;
        const reminderTime = new Date(sunsetTime);
        reminderTime.setMinutes(reminderTime.getMinutes() - reminder.offset_minutes);

        // If reminder time has passed today, calculate for tomorrow
        if (reminderTime < now) {
          const tomorrow = new Date(now);
          tomorrow.setDate(tomorrow.getDate() + 1);
          const tomorrowData = await hebcalSyncService.getCachedData(location, tomorrow);
          if (tomorrowData.sunsetTime) {
            const tomorrowSunset = tomorrowData.sunsetTime;
            const tomorrowReminderTime = new Date(tomorrowSunset);
            tomorrowReminderTime.setMinutes(
              tomorrowReminderTime.getMinutes() - reminder.offset_minutes
            );
            return tomorrowReminderTime;
          }
          return null;
        }

        return reminderTime;
      } catch (error) {
        logger.error('Error calculating tefillin reminder time', {
          reminderId: reminder.id,
          error: error instanceof Error ? error.message : String(error),
        });
        return null;
      }
    } else if (reminder.type === 'custom' && reminder.time) {
      // Custom time reminder
      const timeParts = parseTime(reminder.time);
      if (!timeParts) {
        return null;
      }

      const reminderTime = new Date(now);
      reminderTime.setHours(timeParts.hours, timeParts.minutes, 0, 0);

      // If time has passed today, schedule for tomorrow
      if (reminderTime < now) {
        reminderTime.setDate(reminderTime.getDate() + 1);
      }

      return reminderTime;
    } else {
      // Dynamic reminder - get from HebCal
      try {
        const hebcalData = await hebcalSyncService.getCachedData(reminder.location, now);

        switch (reminder.type) {
          case 'sunset':
            if (hebcalData.sunsetTime) {
              return hebcalData.sunsetTime > now ? hebcalData.sunsetTime : null;
            }
            break;
          case 'candle':
            if (hebcalData.candleLightingTime) {
              return hebcalData.candleLightingTime > now
                ? hebcalData.candleLightingTime
                : null;
            }
            break;
          case 'prayer':
            if (hebcalData.prayerTimes?.mincha) {
              const prayerTime = new Date(hebcalData.prayerTimes.mincha);
              return prayerTime > now ? prayerTime : null;
            }
            break;
        }
      } catch (error) {
        logger.error('Error calculating reminder time from HebCal', {
          reminderId: reminder.id,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return null;
  }
}

export const reminderDispatcher = new ReminderDispatcher();

