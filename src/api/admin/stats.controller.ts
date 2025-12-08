import { Request, Response } from 'express';
import { userRepository } from '../../db/repositories/user.repository';
import { reminderRepository } from '../../db/repositories/reminder.repository';
import { historyRepository } from '../../db/repositories/history.repository';
import { logger } from '../../utils/logger';

export const statsController = {
  async getStats(req: Request, res: Response): Promise<void> {
    try {
      const userCount = await userRepository.countUsers();
      const reminderStats = await historyRepository.getStats();

      res.json({
        users: {
          total: userCount,
        },
        reminders: reminderStats,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Error getting stats', { error });
      res.status(500).json({ error: 'Failed to get stats' });
    }
  },

  async getReminderStats(req: Request, res: Response): Promise<void> {
    try {
      const startDate = req.query.startDate as string | undefined;
      const endDate = req.query.endDate as string | undefined;

      const stats = await historyRepository.getStats(startDate, endDate);

      res.json({
        ...stats,
        period: {
          start: startDate || null,
          end: endDate || null,
        },
      });
    } catch (error) {
      logger.error('Error getting reminder stats', { error });
      res.status(500).json({ error: 'Failed to get reminder stats' });
    }
  },

  async getUserStats(req: Request, res: Response): Promise<void> {
    try {
      const totalUsers = await userRepository.countUsers();
      const enabledReminders = await reminderRepository.findEnabledReminders();
      const activeUsers = new Set(enabledReminders.map((r) => r.user_id)).size;

      res.json({
        total: totalUsers,
        active: activeUsers,
        inactive: totalUsers - activeUsers,
      });
    } catch (error) {
      logger.error('Error getting user stats', { error });
      res.status(500).json({ error: 'Failed to get user stats' });
    }
  },

  async getUsers(req: Request, res: Response): Promise<void> {
    try {
      const limit = parseInt(req.query.limit as string) || 100;
      const offset = parseInt(req.query.offset as string) || 0;

      const users = await userRepository.getAllUsers(limit, offset);

      // Get reminders for each user
      const usersWithReminders = await Promise.all(
        users.map(async (user) => {
          const reminders = await reminderRepository.findByUserId(user.id);
          return {
            ...user,
            reminders: reminders.length,
            enabledReminders: reminders.filter((r) => r.enabled).length,
          };
        })
      );

      res.json({
        users: usersWithReminders,
        pagination: {
          limit,
          offset,
          total: await userRepository.countUsers(),
        },
      });
    } catch (error) {
      logger.error('Error getting users', { error });
      res.status(500).json({ error: 'Failed to get users' });
    }
  },

  async getUserById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const user = await userRepository.findById(id);

      if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      const reminders = await reminderRepository.findByUserId(id);
      const history = await historyRepository.findByUserId(id, 50);

      res.json({
        user,
        reminders,
        recentHistory: history,
      });
    } catch (error) {
      logger.error('Error getting user by id', { error, id: req.params.id });
      res.status(500).json({ error: 'Failed to get user' });
    }
  },
};

