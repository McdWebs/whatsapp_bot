import express, { Request, Response } from 'express';
import { whatsappMessageService } from '../../integrations/whatsapp/message.service';
import { messageHandler } from '../../bot/message-handler';
import { logger } from '../../utils/logger';

export const whatsappWebhookRouter = express.Router();

// Webhook endpoint for receiving WhatsApp messages
whatsappWebhookRouter.post('/', async (req: Request, res: Response) => {
  try {
    // Verify webhook signature if provided
    const signature = req.headers['x-twilio-signature'] || req.headers['x-signature'] || '';
    if (signature && typeof signature === 'string') {
      const isValid = whatsappMessageService.verifyWebhookSignature(req.body, signature);
      if (!isValid) {
        logger.warn('Invalid webhook signature', { ip: req.ip });
        return res.status(401).json({ error: 'Invalid signature' });
      }
    }

    // Parse webhook payload
    const payload = whatsappMessageService.parseWebhookPayload(req.body);

    logger.info('Received WhatsApp webhook', {
      from: payload.from,
      to: payload.to,
      type: payload.type,
    });

    // Handle the message asynchronously
    messageHandler.handleMessage(payload).catch((error) => {
      logger.error('Error handling WhatsApp message', {
        payload,
        error: error instanceof Error ? error.message : String(error),
      });
    });

    // Respond immediately to WhatsApp
    res.status(200).json({ status: 'ok' });
  } catch (error) {
    logger.error('Error processing WhatsApp webhook', {
      error: error instanceof Error ? error.message : String(error),
      body: req.body,
    });
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Webhook verification endpoint (for some providers)
whatsappWebhookRouter.get('/', (req: Request, res: Response) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  // Simple verification - in production, use proper token validation
  if (mode === 'subscribe' && token) {
    logger.info('Webhook verification request', { mode, token });
    res.status(200).send(challenge);
  } else {
    res.status(403).send('Forbidden');
  }
});

