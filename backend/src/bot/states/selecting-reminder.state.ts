import { UserState, StateContext, StateHandler } from './index';
import { whatsappMessageService } from '../../integrations/whatsapp/message.service';
import { reminderRepository } from '../../db/repositories/reminder.repository';
import { logger } from '../../utils/logger';

export class SelectingReminderStateHandler implements StateHandler {
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

    // Parse reminder type selection: "1" = Tefillin, "2" = Custom, "3" = Delete
    const trimmedMessage = message.trim();
    
    if (trimmedMessage === '1' || trimmedMessage === '1️⃣') {
      // Tefillin Reminder - send time offset menu
      await this.sendTefillinTimeMenu(context.phoneNumber);
      return {
        ...context,
        currentState: UserState.SELECTING_TEFILLIN_TIME,
        data: {
          ...context.data,
          selectedReminderType: 'tefillin',
        },
      };
    } else if (trimmedMessage === '2' || trimmedMessage === '2️⃣') {
      // Custom Reminder - move to time selection
      await this.sendTimePrompt(context.phoneNumber);
      return {
        ...context,
        currentState: UserState.SELECTING_TIME,
        data: {
          ...context.data,
          selectedReminderType: 'custom',
        },
      };
    } else if (trimmedMessage === '3' || trimmedMessage === '3️⃣') {
      // Delete Reminder - move to delete selection
      return {
        ...context,
        currentState: UserState.SELECTING_REMINDER_TO_DELETE,
      };
    } else {
      // Invalid selection - resend menu
      await this.sendReminderTypeMenu(context.phoneNumber);
      return context;
    }
  }

  private async sendReminderTypeMenu(phoneNumber: string): Promise<void> {
    try {
      const message = `What would you like to do?

1️⃣ Tefillin Reminder
2️⃣ Custom Reminder
3️⃣ Delete Reminder

Reply with the number.`;
      await whatsappMessageService.sendRegularMessage(phoneNumber, message);
    } catch (error) {
      logger.error('Error sending reminder type menu', { phoneNumber, error });
    }
  }

  private async sendTefillinTimeMenu(phoneNumber: string): Promise<void> {
    try {
      const prompt = `Please select when you'd like to be reminded for Tefillin:

1. 30 minutes before sunrise
2. 1 hour before sunrise
3. Custom time (enter HH:MM format)

Reply with the number or time.`;
      await whatsappMessageService.sendRegularMessage(phoneNumber, prompt);
    } catch (error) {
      logger.error('Error sending tefillin time menu', { phoneNumber, error });
    }
  }

  private async sendTimePrompt(phoneNumber: string): Promise<void> {
    const prompt = `Please enter the time for your reminder in HH:MM format (24-hour).
Example: 18:30`;

    try {
      await whatsappMessageService.sendRegularMessage(phoneNumber, prompt);
    } catch (error) {
      logger.error('Error sending time prompt', { phoneNumber, error });
    }
  }

  private async sendHelpMessage(phoneNumber: string): Promise<void> {
    try {
      const message = `Please select a reminder type:
1. Sunset times
2. Candle-lighting times (Shabbat)
3. Prayer times
4. Custom time reminder

Reply with the number or name.`;
      await whatsappMessageService.sendRegularMessage(phoneNumber, message);
    } catch (error) {
      logger.error('Error sending help message', { phoneNumber, error });
    }
  }

  private async handleUnsubscribe(context: StateContext): Promise<void> {
    try {
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

