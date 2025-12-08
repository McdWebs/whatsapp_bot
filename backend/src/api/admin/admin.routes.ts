import express from 'express';
import { statsController } from './stats.controller';
import { exportController } from './export.controller';
import { messageController } from './message.controller';
import { messageStatusController } from './message-status.controller';

export const adminRouter = express.Router();

// Stats endpoints
adminRouter.get('/stats', statsController.getStats);
adminRouter.get('/stats/reminders', statsController.getReminderStats);
adminRouter.get('/stats/users', statsController.getUserStats);

// User management
adminRouter.get('/users', statsController.getUsers);
adminRouter.get('/users/recent', statsController.getRecentUsers);
adminRouter.get('/users/:id', statsController.getUserById);

// Message endpoints
adminRouter.post('/messages/send', messageController.sendMessage);
adminRouter.get('/messages/status/:messageSid', messageStatusController.getMessageStatus);

// Export endpoints
adminRouter.post('/export/sheets', exportController.exportToSheets);

