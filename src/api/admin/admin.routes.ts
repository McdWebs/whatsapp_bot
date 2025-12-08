import express from 'express';
import { adminAuthMiddleware } from './admin.middleware';
import { statsController } from './stats.controller';
import { exportController } from './export.controller';
import { messageController } from './message.controller';

export const adminRouter = express.Router();

// All admin routes require authentication
adminRouter.use(adminAuthMiddleware);

// Stats endpoints
adminRouter.get('/stats', statsController.getStats);
adminRouter.get('/stats/reminders', statsController.getReminderStats);
adminRouter.get('/stats/users', statsController.getUserStats);

// User management
adminRouter.get('/users', statsController.getUsers);
adminRouter.get('/users/:id', statsController.getUserById);

// Message endpoints
adminRouter.post('/messages/send', messageController.sendMessage);

// Export endpoints
adminRouter.post('/export/sheets', exportController.exportToSheets);

