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

  async sendMenu(to: string, title: string, options: string[]): Promise<SendMessageResult> {
    const normalizedTo = this.normalizePhoneNumber(to);
    let normalizedFrom = this.fromNumber;
    if (!normalizedFrom.startsWith('whatsapp:')) {
      const phoneOnly = this.normalizePhoneNumber(this.fromNumber);
      normalizedFrom = `whatsapp:${phoneOnly}`;
    }

    try {
      // Format menu with emoji indicators
      const optionsText = options
        .map((option, index) => {
          const emoji = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣'][index] || `${index + 1}.`;
          return `${emoji} ${option}`;
        })
        .join('\n');

      const menuBody = `${title}\n\n${optionsText}\n\nReply with the number.`;

      logger.info('Sending Twilio WhatsApp menu', {
        from: normalizedFrom,
        to: normalizedTo,
        title,
        optionsCount: options.length,
      });

      // Send as regular text message (not template)
      const message = await this.client.messages.create({
        from: normalizedFrom,
        to: `whatsapp:${normalizedTo}`,
        body: menuBody,
      });

      logger.info('Twilio menu sent successfully', {
        messageSid: message.sid,
        status: message.status,
      });

      return {
        success: true,
        messageId: message.sid,
      };
    } catch (error: any) {
      const errorMessage = error?.message || error?.toString() || 'Unknown error';
      const errorCode = error?.code;
      const errorStatus = error?.status;

      logger.error('Twilio sendMenu error', {
        to,
        normalizedTo,
        normalizedFrom,
        title,
        errorMessage,
        errorCode,
        errorStatus,
        errorStack: error?.stack,
      });

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

      // Common Twilio WhatsApp error codes for templates
      const errorCodeNum = message.errorCode ? Number(message.errorCode) : null;
      const errorMessages: Record<number, string> = {
        63016: 'Template not found or not approved. Check Content SID and approval status in Twilio Console.',
        63051: 'Message outside 24-hour window. Recipient must message you first, or use an approved template.',
        21211: 'Invalid "To" phone number. Check phone number format.',
        21608: 'Invalid "From" phone number. Verify WhatsApp number is correct and enabled.',
        21614: 'WhatsApp number not enabled. Enable WhatsApp in Twilio Console.',
        30008: 'Message delivery failed. Check recipient number and Twilio account status.',
      };

      if (errorCodeNum && errorMessages[errorCodeNum]) {
        logger.warn('Twilio template error code detected', {
          messageSid: message.sid,
          errorCode: message.errorCode,
          errorMessage: errorMessages[errorCodeNum],
          templateId,
        });
      }

      // Consider queued/sending as success (delivery will be confirmed later)
      const isSuccess = message.status !== 'failed' && 
                       !message.errorCode &&
                       (message.status === 'queued' || 
                        message.status === 'sending' || 
                        message.status === 'sent' ||
                        message.status === 'delivered');
      
      return {
        success: isSuccess,
        messageId: message.sid,
        status: message.status,
        error: message.errorMessage || 
               (errorCodeNum && errorMessages[errorCodeNum]) ||
               (message.status === 'failed' ? 'Message failed' : undefined),
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

      // Log full response with all available fields
      const fullResponse = {
        messageSid: twilioMessage.sid,
        status: twilioMessage.status,
        to: twilioMessage.to,
        from: twilioMessage.from,
        body: twilioMessage.body,
        errorCode: twilioMessage.errorCode,
        errorMessage: twilioMessage.errorMessage,
        dateCreated: twilioMessage.dateCreated,
        dateSent: twilioMessage.dateSent,
        dateUpdated: twilioMessage.dateUpdated,
        direction: twilioMessage.direction,
        numMedia: twilioMessage.numMedia,
        numSegments: twilioMessage.numSegments,
        price: twilioMessage.price,
        priceUnit: twilioMessage.priceUnit,
        uri: twilioMessage.uri,
        accountSid: twilioMessage.accountSid,
      };
      
      logger.info('Regular WhatsApp message sent - Full response', fullResponse);

      // Check for specific error codes (errorCode is a number in Twilio)
      const errorCodeNum = twilioMessage.errorCode ? Number(twilioMessage.errorCode) : null;
      
      // Common Twilio WhatsApp error codes
      const errorMessages: Record<number, string> = {
        63016: 'Template not found or not approved. Check template ID and approval status in Twilio Console.',
        63051: 'Message outside 24-hour window. Recipient must message you first, or use an approved template.',
        21211: 'Invalid "To" phone number. Check phone number format.',
        21608: 'Invalid "From" phone number. Verify WhatsApp number is correct and enabled.',
        21614: 'WhatsApp number not enabled. Enable WhatsApp in Twilio Console.',
        30008: 'Message delivery failed. Check recipient number and Twilio account status.',
      };

      if (errorCodeNum && errorMessages[errorCodeNum]) {
        logger.warn('Twilio error code detected', {
          messageSid: twilioMessage.sid,
          errorCode: twilioMessage.errorCode,
          errorMessage: errorMessages[errorCodeNum],
        });
      }

      // Consider queued/sending as success (delivery will be confirmed later)
      // Status can be: queued, sending, sent, delivered, undelivered, failed
      const isSuccess = twilioMessage.status !== 'failed' && 
                       twilioMessage.status !== 'undelivered' && 
                       !twilioMessage.errorCode &&
                       (twilioMessage.status === 'queued' || 
                        twilioMessage.status === 'sending' || 
                        twilioMessage.status === 'sent' ||
                        twilioMessage.status === 'delivered');

      // Build error message
      let errorMsg: string | undefined;
      if (twilioMessage.errorMessage) {
        errorMsg = twilioMessage.errorMessage;
      } else if (errorCodeNum && errorMessages[errorCodeNum]) {
        errorMsg = errorMessages[errorCodeNum];
      } else if (twilioMessage.status === 'failed') {
        errorMsg = 'Message failed to send';
      } else if (twilioMessage.status === 'undelivered') {
        errorMsg = 'Message undelivered. This usually means the recipient is not available or the 24-hour window has expired.';
      }

      return {
        success: isSuccess,
        messageId: twilioMessage.sid,
        status: twilioMessage.status,
        error: errorMsg,
      };
    } catch (error: any) {
      // Extract detailed Twilio error information
      const errorMessage = error?.message || error?.toString() || 'Unknown error';
      const errorCode = error?.code;
      const errorStatus = error?.status;
      const errorMoreInfo = error?.moreInfo;
      
      // Get all error properties
      const allErrorProps: any = {};
      if (error) {
        Object.getOwnPropertyNames(error).forEach(prop => {
          try {
            allErrorProps[prop] = (error as any)[prop];
          } catch (e) {
            allErrorProps[prop] = '[Unable to serialize]';
          }
        });
      }
      
      // Log detailed error information - this is critical for debugging
      // Log each piece separately to ensure it shows up in logs
      logger.error('Twilio sendRegularMessage error - DETAILED', {
        to,
        normalizedTo,
        normalizedFrom,
        messageLength: message.length,
      });
      logger.error('Twilio error message', { errorMessage });
      logger.error('Twilio error code', { errorCode });
      logger.error('Twilio error status', { errorStatus });
      logger.error('Twilio error moreInfo', { errorMoreInfo });
      logger.error('Twilio error name', { errorName: error?.name });
      logger.error('Twilio error stack', { errorStack: error?.stack });
      logger.error('Twilio error type', { errorType: typeof error });
      logger.error('Twilio error constructor', { errorConstructor: error?.constructor?.name });
      
      // Try to stringify the entire error
      try {
        const errorStr = JSON.stringify(error, Object.getOwnPropertyNames(error), 2);
        logger.error('Twilio full error JSON', { fullError: errorStr });
      } catch (e) {
        logger.error('Could not stringify error', { stringifyError: String(e) });
      }
      
      // Log all error properties one by one
      if (error && typeof error === 'object') {
        Object.getOwnPropertyNames(error).forEach(prop => {
          try {
            const value = (error as any)[prop];
            if (typeof value !== 'function') {
              logger.error(`Twilio error property: ${prop}`, { [prop]: value });
            }
          } catch (e) {
            // Skip if can't access
          }
        });
      }
      
      // Also log via the base class method for consistency
      this.logError('sendRegularMessage', error, { to, message });
      
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

