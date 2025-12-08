import { getSupabaseClient, getSupabaseAdminClient } from '../supabase';
import { logger } from '../../utils/logger';
import { ReminderType } from './reminder.repository';

export type DeliveryStatus = 'pending' | 'sent' | 'delivered' | 'failed';

export interface ReminderHistory {
  id: string;
  user_id: string;
  type: ReminderType;
  sent_at: string;
  delivery_status: DeliveryStatus;
  error_message: string | null;
  reminder_time: string | null;
  created_at: string;
}

export interface CreateReminderHistoryData {
  user_id: string;
  type: ReminderType;
  delivery_status?: DeliveryStatus;
  error_message?: string;
  reminder_time?: string;
}

export class HistoryRepository {
  async create(historyData: CreateReminderHistoryData): Promise<ReminderHistory> {
    try {
      const { data, error } = await getSupabaseAdminClient()
        .from('reminder_history')
        .insert({
          user_id: historyData.user_id,
          type: historyData.type,
          delivery_status: historyData.delivery_status || 'pending',
          error_message: historyData.error_message || null,
          reminder_time: historyData.reminder_time || null,
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      return data as ReminderHistory;
    } catch (error) {
      logger.error('Error creating reminder history', { historyData, error });
      throw error;
    }
  }

  async updateStatus(
    historyId: string,
    status: DeliveryStatus,
    errorMessage?: string
  ): Promise<ReminderHistory> {
    try {
      const updateData: any = { delivery_status: status };
      if (errorMessage !== undefined) {
        updateData.error_message = errorMessage;
      }

      const { data, error } = await getSupabaseAdminClient()
        .from('reminder_history')
        .update(updateData)
        .eq('id', historyId)
        .select()
        .single();

      if (error) {
        throw error;
      }

      return data as ReminderHistory;
    } catch (error) {
      logger.error('Error updating reminder history status', { historyId, status, error });
      throw error;
    }
  }

  async findByUserId(userId: string, limit = 50): Promise<ReminderHistory[]> {
    try {
      const { data, error } = await getSupabaseClient()
        .from('reminder_history')
        .select('*')
        .eq('user_id', userId)
        .order('sent_at', { ascending: false })
        .limit(limit);

      if (error) {
        throw error;
      }

      return (data || []) as ReminderHistory[];
    } catch (error) {
      logger.error('Error finding reminder history by user id', { userId, error });
      throw error;
    }
  }

  async getStats(startDate?: string, endDate?: string): Promise<{
    total: number;
    sent: number;
    delivered: number;
    failed: number;
  }> {
    try {
      let query = getSupabaseClient().from('reminder_history').select('delivery_status');

      if (startDate) {
        query = query.gte('sent_at', startDate);
      }
      if (endDate) {
        query = query.lte('sent_at', endDate);
      }

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      const stats = {
        total: data?.length || 0,
        sent: 0,
        delivered: 0,
        failed: 0,
      };

      data?.forEach((item: { delivery_status: string }) => {
        if (item.delivery_status === 'sent') stats.sent++;
        else if (item.delivery_status === 'delivered') stats.delivered++;
        else if (item.delivery_status === 'failed') stats.failed++;
      });

      return stats;
    } catch (error) {
      logger.error('Error getting reminder history stats', { startDate, endDate, error });
      throw error;
    }
  }

  async getFailedReminders(limit = 100): Promise<ReminderHistory[]> {
    try {
      const { data, error } = await getSupabaseClient()
        .from('reminder_history')
        .select('*')
        .eq('delivery_status', 'failed')
        .order('sent_at', { ascending: false })
        .limit(limit);

      if (error) {
        throw error;
      }

      return (data || []) as ReminderHistory[];
    } catch (error) {
      logger.error('Error getting failed reminders', { error });
      throw error;
    }
  }
}

export const historyRepository = new HistoryRepository();

