import { UserState, StateContext, StateHandler } from './index';
import { whatsappMessageService } from '../../integrations/whatsapp/message.service';
import { reminderRepository } from '../../db/repositories/reminder.repository';
import { userRepository } from '../../db/repositories/user.repository';
import { logger } from '../../utils/logger';

export class SelectingReminderToDeleteStateHandler implements StateHandler {
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

    // Get all user reminders
    const reminders = await reminderRepository.findByUserId(context.userId);

    if (reminders.length === 0) {
      await this.sendNoRemindersMessage(context.phoneNumber);
      await userRepository.updateState(context.userId, UserState.INITIAL);
      return {
        ...context,
        currentState: UserState.INITIAL,
      };
    }

    // If this is the first time entering this state (justEntered flag or empty message), send the menu
    if (context.data?.justEntered || !message || message.trim() === '') {
      await this.sendRemindersMenu(context.phoneNumber, reminders);
      return {
        ...context,
        data: {
          ...context.data,
          justEntered: false,
        },
      };
    }

    // Parse selection
    const trimmedMessage = message.trim();
    const selectedIndex = parseInt(trimmedMessage, 10) - 1;

    if (isNaN(selectedIndex) || selectedIndex < 0 || selectedIndex >= reminders.length) {
      await this.sendRemindersMenu(context.phoneNumber, reminders);
      return context;
    }

    // Delete selected reminder
    const reminderToDelete = reminders[selectedIndex];
    try {
      await reminderRepository.delete(context.userId, reminderToDelete.type);
      
      await whatsappMessageService.sendRegularMessage(
        context.phoneNumber,
        `✅ Reminder "${this.formatReminderType(reminderToDelete.type)}" has been deleted successfully.`
      );

      logger.info('Reminder deleted by user', {
        userId: context.userId,
        reminderId: reminderToDelete.id,
        type: reminderToDelete.type,
      });

      // Reset to initial state
      await userRepository.updateState(context.userId, UserState.INITIAL);
      return {
        ...context,
        currentState: UserState.INITIAL,
      };
    } catch (error) {
      logger.error('Error deleting reminder', {
        userId: context.userId,
        reminderId: reminderToDelete.id,
        error: error instanceof Error ? error.message : String(error),
      });
      await this.sendErrorMessage(context.phoneNumber);
      return context;
    }
  }

  private async sendRemindersMenu(
    phoneNumber: string,
    reminders: any[]
  ): Promise<void> {
    try {
      const options = reminders.map((reminder, index) => {
        const typeLabel = this.formatReminderType(reminder.type);
        if (reminder.type === 'tefillin' && reminder.offset_minutes) {
          return `${typeLabel} (${reminder.offset_minutes} min before sunset)`;
        } else if (reminder.type === 'custom' && reminder.time) {
          return `${typeLabel} (${reminder.time})`;
        }
        return typeLabel;
      });

      const messageText = `Select a reminder to delete:\n\n${options.map((opt, idx) => `${idx + 1}️⃣ ${opt}`).join('\n')}\n\nReply with the number.`;
      await whatsappMessageService.sendRegularMessage(phoneNumber, messageText);
    } catch (error) {
      logger.error('Error sending reminders menu', { phoneNumber, error });
    }
  }

  private formatReminderType(type: string): string {
    const typeMap: Record<string, string> = {
      tefillin: 'Tefillin Reminder',
      custom: 'Custom Reminder',
      sunset: 'Sunset Reminder',
      candle: 'Candle Lighting Reminder',
      prayer: 'Prayer Reminder',
    };
    return typeMap[type] || type;
  }

  private async sendNoRemindersMessage(phoneNumber: string): Promise<void> {
    try {
      await whatsappMessageService.sendRegularMessage(
        phoneNumber,
        'You have no active reminders to delete.'
      );
    } catch (error) {
      logger.error('Error sending no reminders message', { phoneNumber, error });
    }
  }

  private async sendHelpMessage(phoneNumber: string): Promise<void> {
    try {
      await whatsappMessageService.sendRegularMessage(
        phoneNumber,
        'Select a reminder to delete by replying with its number.'
      );
    } catch (error) {
      logger.error('Error sending help message', { phoneNumber, error });
    }
  }

  private async sendErrorMessage(phoneNumber: string): Promise<void> {
    try {
      await whatsappMessageService.sendRegularMessage(
        phoneNumber,
        'An error occurred while deleting the reminder. Please try again.'
      );
    } catch (error) {
      logger.error('Error sending error message', { phoneNumber, error });
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

