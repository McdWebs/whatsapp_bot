import { UserState, StateContext, StateHandler } from './index';
import { whatsappMessageService } from '../../integrations/whatsapp/message.service';
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

    // Send reminder type menu immediately
    await this.sendReminderTypeMenu(context.phoneNumber);

    return {
      ...context,
      currentState: UserState.SELECTING_REMINDER_TYPE,
    };
  }

  private readonly welcomeMessage = `Welcome to WhatsApp Reminder Bot! 🕯️

I can help you set up reminders for:
1. Sunset times
2. Candle-lighting times (Shabbat)
3. Prayer times
4. Custom time reminders

Please select a reminder type by replying with the number or name.`;

  private async sendReminderTypeMenu(phoneNumber: string): Promise<void> {
    try {
      await whatsappMessageService.sendRegularMessage(phoneNumber, this.welcomeMessage);
    } catch (error) {
      logger.error('Error sending reminder type menu', { phoneNumber, error });
    }
  }

  private async sendHelpMessage(phoneNumber: string): Promise<void> {
    try {
      await whatsappMessageService.sendRegularMessage(phoneNumber, this.welcomeMessage);
    } catch (error) {
      logger.error('Error sending help message', { phoneNumber, error });
    }
  }

  private async handleUnsubscribe(context: StateContext): Promise<void> {
    try {
      const { reminderRepository } = await import('../../db/repositories/reminder.repository');
      await reminderRepository.disableAllForUser(context.userId);

      await whatsappMessageService.sendRegularMessage(
        context.phoneNumber,
        'All reminders have been stopped. You can start again anytime by sending a message.'
      );
    } catch (error) {
      logger.error('Error handling unsubscribe', { context, error });
    }
  }
}

