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
      // Use sendMenu for interactive menu (works within 24-hour window)
      const result = await whatsappMessageService.sendMenu(
        phoneNumber,
        'What would you like to do?',
        ['Tefillin Reminder', 'Custom Reminder', 'Delete Reminder']
      );
      if (!result.success) {
        logger.error('Failed to send reminder type menu', { 
          phoneNumber, 
          error: result.error,
          messageId: result.messageId,
          status: result.status,
        });
      } else {
        logger.info('Reminder type menu sent successfully', {
          phoneNumber,
          messageId: result.messageId,
          status: result.status,
        });
      }
    } catch (error) {
      logger.error('Error sending reminder type menu', { 
        phoneNumber, 
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
    }
  }

  private async sendHelpMessage(phoneNumber: string): Promise<void> {
    try {
      const result = await whatsappMessageService.sendRegularMessage(phoneNumber, this.welcomeMessage);
      if (!result.success) {
        logger.error('Failed to send help message', { 
          phoneNumber, 
          error: result.error,
          messageId: result.messageId,
          status: result.status,
        });
      } else {
        logger.info('Help message sent successfully', {
          phoneNumber,
          messageId: result.messageId,
          status: result.status,
        });
      }
    } catch (error) {
      logger.error('Error sending help message', { 
        phoneNumber, 
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
    }
  }

  private async handleUnsubscribe(context: StateContext): Promise<void> {
    try {
      const { reminderRepository } = await import('../../db/repositories/reminder.repository');
      await reminderRepository.disableAllForUser(context.userId);

      // Use regular message for unsubscribe confirmation (within 24-hour window)
      const result = await whatsappMessageService.sendResponseMessage(
        context.phoneNumber,
        'All reminders have been stopped'
      );
      if (!result.success) {
        logger.warn('Unsubscribe confirmation message failed', { 
          context, 
          error: result.error 
        });
      }
    } catch (error) {
      logger.error('Error handling unsubscribe', { context, error });
    }
  }
}

