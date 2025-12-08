import { ReminderType } from '../db/repositories/reminder.repository';
import { formatTime } from '../utils/timezone.utils';

export class MessageTemplateService {
  buildReminderMessage(
    reminderType: ReminderType,
    time: Date,
    location?: string
  ): string {
    const timeStr = formatTime(time);
    const locationStr = location ? ` in ${location}` : '';

    switch (reminderType) {
      case 'sunset':
        return `Sunset reminder: ${timeStr}${locationStr}`;
      case 'candle':
        return `Candle-lighting reminder: ${timeStr}${locationStr}`;
      case 'prayer':
        return `Prayer time reminder: ${timeStr}${locationStr}`;
      case 'custom':
        return `Reminder: ${timeStr}${locationStr}`;
      default:
        return `Reminder: ${timeStr}${locationStr}`;
    }
  }

  buildWelcomeMessage(): string {
    return 'Welcome! I can help you set up reminders for sunset, candle-lighting, and prayer times. Reply with HELP for commands.';
  }

  buildHelpMessage(): string {
    return `Available commands:
• HELP - Show this menu
• STOP / UNSUBSCRIBE - Stop all reminders
• SETTINGS - View your current settings
• CHANGE_REMINDER - Modify your reminders

To set up a new reminder, just start chatting!`;
  }

  buildConfirmationMessage(reminderType: string, time: string, location?: string): string {
    return `Your ${reminderType} reminder has been set for ${time}${location ? ` in ${location}` : ''}.`;
  }
}

export const messageTemplateService = new MessageTemplateService();

