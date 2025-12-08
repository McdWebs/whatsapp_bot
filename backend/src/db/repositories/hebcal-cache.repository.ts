import { getSupabaseClient, getSupabaseAdminClient } from '../supabase';
import { logger } from '../../utils/logger';

export interface HebCalCache {
  id: string;
  location: string;
  date: string; // YYYY-MM-DD format
  sunset_time: string | null;
  candle_lighting_time: string | null;
  prayer_times: Record<string, any> | null;
  raw_data: Record<string, any> | null;
  created_at: string;
  updated_at: string;
}

export interface CreateHebCalCacheData {
  location: string;
  date: string;
  sunset_time?: string;
  candle_lighting_time?: string;
  prayer_times?: Record<string, any>;
  raw_data?: Record<string, any>;
}

export class HebCalCacheRepository {
  async findByLocationAndDate(location: string, date: string): Promise<HebCalCache | null> {
    try {
      const { data, error } = await getSupabaseClient()
        .from('hebcal_cache')
        .select('*')
        .eq('location', location)
        .eq('date', date)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        }
        throw error;
      }

      return data as HebCalCache;
    } catch (error) {
      logger.error('Error finding HebCal cache', { location, date, error });
      throw error;
    }
  }

  async createOrUpdate(cacheData: CreateHebCalCacheData): Promise<HebCalCache> {
    try {
      // Try to find existing record
      const existing = await this.findByLocationAndDate(cacheData.location, cacheData.date);

      if (existing) {
        // Update existing
        const { data, error } = await getSupabaseAdminClient()
          .from('hebcal_cache')
          .update({
            sunset_time: cacheData.sunset_time || existing.sunset_time,
            candle_lighting_time: cacheData.candle_lighting_time || existing.candle_lighting_time,
            prayer_times: cacheData.prayer_times || existing.prayer_times,
            raw_data: cacheData.raw_data || existing.raw_data,
          })
          .eq('id', existing.id)
          .select()
          .single();

        if (error) {
          throw error;
        }

        return data as HebCalCache;
      } else {
        // Create new
        const { data, error } = await getSupabaseAdminClient()
          .from('hebcal_cache')
          .insert({
            location: cacheData.location,
            date: cacheData.date,
            sunset_time: cacheData.sunset_time || null,
            candle_lighting_time: cacheData.candle_lighting_time || null,
            prayer_times: cacheData.prayer_times || null,
            raw_data: cacheData.raw_data || null,
          })
          .select()
          .single();

        if (error) {
          throw error;
        }

        return data as HebCalCache;
      }
    } catch (error) {
      logger.error('Error creating or updating HebCal cache', { cacheData, error });
      throw error;
    }
  }

  async deleteOldCache(daysToKeep = 30): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

      const { data, error } = await getSupabaseAdminClient()
        .from('hebcal_cache')
        .delete()
        .lt('date', cutoffDate.toISOString().split('T')[0])
        .select();

      if (error) {
        throw error;
      }

      return data?.length || 0;
    } catch (error) {
      logger.error('Error deleting old HebCal cache', { daysToKeep, error });
      throw error;
    }
  }
}

export const hebcalCacheRepository = new HebCalCacheRepository();

