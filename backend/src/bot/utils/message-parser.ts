import { WhatsAppWebhookPayload } from '../../integrations/whatsapp/types';

export interface ParsedMessage {
  text: string;
  command?: string;
  isCommand: boolean;
  originalPayload: WhatsAppWebhookPayload;
}

export function parseMessage(payload: WhatsAppWebhookPayload): ParsedMessage {
  const text = (payload.body || '').trim();
  const upperText = text.toUpperCase();

  // Common commands
  const commands = [
    'HELP',
    'STOP',
    'UNSUBSCRIBE',
    'SETTINGS',
    'CHANGE_REMINDER',
    'START',
    'עזרה',
    'ביטול',
    'הגדרות',
  ];

  const isCommand = commands.some((cmd) => upperText === cmd || upperText.startsWith(cmd + ' '));
  const command = isCommand ? upperText.split(' ')[0] : undefined;

  return {
    text,
    command,
    isCommand,
    originalPayload: payload,
  };
}

