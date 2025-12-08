import { hebcalSyncService } from '../../services/hebcal-sync.service';
import { logger } from '../../utils/logger';

export async function runDailyHebCalSync(): Promise<void> {
  try {
    logger.info('Starting daily HebCal sync job');
    await hebcalSyncService.syncAllLocations();
    logger.info('Daily HebCal sync job completed');
  } catch (error) {
    logger.error('Daily HebCal sync job failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

