import { UserState, StateContext, StateHandler } from './index';
import { whatsappMessageService } from '../../integrations/whatsapp/message.service';
import { reminderRepository } from '../../db/repositories/reminder.repository';
import { userRepository } from '../../db/repositories/user.repository';
import { logger } from '../../utils/logger';

export class SelectingTimeStateHandler implements StateHandler {
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

    // Parse time (HH:MM format)
    const time = this.parseTime(message);

    if (!time) {
      await this.sendInvalidTimeMessage(context.phoneNumber);
      return context;
    }

    const reminderType = context.data?.selectedReminderType || 'custom';
    const location = context.data?.location || 'Jerusalem';

    // Create reminder preference
    try {
      await reminderRepository.create({
        user_id: context.userId,
        type: reminderType,
        time: time,
        location: location,
        enabled: true,
      });

      await whatsappMessageService.sendTemplateMessage(
        context.phoneNumber,
        'confirmation',
        [`Reminder set for ${time}`]
      );

      // Update user state
      await userRepository.updateState(context.userId, UserState.CONFIRMED);

      return {
        ...context,
        currentState: UserState.CONFIRMED,
      };
    } catch (error) {
      logger.error('Error creating reminder preference', { context, time, error });
      await this.sendErrorMessage(context.phoneNumber);
      return context;
    }
  }

  private parseTime(message: string): string | null {
    // Match HH:MM format (24-hour)
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):([0-5][0-9])$/;
    const match = message.trim().match(timeRegex);

    if (match) {
      const hours = match[1].padStart(2, '0');
      const minutes = match[2];
      return `${hours}:${minutes}`;
    }

    return null;
  }

  private async sendInvalidTimeMessage(phoneNumber: string): Promise<void> {
    try {
      await whatsappMessageService.sendTemplateMessage(
        phoneNumber,
        'help',
        ['Invalid time format. Please use HH:MM (24-hour format), e.g., 18:30']
      );
    } catch (error) {
      logger.error('Error sending invalid time message', { phoneNumber, error });
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
        ['An error occurred. Please try again or contact support.']
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

