import { config } from '../../config';
import { TwilioProvider } from './twilio.provider';
import { MockProvider } from './mock.provider';
import {
  WhatsAppProvider,
  SendMessageResult,
  InteractiveButton,
  InteractiveListItem,
} from './types';
import { logger } from '../../utils/logger';

export class WhatsAppMessageService {
  private provider: WhatsAppProvider;

  constructor() {
    // Check if we should use mock mode
    const isMockMode = process.env.USE_MOCK === 'true' || 
      (process.env.NODE_ENV === 'development' && process.env.USE_MOCK !== 'false');
    
    if (isMockMode) {
      logger.info('🔧 Using Mock WhatsApp Provider (no actual messages will be sent)');
      this.provider = new MockProvider();
      return;
    }

    switch (config.whatsapp.provider) {
      case 'twilio':
        try {
          this.provider = new TwilioProvider();
        } catch (error) {
          logger.warn('Failed to initialize Twilio provider, falling back to Mock provider', {
            error: error instanceof Error ? error.message : String(error),
          });
          this.provider = new MockProvider();
        }
        break;
      case '360dialog':
        // TODO: Implement 360dialog provider
        throw new Error('360dialog provider not yet implemented');
      case 'messagebird':
        // TODO: Implement MessageBird provider
        throw new Error('MessageBird provider not yet implemented');
      default:
        logger.warn(`Unknown WhatsApp provider: ${config.whatsapp.provider}, using Mock provider`);
        this.provider = new MockProvider();
    }
  }

  async sendTemplateMessage(
    to: string,
    templateName: string,
    params: string[] = []
  ): Promise<SendMessageResult> {
    try {
      const result = await this.provider.sendTemplateMessage(to, templateName, params);
      return result;
    } catch (error) {
      logger.error('Error sending WhatsApp template message', {
        to,
        templateName,
        error: error instanceof Error ? error.message : String(error),
      });
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  async sendTemplateMessageWithRetry(
    to: string,
    templateName: string,
    params: string[] = [],
    maxRetries = 3
  ): Promise<SendMessageResult> {
    let lastError: SendMessageResult | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      const result = await this.sendTemplateMessage(to, templateName, params);

      if (result.success) {
        if (attempt > 1) {
          logger.info('WhatsApp message sent after retry', {
            to,
            templateName,
            attempt,
          });
        }
        return result;
      }

      lastError = result;

      if (attempt < maxRetries) {
        // Exponential backoff: 1s, 2s, 4s
        const delay = Math.pow(2, attempt - 1) * 1000;
        logger.warn('WhatsApp message send failed, retrying', {
          to,
          templateName,
          attempt,
          delay,
          error: result.error,
        });
        await this.sleep(delay);
      }
    }

    logger.error('WhatsApp message send failed after all retries', {
      to,
      templateName,
      maxRetries,
      error: lastError?.error,
    });

    return lastError || {
      success: false,
      error: 'Failed after all retries',
    };
  }

  async sendInteractiveMessage(
    to: string,
    body: string,
    buttons?: InteractiveButton[],
    listItems?: InteractiveListItem[]
  ): Promise<SendMessageResult> {
    try {
      const result = await this.provider.sendInteractiveMessage(to, body, buttons, listItems);
      return result;
    } catch (error) {
      logger.error('Error sending interactive WhatsApp message', {
        to,
        error: error instanceof Error ? error.message : String(error),
      });
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  verifyWebhookSignature(payload: any, signature: string): boolean {
    return this.provider.verifyWebhookSignature(payload, signature);
  }

  parseWebhookPayload(payload: any) {
    return this.provider.parseWebhookPayload(payload);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => {
      if (typeof setTimeout !== 'undefined') {
        setTimeout(resolve, ms);
      } else {
        // Fallback for environments without setTimeout
        resolve();
      }
    });
  }
}

export const whatsappMessageService = new WhatsAppMessageService();

