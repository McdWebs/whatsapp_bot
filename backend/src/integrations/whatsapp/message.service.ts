import { config } from '../../config';
import { TwilioProvider } from './twilio.provider';
import { WhatsAppProvider, SendMessageResult } from './types';
import { logger } from '../../utils/logger';

export class WhatsAppMessageService {
  private provider: WhatsAppProvider;

  constructor() {
    switch (config.whatsapp.provider) {
      case 'twilio':
        this.provider = new TwilioProvider();
        break;
      case '360dialog':
        // TODO: Implement 360dialog provider
        throw new Error('360dialog provider not yet implemented');
      case 'messagebird':
        // TODO: Implement MessageBird provider
        throw new Error('MessageBird provider not yet implemented');
      default:
        throw new Error(`Unknown WhatsApp provider: ${config.whatsapp.provider}`);
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

  verifyWebhookSignature(payload: any, signature: string): boolean {
    return this.provider.verifyWebhookSignature(payload, signature);
  }

  async sendMenu(to: string, title: string, options: string[]): Promise<SendMessageResult> {
    try {
      const result = await this.provider.sendMenu(to, title, options);
      return result;
    } catch (error) {
      logger.error('Error sending WhatsApp menu', {
        to,
        title,
        error: error instanceof Error ? error.message : String(error),
      });
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Send a regular text message (works within 24-hour window after user messages you)
   * Use this for responses to incoming messages instead of templates
   */
  async sendRegularMessage(to: string, message: string): Promise<SendMessageResult> {
    try {
      if (this.provider instanceof TwilioProvider) {
        return await (this.provider as TwilioProvider).sendRegularMessage(to, message);
      }
      // Fallback for other providers - use template
      logger.warn('sendRegularMessage not implemented for provider, using template', {
        provider: config.whatsapp.provider,
      });
      return await this.sendTemplateMessage(to, 'welcome', [message]);
    } catch (error) {
      logger.error('Error sending regular WhatsApp message', {
        to,
        messageLength: message.length,
        error: error instanceof Error ? error.message : String(error),
      });
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Smart message sender - uses regular message if possible, falls back to template
   * Use this for responses to incoming messages (within 24-hour window)
   */
  async sendResponseMessage(
    to: string,
    message: string,
    fallbackToTemplate = true
  ): Promise<SendMessageResult> {
    // Try regular message first (works within 24-hour window)
    const regularResult = await this.sendRegularMessage(to, message);
    
    if (regularResult.success) {
      return regularResult;
    }

    // Check if error is due to 24-hour window (error code 63051 or 63016)
    const is24HourWindowError = regularResult.error?.includes('63051') || 
                                 regularResult.error?.includes('63016') ||
                                 regularResult.error?.toLowerCase().includes('24-hour');

    if (is24HourWindowError && fallbackToTemplate) {
      logger.warn('Regular message failed (outside 24-hour window), falling back to template', {
        to,
        error: regularResult.error,
      });
      // Fallback to template message
      return await this.sendTemplateMessage(to, 'welcome', [message]);
    }

    return regularResult;
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

