import { BaseWhatsAppProvider } from './base.provider';
import {
  SendMessageResult,
  WhatsAppWebhookPayload,
  InteractiveButton,
  InteractiveListItem,
} from './types';
import { logger } from '../../utils/logger';

/**
 * Mock WhatsApp Provider for development/testing
 * Returns successful responses without actually sending messages
 */
export class MockProvider extends BaseWhatsAppProvider {
  async sendTemplateMessage(
    to: string,
    templateName: string,
    params: string[] = []
  ): Promise<SendMessageResult> {
    const normalizedTo = this.normalizePhoneNumber(to);
    
    logger.info('🔧 [MOCK] Sending WhatsApp message (not actually sent)', {
      to: normalizedTo,
      templateName,
      params,
    });

    // Simulate successful message send
    return {
      success: true,
      messageId: `mock_${Date.now()}_${Math.random().toString(36).substring(7)}`,
    };
  }

  verifyWebhookSignature(payload: any, signature: string): boolean {
    // In mock mode, always return true for development
    logger.info('🔧 [MOCK] Webhook signature verification (always true in mock mode)');
    return true;
  }

  async sendInteractiveMessage(
    to: string,
    body: string,
    buttons?: InteractiveButton[],
    listItems?: InteractiveListItem[]
  ): Promise<SendMessageResult> {
    const normalizedTo = this.normalizePhoneNumber(to);

    logger.info('🔧 [MOCK] Sending interactive WhatsApp message (not actually sent)', {
      to: normalizedTo,
      body,
      buttons: buttons?.length || 0,
      listItems: listItems?.length || 0,
    });

    // Simulate successful message send
    return {
      success: true,
      messageId: `mock_interactive_${Date.now()}_${Math.random().toString(36).substring(7)}`,
    };
  }

  parseWebhookPayload(payload: any): WhatsAppWebhookPayload {
    return {
      messageId: payload.MessageSid || payload.messageId || `mock_${Date.now()}`,
      from: payload.From || payload.from || '',
      to: payload.To || payload.to || '',
      body: payload.Body || payload.body || payload.text || '',
      timestamp: payload.DateSent || payload.timestamp || new Date().toISOString(),
      type: payload.MessageType || payload.type || 'text',
      ...payload,
    };
  }
}

