import { UserState, StateContext, StateHandler } from './index';
import { whatsappMessageService } from '../../integrations/whatsapp/message.service';
import { reminderRepository, ReminderType } from '../../db/repositories/reminder.repository';
import { logger } from '../../utils/logger';

export class SelectingReminderStateHandler implements StateHandler {
  private readonly reminderTypes: Record<string, ReminderType> = {
    '1': 'sunset',
    '2': 'candle',
    '3': 'prayer',
    '4': 'custom',
    SUNSET: 'sunset',
    CANDLE: 'candle',
    PRAYER: 'prayer',
    CUSTOM: 'custom',
    שקיעה: 'sunset',
    הדלקת: 'candle',
    תפילה: 'prayer',
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

    // Parse reminder type selection
    const reminderType = this.parseReminderType(message);

    if (!reminderType) {
      await this.sendReminderTypePrompt(context.phoneNumber);
      return context;
    }

    // Store selected type in context
    const newContext = {
      ...context,
      data: {
        ...context.data,
        selectedReminderType: reminderType,
      },
    };

    // If it's a custom reminder, ask for time
    if (reminderType === 'custom') {
      await this.sendTimePrompt(context.phoneNumber);
      return {
        ...newContext,
        currentState: UserState.SELECTING_TIME,
      };
    }

    // For dynamic reminders, ask for location
    await this.sendLocationPrompt(context.phoneNumber);
    return {
      ...newContext,
      currentState: UserState.SELECTING_LOCATION,
    };
  }

  private parseReminderType(message: string): ReminderType | null {
    const upperMessage = message.toUpperCase().trim();
    return this.reminderTypes[upperMessage] || null;
  }

  private async sendReminderTypePrompt(phoneNumber: string): Promise<void> {
    const prompt = `Please select a reminder type:
1. Sunset times
2. Candle-lighting times (Shabbat)
3. Prayer times
4. Custom time reminder

Reply with the number or name.`;

    try {
      await whatsappMessageService.sendTemplateMessage(phoneNumber, 'help', []);
    } catch (error) {
      logger.error('Error sending reminder type prompt', { phoneNumber, error });
    }
  }

  private async sendTimePrompt(phoneNumber: string): Promise<void> {
    const prompt = `Please enter the time for your reminder in HH:MM format (24-hour).
Example: 18:30`;

    try {
      await whatsappMessageService.sendTemplateMessage(phoneNumber, 'help', []);
    } catch (error) {
      logger.error('Error sending time prompt', { phoneNumber, error });
    }
  }

  private async sendLocationPrompt(phoneNumber: string): Promise<void> {
    const prompt = `Please enter your city name (e.g., Jerusalem, Tel Aviv, Haifa).
Default: Jerusalem`;

    try {
      await whatsappMessageService.sendTemplateMessage(phoneNumber, 'help', []);
    } catch (error) {
      logger.error('Error sending location prompt', { phoneNumber, error });
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

