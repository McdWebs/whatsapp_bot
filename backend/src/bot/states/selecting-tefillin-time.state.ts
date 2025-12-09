import { UserState, StateContext, StateHandler } from './index';
import { whatsappMessageService } from '../../integrations/whatsapp/message.service';
import { reminderRepository } from '../../db/repositories/reminder.repository';
import { userRepository } from '../../db/repositories/user.repository';
import { hebcalClient } from '../../integrations/hebcal/hebcal.client';
import { getReminderQueue } from '../../scheduler/reminder.queue';
import { logger } from '../../utils/logger';

export class SelectingTefillinTimeStateHandler implements StateHandler {
  private readonly offsetMap: Record<string, number> = {
    '1': 20,
    '1️⃣': 20,
    '2': 30,
    '2️⃣': 30,
    '3': 60,
    '3️⃣': 60,
  };

  async handle(context: StateContext, message: string): Promise<StateContext> {
    const upperMessage = message.toUpperCase().trim();

    // Check for commands
    if (upperMessage === 'HELP' || upperMessage === 'עזרה') {
      await this.sendHelpMessage(context.phoneNumber);
      return context;
    }

    if (upperMessage === 'STOP' || upperMessage === 'UNSUBSCRIBE' || upperMessage === 'ביטול') {
      await this.handleUnsubscribe(context);
      return { ...context, currentState: UserState.CONFIRMED };
    }

    // Parse offset selection
    const trimmedMessage = message.trim();
    const offsetMinutes = this.offsetMap[trimmedMessage];

    if (!offsetMinutes) {
      await this.sendInvalidSelectionMessage(context.phoneNumber);
      return context;
    }

    try {
      // Fetch sunset time from HebCal (default to Jerusalem)
      const location = 'Jerusalem';
      const today = new Date();
      const hebcalData = await hebcalClient.fetchCalendarData(location, today);

      if (!hebcalData.sunsetTime) {
        logger.error('Sunset time not available from HebCal', { location, date: today });
        await this.sendErrorMessage(context.phoneNumber);
        return context;
      }

      const sunsetTime = hebcalData.sunsetTime;
      
      // Calculate reminder time (sunset - offset)
      const reminderTime = new Date(sunsetTime);
      reminderTime.setMinutes(reminderTime.getMinutes() - offsetMinutes);

      // If reminder time has passed today, schedule for tomorrow
      const now = new Date();
      if (reminderTime < now) {
        reminderTime.setDate(reminderTime.getDate() + 1);
        // Re-fetch sunset for tomorrow
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowData = await hebcalClient.fetchCalendarData(location, tomorrow);
        if (tomorrowData.sunsetTime) {
          const tomorrowSunset = tomorrowData.sunsetTime;
          reminderTime.setTime(tomorrowSunset.getTime());
          reminderTime.setMinutes(reminderTime.getMinutes() - offsetMinutes);
        }
      }

      // Save reminder to database
      const reminder = await reminderRepository.saveReminder(
        context.userId,
        'tefillin',
        offsetMinutes,
        reminderTime,
        sunsetTime
      );

      // Schedule job immediately
      await this.scheduleReminderJob(
        context.userId,
        reminder.id,
        reminderTime,
        location,
        offsetMinutes,
        sunsetTime
      );

      // Send confirmation message
      await this.sendConfirmationMessage(context.phoneNumber, offsetMinutes, reminderTime);

      // Reset to initial state
      await userRepository.updateState(context.userId, UserState.INITIAL);

      return {
        ...context,
        currentState: UserState.INITIAL,
      };
    } catch (error) {
      logger.error('Error processing tefillin time selection', {
        userId: context.userId,
        message,
        error: error instanceof Error ? error.message : String(error),
      });
      await this.sendErrorMessage(context.phoneNumber);
      return context;
    }
  }

  private async scheduleReminderJob(
    userId: string,
    reminderId: string,
    reminderTime: Date,
    location: string,
    offsetMinutes: number,
    sunsetTime: Date
  ): Promise<void> {
    try {
      const queue = getReminderQueue();
      if (!queue) {
        logger.warn('Reminder queue not available - Redis may be disconnected', {
          userId,
          reminderId,
        });
        // Don't throw - allow reminder to be saved in DB even if queue is unavailable
        return;
      }

      const now = new Date();
      const delay = Math.max(0, reminderTime.getTime() - now.getTime());

      await queue.add(
        `reminder-${reminderId}`,
        {
          userId,
          reminderType: 'tefillin',
          scheduledTime: reminderTime.toISOString(),
          location,
          reminderPreferenceId: reminderId,
          offsetMinutes,
          sunsetTime: sunsetTime.toISOString(),
        },
        {
          delay,
        }
      );

      logger.info('Tefillin reminder job scheduled', {
        userId,
        reminderId,
        reminderTime: reminderTime.toISOString(),
        delay,
        offsetMinutes,
      });
    } catch (error) {
      logger.error('Error scheduling reminder job', {
        userId,
        reminderId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  private async sendConfirmationMessage(
    phoneNumber: string,
    offsetMinutes: number,
    reminderTime: Date
  ): Promise<void> {
    try {
      const timeStr = reminderTime.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });
      const message = `Your reminder has been set successfully.\n\nYou will be reminded ${offsetMinutes} minutes before sunset every day (today at ${timeStr}).`;
      
      await whatsappMessageService.sendTemplateMessage(phoneNumber, 'confirmation', [message]);
    } catch (error) {
      logger.error('Error sending confirmation message', { phoneNumber, error });
    }
  }

  private async sendInvalidSelectionMessage(phoneNumber: string): Promise<void> {
    try {
      await whatsappMessageService.sendMenu(
        phoneNumber,
        'Invalid selection. Please choose 1, 2, or 3.\n\nWhen should I remind you before sunset?',
        ['20 minutes', '30 minutes', '1 hour']
      );
    } catch (error) {
      logger.error('Error sending invalid selection message', { phoneNumber, error });
    }
  }

  private async sendHelpMessage(phoneNumber: string): Promise<void> {
    try {
      await whatsappMessageService.sendTemplateMessage(phoneNumber, 'help', []);
    } catch (error) {
      logger.error('Error sending help message', { phoneNumber, error });
    }
  }

  private async sendErrorMessage(phoneNumber: string): Promise<void> {
    try {
      await whatsappMessageService.sendTemplateMessage(
        phoneNumber,
        'help',
        ['An error occurred while setting your reminder. Please try again later.']
      );
    } catch (error) {
      logger.error('Error sending error message', { phoneNumber, error });
    }
  }

  private async handleUnsubscribe(context: StateContext): Promise<void> {
    try {
      await reminderRepository.disableAllForUser(context.userId);
      await whatsappMessageService.sendTemplateMessage(
        context.phoneNumber,
        'confirmation',
        ['All reminders have been stopped']
      );
    } catch (error) {
      logger.error('Error handling unsubscribe', { context, error });
    }
  }
}

