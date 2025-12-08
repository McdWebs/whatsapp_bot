import { Request, Response } from 'express';
import { whatsappMessageService } from '../../integrations/whatsapp/message.service';
import { userRepository } from '../../db/repositories/user.repository';
import { historyRepository } from '../../db/repositories/history.repository';
import { logger } from '../../utils/logger';
import { ReminderType } from '../../db/repositories/reminder.repository';

export const messageController = {
  async sendMessage(req: Request, res: Response): Promise<void> {
    try {
      const { userId, phoneNumber, message, templateName, templateParams } = req.body;

      if (!phoneNumber && !userId) {
        res.status(400).json({ error: 'Either userId or phoneNumber is required' });
        return;
      }

      // Get phone number from user if userId provided
      let targetPhoneNumber = phoneNumber;
      if (userId && !phoneNumber) {
        const user = await userRepository.findById(userId);
        if (!user) {
          res.status(404).json({ error: 'User not found' });
          return;
        }
        targetPhoneNumber = user.phone_number;
      }

      if (!targetPhoneNumber) {
        res.status(400).json({ error: 'Phone number is required' });
        return;
      }

      // Check if we should send a regular message (24-hour window) or template
      const sendRegular = req.body.sendRegular === true || req.body.sendRegular === 'true';
      
      let result: any;
      
      if (sendRegular && message) {
        // Send regular message (works within 24-hour window, no template needed)
        result = await whatsappMessageService.sendRegularMessage(
          targetPhoneNumber,
          message
        );
      } else {
        // Use template if provided, otherwise use custom message
        const template = templateName || 'welcome';
        // Only send params if template actually needs them
        // Welcome template typically has no variables, so don't send empty params
        const params = templateParams || (message && message.trim() ? [message] : []);

        // Send message
        result = await whatsappMessageService.sendTemplateMessageWithRetry(
          targetPhoneNumber,
          template,
          params
        );
      }

      if (result.success) {
        // Log to history if userId provided
        if (userId) {
          await historyRepository.create({
            user_id: userId,
            type: 'custom' as ReminderType,
            delivery_status: (result as any).status === 'delivered' ? 'delivered' : 'sent',
            reminder_time: new Date().toISOString(),
          });
        }

        res.json({
          success: true,
          messageId: result.messageId,
          message: 'Message sent successfully',
          status: (result as any).status || 'queued',
          note: (result as any).status === 'queued' 
            ? 'Message is queued. Delivery may take a few moments. Check status in Twilio Console or use /admin/messages/status/:messageSid endpoint.' 
            : undefined,
          checkStatusUrl: result.messageId 
            ? `/admin/messages/status/${result.messageId}` 
            : undefined,
        });
      } else {
        // Return detailed error message
        const errorMessage = result.error || 'Failed to send message';
        logger.error('Failed to send message from admin', {
          targetPhoneNumber,
          sendRegular,
          templateName: sendRegular ? 'regular' : templateName,
          error: errorMessage,
        });
        
        res.status(500).json({
          success: false,
          error: errorMessage,
          details: 'Check server logs for more information',
        });
      }
    } catch (error) {
      logger.error('Error sending message from admin', { error });
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      });
    }
  },
};

