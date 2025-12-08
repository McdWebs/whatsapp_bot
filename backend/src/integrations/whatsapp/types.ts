export interface WhatsAppMessage {
  from: string; // Phone number
  to: string;
  body?: string;
  type: 'text' | 'template' | 'interactive';
  templateName?: string;
  templateParams?: string[];
  messageId?: string;
}

export interface WhatsAppWebhookPayload {
  messageId: string;
  from: string;
  to: string;
  body: string;
  timestamp: string;
  type: string;
  [key: string]: any; // Provider-specific fields
}

export interface SendMessageResult {
  success: boolean;
  messageId?: string;
  error?: string;
  status?: string; // Message status from provider (queued, sent, delivered, failed)
}

export interface WhatsAppProvider {
  sendTemplateMessage(
    to: string,
    templateName: string,
    params?: string[]
  ): Promise<SendMessageResult>;
  sendMenu(to: string, title: string, options: string[]): Promise<SendMessageResult>;
  verifyWebhookSignature(payload: any, signature: string): boolean;
  parseWebhookPayload(payload: any): WhatsAppWebhookPayload;
}

