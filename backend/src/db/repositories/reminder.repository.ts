import { getSupabaseClient, getSupabaseAdminClient } from '../supabase';
import { logger } from '../../utils/logger';

export type ReminderType = 'sunset' | 'candle' | 'prayer' | 'custom';

export interface ReminderPreference {
  id: string;
  user_id: string;
  type: ReminderType;
  time: string | null; // HH:MM format for custom, null for dynamic
  location: string;
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateReminderPreferenceData {
  user_id: string;
  type: ReminderType;
  time?: string; // HH:MM format
  location?: string;
  enabled?: boolean;
}

export interface UpdateReminderPreferenceData {
  time?: string;
  location?: string;
  enabled?: boolean;
}

export class ReminderRepository {
  async findByUserId(userId: string): Promise<ReminderPreference[]> {
    try {
      const { data, error } = await getSupabaseClient()
        .from('reminder_preferences')
        .select('*')
        .eq('user_id', userId)
        .order('type', { ascending: true });

      if (error) {
        throw error;
      }

      return (data || []) as ReminderPreference[];
    } catch (error) {
      logger.error('Error finding reminders by user id', { userId, error });
      throw error;
    }
  }

  async findByUserIdAndType(
    userId: string,
    type: ReminderType
  ): Promise<ReminderPreference | null> {
    try {
      const { data, error } = await getSupabaseClient()
        .from('reminder_preferences')
        .select('*')
        .eq('user_id', userId)
        .eq('type', type)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        }
        throw error;
      }

      return data as ReminderPreference;
    } catch (error) {
      logger.error('Error finding reminder by user id and type', { userId, type, error });
      throw error;
    }
  }

  async findEnabledReminders(): Promise<ReminderPreference[]> {
    try {
      const { data, error } = await getSupabaseClient()
        .from('reminder_preferences')
        .select('*')
        .eq('enabled', true)
        .order('user_id', { ascending: true });

      if (error) {
        throw error;
      }

      return (data || []) as ReminderPreference[];
    } catch (error) {
      logger.error('Error finding enabled reminders', { error });
      throw error;
    }
  }

  async create(preferenceData: CreateReminderPreferenceData): Promise<ReminderPreference> {
    try {
      const { data, error } = await getSupabaseAdminClient()
        .from('reminder_preferences')
        .insert({
          user_id: preferenceData.user_id,
          type: preferenceData.type,
          time: preferenceData.time || null,
          location: preferenceData.location || 'Jerusalem',
          enabled: preferenceData.enabled !== undefined ? preferenceData.enabled : true,
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      return data as ReminderPreference;
    } catch (error) {
      logger.error('Error creating reminder preference', { preferenceData, error });
      throw error;
    }
  }

  async update(
    userId: string,
    type: ReminderType,
    updateData: UpdateReminderPreferenceData
  ): Promise<ReminderPreference> {
    try {
      const { data, error } = await getSupabaseAdminClient()
        .from('reminder_preferences')
        .update(updateData)
        .eq('user_id', userId)
        .eq('type', type)
        .select()
        .single();

      if (error) {
        throw error;
      }

      return data as ReminderPreference;
    } catch (error) {
      logger.error('Error updating reminder preference', { userId, type, updateData, error });
      throw error;
    }
  }

  async delete(userId: string, type: ReminderType): Promise<void> {
    try {
      const { error } = await getSupabaseAdminClient()
        .from('reminder_preferences')
        .delete()
        .eq('user_id', userId)
        .eq('type', type);

      if (error) {
        throw error;
      }
    } catch (error) {
      logger.error('Error deleting reminder preference', { userId, type, error });
      throw error;
    }
  }

  async disableAllForUser(userId: string): Promise<void> {
    try {
      const { error } = await getSupabaseAdminClient()
        .from('reminder_preferences')
        .update({ enabled: false })
        .eq('user_id', userId);

      if (error) {
        throw error;
      }
    } catch (error) {
      logger.error('Error disabling all reminders for user', { userId, error });
      throw error;
    }
  }
}

export const reminderRepository = new ReminderRepository();

