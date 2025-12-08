import { historyRepository } from '../db/repositories/history.repository';
import { logger } from '../utils/logger';

export class MonitoringService {
  async getFailedReminders(limit = 100) {
    try {
      return await historyRepository.getFailedReminders(limit);
    } catch (error) {
      logger.error('Error getting failed reminders', { error });
      throw error;
    }
  }

  async getDeliveryStats(startDate?: string, endDate?: string) {
    try {
      return await historyRepository.getStats(startDate, endDate);
    } catch (error) {
      logger.error('Error getting delivery stats', { error });
      throw error;
    }
  }

  async checkHealth() {
    try {
      // Check database connection
      const stats = await historyRepository.getStats();
      return {
        healthy: true,
        stats,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      logger.error('Health check failed', { error });
      return {
        healthy: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      };
    }
  }
}

export const monitoringService = new MonitoringService();

