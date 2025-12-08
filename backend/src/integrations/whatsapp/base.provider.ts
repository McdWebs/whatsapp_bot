import { WhatsAppProvider, SendMessageResult, WhatsAppWebhookPayload } from './types';
import { logger } from '../../utils/logger';

export abstract class BaseWhatsAppProvider implements WhatsAppProvider {
  abstract sendTemplateMessage(
    to: string,
    templateName: string,
    params?: string[]
  ): Promise<SendMessageResult>;

  abstract verifyWebhookSignature(payload: any, signature: string): boolean;

  abstract parseWebhookPayload(payload: any): WhatsAppWebhookPayload;

  protected normalizePhoneNumber(phone: string): string {
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

  protected logError(operation: string, error: any, context?: Record<string, any>): void {
    const errorDetails: any = {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      ...context,
    };

    // Include Twilio-specific error details if available
    if (error?.code) {
      errorDetails.code = error.code;
    }
    if (error?.status) {
      errorDetails.status = error.status;
    }
    if (error?.moreInfo) {
      errorDetails.moreInfo = error.moreInfo;
    }
    if (error?.twilioError) {
      errorDetails.twilioError = error.twilioError;
    }

    logger.error(`WhatsApp provider error: ${operation}`, errorDetails);
  }
}

