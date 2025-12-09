import { WhatsAppWebhookPayload } from '../integrations/whatsapp/types';
import { stateMachine } from './state-machine';
import { userRepository } from '../db/repositories/user.repository';
import { UserState } from './states/index';
import { logger } from '../utils/logger';
import { parseMessage } from './utils/message-parser';

export class MessageHandler {
  async handleMessage(payload: WhatsAppWebhookPayload): Promise<void> {
    try {
      const phoneNumber = this.normalizePhoneNumber(payload.from);

      // Find or create user
      let user = await userRepository.findByPhoneNumber(phoneNumber);

      if (!user) {
        // Create new user
        user = await userRepository.create({
          phone_number: phoneNumber,
          current_state: UserState.INITIAL,
        });
        logger.info('New user created', { userId: user.id, phoneNumber });
      }

      // Parse message
      const parsed = parseMessage(payload);

      // Handle commands that bypass state machine
      if (parsed.isCommand && parsed.command) {
        await this.handleCommand(user.id, phoneNumber, parsed.command, parsed.text);
        return;
      }

      // Process through state machine
      logger.info('Processing message through state machine', {
        userId: user.id,
        phoneNumber,
        currentState: user.current_state,
        messageText: parsed.text,
      });
      await stateMachine.processMessage(user.id, phoneNumber, parsed.text);
      logger.info('Message processed successfully', {
        userId: user.id,
        phoneNumber,
      });
    } catch (error) {
      logger.error('Error handling message', {
        payload,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
    }
  }

  private async handleCommand(
    userId: string,
    phoneNumber: string,
    command: string,
    fullText: string
  ): Promise<void> {
    // Commands that need special handling can be added here
    // For now, let the state machine handle most commands
    logger.info('Command received', { userId, phoneNumber, command, fullText });
  }

  private normalizePhoneNumber(phone: string): string {
    // Remove any non-digit characters except +
    let normalized = phone.replace(/[^\d+]/g, '');

    // If it doesn't start with +, assume it needs country code
    if (!normalized.startsWith('+')) {
      // Default to Israel country code if no + prefix
      if (normalized.startsWith('0')) {
        normalized = '+972' + normalized.substring(1);
      } else {
        normalized = '+972' + normalized;
      }
    }

    return normalized;
  }
}

export const messageHandler = new MessageHandler();

