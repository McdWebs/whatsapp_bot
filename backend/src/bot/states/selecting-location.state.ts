import { UserState, StateContext, StateHandler } from './index';
import { whatsappMessageService } from '../../integrations/whatsapp/message.service';
import { reminderRepository } from '../../db/repositories/reminder.repository';
import { userRepository } from '../../db/repositories/user.repository';
import { logger } from '../../utils/logger';

export class SelectingLocationStateHandler implements StateHandler {
  private readonly israelCities = [
    'Jerusalem',
    'Tel Aviv',
    'Haifa',
    'Beer Sheva',
    'Netanya',
    'Ashkelon',
    'Rishon LeZion',
    'Petah Tikva',
    'Ashdod',
    'Eilat',
  ];

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

    // Use default if empty
    const location = message.trim() || 'Jerusalem';
    const reminderType = context.data?.selectedReminderType || 'sunset';

    // Create reminder preference
    try {
      await reminderRepository.create({
        user_id: context.userId,
        type: reminderType,
        location: location,
        enabled: true,
      });

      await whatsappMessageService.sendTemplateMessage(
        context.phoneNumber,
        'confirmation',
        [`Reminder set for ${reminderType} in ${location}`]
      );

      // Update user state
      await userRepository.updateState(context.userId, UserState.CONFIRMED);

      return {
        ...context,
        currentState: UserState.CONFIRMED,
      };
    } catch (error) {
      logger.error('Error creating reminder preference', { context, location, error });
      await this.sendErrorMessage(context.phoneNumber);
      return context;
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

