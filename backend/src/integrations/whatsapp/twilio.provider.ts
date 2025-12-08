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
      // Get template ID from config, fallback to welcome if not found
      let templateId = config.whatsapp.templates[templateName as keyof typeof config.whatsapp.templates];
      
      // If template not found or is a placeholder, use welcome template
      if (!templateId || templateId.includes('_template_id') || templateId === 'welcome') {
        templateId = config.whatsapp.templates.welcome;
        logger.warn(`Template ${templateName} not configured, using welcome template`, {
          requestedTemplate: templateName,
          usingTemplate: 'welcome',
        });
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
      // IMPORTANT: Only send contentVariables if the template actually has variables
      // Sending variables to a template without variables will cause error 63016
      if (params && params.length > 0 && params.some(p => p && p.trim())) {
        messagePayload.contentVariables = JSON.stringify(
          params.reduce((acc, param, index) => {
            if (param && param.trim()) {
              acc[`${index + 1}`] = param.trim();
            }
            return acc;
          }, {} as Record<string, string>)
        );
        
        logger.info('Adding content variables to template', {
          templateId,
          variables: messagePayload.contentVariables,
        });
      } else {
        logger.info('No content variables - template likely has no variables', {
          templateId,
          paramsProvided: params?.length || 0,
        });
      }

      logger.info('Sending Twilio message with payload', {
        payload: JSON.stringify(messagePayload, null, 2),
      });

      const message = await this.client.messages.create(messagePayload);

      // Log full response with all available fields
      const fullResponse = {
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
        subresourceUris: message.subresourceUris,
        messagingServiceSid: (message as any).messagingServiceSid,
        // Additional Twilio fields that might contain error info
        statusCallback: (message as any).statusCallback,
        statusCallbackMethod: (message as any).statusCallbackMethod,
      };
      
      logger.info('Twilio message sent - Full response', fullResponse);
      
      // Log warning if status indicates potential issues or if there are error codes
      if (message.errorCode || message.errorMessage) {
        logger.error('Twilio message has error code/message', {
          messageSid: message.sid,
          status: message.status,
          errorCode: message.errorCode,
          errorMessage: message.errorMessage,
          from: message.from,
          to: message.to,
          fullResponse: JSON.stringify(fullResponse, null, 2),
        });
      } else if (message.status === 'queued' || message.status === 'sending') {
        logger.warn('Message is queued/sending - may take time to deliver', {
          messageSid: message.sid,
          status: message.status,
          from: message.from,
          to: message.to,
          note: 'For purchased numbers, ensure template is approved and webhook is configured. Check Twilio Console for delivery status.',
        });
      }

      // Check if message was actually sent successfully
      const isSuccess = message.status !== 'failed' && !message.errorCode;
      
      return {
        success: isSuccess,
        messageId: message.sid,
        status: message.status,
        error: message.errorMessage || (message.status === 'failed' ? 'Message failed' : undefined),
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

  async sendRegularMessage(
    to: string,
    message: string
  ): Promise<SendMessageResult> {
    const normalizedTo = this.normalizePhoneNumber(to);
    let normalizedFrom = this.fromNumber;
    if (!normalizedFrom.startsWith('whatsapp:')) {
      const phoneOnly = this.normalizePhoneNumber(this.fromNumber);
      normalizedFrom = `whatsapp:${phoneOnly}`;
    }

    try {
      logger.info('Sending regular WhatsApp message (24-hour window)', {
        from: normalizedFrom,
        to: normalizedTo,
        messageLength: message.length,
      });

      // Use regular body parameter for messages within 24-hour window
      const messagePayload = {
        from: normalizedFrom,
        to: `whatsapp:${normalizedTo}`,
        body: message,
      };

      const twilioMessage = await this.client.messages.create(messagePayload);

      logger.info('Regular WhatsApp message sent', {
        messageSid: twilioMessage.sid,
        status: twilioMessage.status,
        to: twilioMessage.to,
        from: twilioMessage.from,
        errorCode: twilioMessage.errorCode,
        errorMessage: twilioMessage.errorMessage,
      });

      // Check for specific error codes (errorCode is a number in Twilio)
      const errorCodeNum = twilioMessage.errorCode ? Number(twilioMessage.errorCode) : null;
      if (errorCodeNum === 63051 || errorCodeNum === 63016) {
        logger.warn('Message outside 24-hour window - template required', {
          messageSid: twilioMessage.sid,
          errorCode: twilioMessage.errorCode,
          note: 'Recipient must message you first, or use an approved template',
        });
      }

      return {
        success: twilioMessage.status !== 'failed' && !twilioMessage.errorCode,
        messageId: twilioMessage.sid,
        status: twilioMessage.status,
        error: twilioMessage.errorMessage || (errorCodeNum === 63051 
          ? 'Message outside 24-hour window. Recipient must message you first, or use an approved template.' 
          : undefined),
      };
    } catch (error: any) {
      this.logError('sendRegularMessage', error, { to, message });
      return {
        success: false,
        error: error?.message || 'Failed to send regular message',
      };
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

}

