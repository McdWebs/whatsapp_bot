import { hebcalClient } from '../integrations/hebcal/hebcal.client';
import { hebcalCacheRepository } from '../db/repositories/hebcal-cache.repository';
import { reminderRepository } from '../db/repositories/reminder.repository';
import { logger } from '../utils/logger';

export class HebCalSyncService {
  async syncDailyData(location: string = 'Jerusalem'): Promise<void> {
    try {
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      // Sync today and tomorrow
      await this.syncDate(location, today);
      await this.syncDate(location, tomorrow);

      logger.info('Daily HebCal sync completed', { location });
    } catch (error) {
      logger.error('Error in daily HebCal sync', {
        location,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async syncAllLocations(): Promise<void> {
    try {
      // Get all unique locations from reminder preferences
      const reminders = await reminderRepository.findEnabledReminders();
      const locations = new Set<string>();

      reminders.forEach((reminder) => {
        locations.add(reminder.location);
      });

      // Default location
      locations.add('Jerusalem');

      logger.info('Syncing HebCal data for all locations', {
        locationCount: locations.size,
        locations: Array.from(locations),
      });

      // Sync each location
      for (const location of locations) {
        try {
          await this.syncDailyData(location);
          // Small delay between locations
          await this.sleep(1000);
        } catch (error) {
          logger.error('Error syncing location', {
            location,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }

      logger.info('All locations synced successfully');
    } catch (error) {
      logger.error('Error syncing all locations', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  private async syncDate(location: string, date: Date): Promise<void> {
    try {
      const dateStr = date.toISOString().split('T')[0];

      // Check if we already have cached data for today
      const cached = await hebcalCacheRepository.findByLocationAndDate(location, dateStr);
      if (cached) {
        logger.debug('HebCal data already cached', { location, date: dateStr });
        return;
      }

      // Fetch from HebCal API
      const data = await hebcalClient.fetchCalendarData(location, date);

      // Cache the data
      await hebcalCacheRepository.createOrUpdate({
        location: data.location,
        date: data.date,
        sunset_time: data.sunsetTime?.toISOString() || undefined,
        candle_lighting_time: data.candleLightingTime?.toISOString() || undefined,
        prayer_times: Object.keys(data.prayerTimes).length > 0 ? data.prayerTimes : undefined,
        raw_data: data.rawData as any,
      });

      logger.info('HebCal data synced and cached', {
        location,
        date: dateStr,
        hasSunset: !!data.sunsetTime,
        hasCandleLighting: !!data.candleLightingTime,
      });
    } catch (error) {
      logger.error('Error syncing date', {
        location,
        date: date.toISOString(),
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async getCachedData(location: string, date: Date): Promise<{
    sunsetTime: Date | null;
    candleLightingTime: Date | null;
    prayerTimes: Record<string, any> | null;
  }> {
    const dateStr = date.toISOString().split('T')[0];
    const cached = await hebcalCacheRepository.findByLocationAndDate(location, dateStr);

    if (!cached) {
      // Try to sync if not cached
      await this.syncDate(location, date);
      const updated = await hebcalCacheRepository.findByLocationAndDate(location, dateStr);
      if (updated) {
        return {
          sunsetTime: updated.sunset_time ? new Date(updated.sunset_time) : null,
          candleLightingTime: updated.candle_lighting_time
            ? new Date(updated.candle_lighting_time)
            : null,
          prayerTimes: updated.prayer_times,
        };
      }
      return {
        sunsetTime: null,
        candleLightingTime: null,
        prayerTimes: null,
      };
    }

    return {
      sunsetTime: cached.sunset_time ? new Date(cached.sunset_time) : null,
      candleLightingTime: cached.candle_lighting_time ? new Date(cached.candle_lighting_time) : null,
      prayerTimes: cached.prayer_times,
    };
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

export const hebcalSyncService = new HebCalSyncService();

