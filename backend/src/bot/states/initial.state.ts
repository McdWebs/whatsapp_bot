import { UserState, StateContext, StateHandler } from './index';
import { whatsappMessageService } from '../../integrations/whatsapp/message.service';
import { userRepository } from '../../db/repositories/user.repository';
import { logger } from '../../utils/logger';

export class InitialStateHandler implements StateHandler {
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

    // Welcome new user and start onboarding
    await this.sendWelcomeMessage(context.phoneNumber);

    return {
      ...context,
      currentState: UserState.SELECTING_REMINDER_TYPE,
    };
  }

  private async sendWelcomeMessage(phoneNumber: string): Promise<void> {
    try {
      await whatsappMessageService.sendTemplateMessage(
        phoneNumber,
        'welcome',
        []
      );
    } catch (error) {
      logger.error('Error sending welcome message', { phoneNumber, error });
    }
  }

  private async sendHelpMessage(phoneNumber: string): Promise<void> {
    try {
      await whatsappMessageService.sendTemplateMessage(phoneNumber, 'welcome', []);
    } catch (error) {
      logger.error('Error sending help message', { phoneNumber, error });
    }
  }

  private async handleUnsubscribe(context: StateContext): Promise<void> {
    try {
      const { reminderRepository } = await import('../../db/repositories/reminder.repository');
      await reminderRepository.disableAllForUser(context.userId);

      await whatsappMessageService.sendTemplateMessage(
        context.phoneNumber,
        'welcome',
        ['All reminders have been stopped']
      );
    } catch (error) {
      logger.error('Error handling unsubscribe', { context, error });
    }
  }
}

