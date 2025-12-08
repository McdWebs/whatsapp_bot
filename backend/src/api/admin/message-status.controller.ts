import { Request, Response } from 'express';
import twilio from 'twilio';
import { config } from '../../config';
import { logger } from '../../utils/logger';

export const messageStatusController = {
  async getMessageStatus(req: Request, res: Response): Promise<void> {
    try {
      const { messageSid } = req.params;

      if (!messageSid) {
        res.status(400).json({ error: 'Message SID is required' });
        return;
      }

      if (!config.whatsapp.twilio) {
        res.status(500).json({ error: 'Twilio configuration is missing' });
        return;
      }

      const client = twilio(
        config.whatsapp.twilio.accountSid,
        config.whatsapp.twilio.authToken
      );

      const message = await client.messages(messageSid).fetch();

      res.json({
        sid: message.sid,
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
        price: message.price,
        priceUnit: message.priceUnit,
        uri: message.uri,
      });
    } catch (error) {
      logger.error('Error fetching message status', { error });
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Internal server error',
      });
    }
  },
};

