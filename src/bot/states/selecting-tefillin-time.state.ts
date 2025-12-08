import { UserState, StateContext, StateHandler } from './index';
import { whatsappMessageService } from '../../integrations/whatsapp/message.service';
import { reminderRepository } from '../../db/repositories/reminder.repository';
import { userRepository } from '../../db/repositories/user.repository';
import { logger } from '../../utils/logger';

export class SelectingTefillinTimeStateHandler implements StateHandler {
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

    // Parse time selection
    const timeData = this.parseTimeOffset(message);

    if (!timeData) {
      await this.sendInvalidTimeMessage(context.phoneNumber);
      return context;
    }

    // Calculate the actual time based on offset or use specific time
    const reminderTime = this.calculateReminderTime(timeData);

    // Create reminder preference
    try {
      await reminderRepository.create({
        user_id: context.userId,
        type: 'tefillin',
        time: reminderTime,
        location: 'Jerusalem', // Default location for tefillin
        enabled: true,
      });

      const confirmationMessage = this.buildConfirmationMessage(timeData, reminderTime);
      await whatsappMessageService.sendTemplateMessage(
        context.phoneNumber,
        'confirmation',
        [confirmationMessage]
      );

      // Update user state
      await userRepository.updateState(context.userId, UserState.CONFIRMED);

      return {
        ...context,
        currentState: UserState.CONFIRMED,
      };
    } catch (error) {
      logger.error('Error creating tefillin reminder preference', { context, timeData, error });
      await this.sendErrorMessage(context.phoneNumber);
      return context;
    }
  }

  private parseTimeOffset(message: string): { type: 'offset' | 'specific'; value: number | string } | null {
    const upperMessage = message.toUpperCase().trim();

    // Check for predefined options
    if (upperMessage === '1' || upperMessage === '20' || upperMessage.includes('20 דק')) {
      return { type: 'offset', value: 20 }; // 20 minutes
    }
    if (upperMessage === '2' || upperMessage === '30' || upperMessage.includes('30 דק')) {
      return { type: 'offset', value: 30 }; // 30 minutes
    }
    if (upperMessage === '3' || (upperMessage === 'שעה' && !upperMessage.includes('מסוימת'))) {
      return { type: 'offset', value: 60 }; // 1 hour
    }

    // Try to parse HH:MM format for custom time
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):([0-5][0-9])$/;
    const match = message.trim().match(timeRegex);

    if (match) {
      const hours = match[1].padStart(2, '0');
      const minutes = match[2];
      return { type: 'specific', value: `${hours}:${minutes}` };
    }

    return null;
  }

  private calculateReminderTime(timeData: { type: 'offset' | 'specific'; value: number | string }): string {
    if (timeData.type === 'specific') {
      return timeData.value as string;
    }

    // Calculate time based on current time + offset
    const offset = timeData.value as number;
    const now = new Date();
    const reminderDate = new Date(now.getTime() + offset * 60 * 1000);
    const hours = reminderDate.getHours();
    const minutes = reminderDate.getMinutes();
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  }

  private buildConfirmationMessage(
    timeData: { type: 'offset' | 'specific'; value: number | string },
    reminderTime: string
  ): string {
    if (timeData.type === 'specific') {
      return `תזכורת להנחת תפילין הוגדרה לשעה ${reminderTime}`;
    }

    const offset = timeData.value as number;
    const timeText =
      offset === 20
        ? '20 דקות'
        : offset === 30
        ? '30 דקות'
        : offset === 60
        ? 'שעה'
        : `${offset} דקות`;

    return `תזכורת להנחת תפילין הוגדרה ל-${timeText} מכעת`;
  }

  private async sendInvalidTimeMessage(phoneNumber: string): Promise<void> {
    try {
      await whatsappMessageService.sendTemplateMessage(
        phoneNumber,
        'help',
        [
          'פורמט לא תקין. אנא בחר:\n1️⃣ 20 דקות\n2️⃣ 30 דקות\n3️⃣ שעה\n4️⃣ שעה מסוימת (HH:MM)',
        ]
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
        ['אירעה שגיאה. אנא נסה שוב או פנה לתמיכה.']
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
        ['כל התזכורות בוטלו']
      );
    } catch (error) {
      logger.error('Error handling unsubscribe', { context, error });
    }
  }
}

