import { Job } from 'bullmq';
import { ReminderJobData } from '../reminder.queue';
import { whatsappMessageService } from '../../integrations/whatsapp/message.service';
import { userRepository } from '../../db/repositories/user.repository';
import { reminderRepository } from '../../db/repositories/reminder.repository';
import { historyRepository } from '../../db/repositories/history.repository';
import { hebcalSyncService } from '../../services/hebcal-sync.service';
import { messageTemplateService } from '../../services/message-template.service';
import { logger } from '../../utils/logger';
import { ReminderType } from '../../db/repositories/reminder.repository';
import { parseTime, toIsraelTime } from '../../utils/timezone.utils';

export async function processReminderJob(job: Job<ReminderJobData>): Promise<void> {
  const { userId, reminderType, scheduledTime, location, reminderPreferenceId } = job.data;

  try {
    // Get user
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new Error(`User not found: ${userId}`);
    }

    // Get reminder preference
    const preference = await reminderRepository.findByUserIdAndType(
      userId,
      reminderType as ReminderType
    );

    if (!preference || !preference.enabled) {
      logger.info('Reminder preference not found or disabled', {
        userId,
        reminderType,
        reminderPreferenceId,
      });
      return; // Skip if reminder is disabled
    }

    // Calculate actual reminder time
    let reminderTime: Date;

    if (preference.type === 'custom' && preference.time) {
      // Custom time reminder
      const timeParts = parseTime(preference.time);
      if (!timeParts) {
        throw new Error(`Invalid time format: ${preference.time}`);
      }

      const now = new Date();
      reminderTime = new Date(now);
      reminderTime.setHours(timeParts.hours, timeParts.minutes, 0, 0);

      // If time has passed today, schedule for tomorrow
      if (reminderTime < now) {
        reminderTime.setDate(reminderTime.getDate() + 1);
      }
    } else {
      // Dynamic reminder - get from HebCal cache
      const hebcalData = await hebcalSyncService.getCachedData(
        preference.location || location,
        new Date()
      );

      switch (preference.type) {
        case 'sunset':
          if (!hebcalData.sunsetTime) {
            throw new Error('Sunset time not available');
          }
          reminderTime = hebcalData.sunsetTime;
          break;
        case 'candle':
          if (!hebcalData.candleLightingTime) {
            throw new Error('Candle-lighting time not available');
          }
          reminderTime = hebcalData.candleLightingTime;
          break;
        case 'prayer':
          // Default to mincha if available
          if (hebcalData.prayerTimes?.mincha) {
            reminderTime = new Date(hebcalData.prayerTimes.mincha);
          } else {
            throw new Error('Prayer time not available');
          }
          break;
        default:
          throw new Error(`Unknown reminder type: ${preference.type}`);
      }
    }

    // Build message
    const message = messageTemplateService.buildReminderMessage(
      preference.type,
      reminderTime,
      preference.location
    );

    // Create history record
    const history = await historyRepository.create({
      user_id: userId,
      type: preference.type,
      delivery_status: 'pending',
      reminder_time: reminderTime.toISOString(),
    });

    // Send WhatsApp message
    const result = await whatsappMessageService.sendTemplateMessageWithRetry(
      user.phone_number,
      'reminder',
      [message]
    );

    // Update history with delivery status
    if (result.success) {
      await historyRepository.updateStatus(history.id, 'sent');
      logger.info('Reminder sent successfully', {
        userId,
        reminderType,
        historyId: history.id,
        messageId: result.messageId,
      });
    } else {
      await historyRepository.updateStatus(history.id, 'failed', result.error);
      logger.error('Reminder send failed', {
        userId,
        reminderType,
        historyId: history.id,
        error: result.error,
      });
      throw new Error(`Failed to send reminder: ${result.error}`);
    }
  } catch (error) {
    logger.error('Error processing reminder job', {
      jobId: job.id,
      userId,
      reminderType,
      error: error instanceof Error ? error.message : String(error),
    });

    // Create failed history record if we have user info
    try {
      const user = await userRepository.findById(userId);
      if (user) {
        await historyRepository.create({
          user_id: userId,
          type: reminderType as ReminderType,
          delivery_status: 'failed',
          error_message: error instanceof Error ? error.message : String(error),
        });
      }
    } catch (historyError) {
      logger.error('Error creating failed history record', { historyError });
    }

    throw error; // Re-throw to trigger retry
  }
}

