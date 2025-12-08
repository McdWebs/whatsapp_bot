import twilio from 'twilio';
import crypto from 'crypto';
import { config } from '../../config';
import { BaseWhatsAppProvider } from './base.provider';
import { SendMessageResult, WhatsAppWebhookPayload } from './types';
import { logger } from '../../utils/logger';

export class TwilioProvider extends BaseWhatsAppProvider {
  private client: twilio.Twilio;
  private webhookSecret: string;
  private fromNumber: string;

  constructor() {
    super();
    if (!config.whatsapp.twilio) {
      throw new Error('Twilio configuration is missing');
    }
    this.client = twilio(config.whatsapp.twilio.accountSid, config.whatsapp.twilio.authToken);
    this.webhookSecret = config.whatsapp.twilio.webhookSecret;
    this.fromNumber = config.whatsapp.twilio.from;
  }

  async sendTemplateMessage(
    to: string,
    templateName: string,
    params: string[] = []
  ): Promise<SendMessageResult> {
    const normalizedTo = this.normalizePhoneNumber(to);
    // Ensure "from" has whatsapp: prefix for WhatsApp messages
    let normalizedFrom = this.fromNumber;
    if (!normalizedFrom.startsWith('whatsapp:')) {
      const phoneOnly = this.normalizePhoneNumber(this.fromNumber);
      normalizedFrom = `whatsapp:${phoneOnly}`;
    }

    try {
      // Get template ID from config
      const templateId = config.whatsapp.templates[templateName as keyof typeof config.whatsapp.templates];
      
      if (!templateId) {
        throw new Error(`Template ID not found for: ${templateName}`);
      }

      logger.info('Attempting to send Twilio WhatsApp message', {
        from: normalizedFrom,
        to: normalizedTo,
        templateName,
        templateId,
      });

      // Use Content SID for WhatsApp templates
      const messagePayload: any = {
        from: normalizedFrom,
        to: `whatsapp:${normalizedTo}`,
        contentSid: templateId,
      };

      // Add content variables if params provided
      if (params && params.length > 0) {
        messagePayload.contentVariables = JSON.stringify(
          params.reduce((acc, param, index) => {
            acc[`${index + 1}`] = param;
            return acc;
          }, {} as Record<string, string>)
        );
      }

      logger.info('Sending Twilio message with payload', {
        payload: JSON.stringify(messagePayload, null, 2),
      });

      const message = await this.client.messages.create(messagePayload);

      logger.info('Twilio message sent - Full response', {
        messageSid: message.sid,
        status: message.status,
        to: message.to,
        from: message.from,
        body: message.body,
        errorCode: message.errorCode,
        errorMessage: message.errorMessage,
        dateCreated: message.dateCreated,
        dateSent: message.dateSent,
        dateUpdated: message.dateUpdated,
        direction: message.direction,
        numMedia: message.numMedia,
        numSegments: message.numSegments,
        price: message.price,
        priceUnit: message.priceUnit,
        uri: message.uri,
        accountSid: message.accountSid,
      });

      return {
        success: true,
        messageId: message.sid,
      };
    } catch (error: any) {
      // Extract Twilio error details
      const errorMessage = error?.message || error?.toString() || 'Unknown error';
      const errorCode = error?.code;
      const errorStatus = error?.status;
      const errorMoreInfo = error?.moreInfo;
      
      // Log detailed error information
      logger.error('Twilio sendTemplateMessage error', {
        to,
        normalizedTo,
        normalizedFrom,
        templateName,
        errorMessage,
        errorCode,
        errorStatus,
        errorMoreInfo,
        errorStack: error?.stack,
        errorDetails: JSON.stringify(error, Object.getOwnPropertyNames(error)),
      });
      
      // Build user-friendly error message
      let userError = errorMessage;
      if (errorCode) {
        userError += ` (Code: ${errorCode})`;
      }
      if (errorStatus) {
        userError += ` (Status: ${errorStatus})`;
      }
      
      return {
        success: false,
        error: userError,
      };
    }
  }

  verifyWebhookSignature(payload: any, signature: string): boolean {
    try {
      // Twilio signature verification
      const data = JSON.stringify(payload);
      const hmac = crypto.createHmac('sha1', this.webhookSecret);
      hmac.update(data);
      const computedSignature = hmac.digest('base64');

      return crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(computedSignature)
      );
    } catch (error) {
      this.logError('verifyWebhookSignature', error);
      return false;
    }
  }

  parseWebhookPayload(payload: any): WhatsAppWebhookPayload {
    return {
      messageId: payload.MessageSid || payload.SmsSid || '',
      from: payload.From || payload.From || '',
      to: payload.To || payload.To || '',
      body: payload.Body || payload.Body || '',
      timestamp: payload.DateSent || new Date().toISOString(),
      type: payload.MessageType || 'text',
      ...payload,
    };
  }

  private buildTemplateMessage(templateName: string, params: string[]): string {
    // For Twilio, we'll use a simple text format with template parameters
    // In production, you should use Twilio's Content API for approved templates
    const templates: Record<string, (params: string[]) => string> = {
      welcome: () => 'Welcome! I can help you set up reminders for sunset, candle-lighting, and prayer times.',
      reminder: (p) => `Reminder: ${p[0] || 'Your reminder'} at ${p[1] || 'the scheduled time'}`,
      confirmation: (p) => `Your reminder for ${p[0] || 'this event'} has been set!`,
      help: () => 'Available commands: HELP, STOP, SETTINGS, CHANGE_REMINDER',
    };

    const template = templates[templateName];
    if (template) {
      return template(params);
    }

    // Fallback: use template name and params
    return `${templateName}${params.length > 0 ? ': ' + params.join(', ') : ''}`;
  }
}

