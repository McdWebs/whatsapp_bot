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

    // Welcome new user and start onboarding with interactive menu
    await this.sendWelcomeMessageInteractive(context.phoneNumber);

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

  private async sendWelcomeMessageInteractive(phoneNumber: string): Promise<void> {
    try {
      await whatsappMessageService.sendInteractiveMessage(
        phoneNumber,
        '👋 שלום! ברוכים הבאים לבוט תזכורות!\n\nבחר סוג תזכורת:',
        undefined,
        [
          { id: 'tefillin', title: 'הנחת תפילין', description: 'תזכורת להנחת תפילין' },
          { id: 'sunset', title: 'שקיעה', description: 'תזכורת לזמני שקיעה' },
          { id: 'candle', title: 'הדלקת נרות', description: 'תזכורת להדלקת נרות שבת' },
          { id: 'prayer', title: 'תפילה', description: 'תזכורת לזמני תפילה' },
          { id: 'custom', title: 'מותאם אישית', description: 'תזכורת בשעה מותאמת' },
        ]
      );
    } catch (error) {
      logger.error('Error sending interactive welcome message', { phoneNumber, error });
      // Fallback to regular message
      await this.sendWelcomeMessage(phoneNumber);
    }
  }

  private async sendHelpMessage(phoneNumber: string): Promise<void> {
    try {
      await whatsappMessageService.sendTemplateMessage(phoneNumber, 'help', []);
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
        'confirmation',
        ['All reminders have been stopped']
      );
    } catch (error) {
      logger.error('Error handling unsubscribe', { context, error });
    }
  }
}

