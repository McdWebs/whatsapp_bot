import { getSupabaseClient, getSupabaseAdminClient } from '../supabase';
import { logger } from '../../utils/logger';

export interface User {
  id: string;
  phone_number: string;
  current_state: string;
  created_at: string;
  updated_at: string;
}

export interface CreateUserData {
  phone_number: string;
  current_state?: string;
}

export class UserRepository {
  async findByPhoneNumber(phoneNumber: string): Promise<User | null> {
    try {
      const { data, error } = await getSupabaseClient()
        .from('users')
        .select('*')
        .eq('phone_number', phoneNumber)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No rows returned
          return null;
        }
        throw error;
      }

      return data as User;
    } catch (error) {
      logger.error('Error finding user by phone number', { phoneNumber, error });
      throw error;
    }
  }

  async findById(id: string): Promise<User | null> {
    try {
      const { data, error } = await getSupabaseClient()
        .from('users')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        }
        throw error;
      }

      return data as User;
    } catch (error) {
      logger.error('Error finding user by id', { id, error });
      throw error;
    }
  }

  async create(userData: CreateUserData): Promise<User> {
    try {
      const { data, error } = await getSupabaseAdminClient()
        .from('users')
        .insert({
          phone_number: userData.phone_number,
          current_state: userData.current_state || 'INITIAL',
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      return data as User;
    } catch (error) {
      logger.error('Error creating user', { userData, error });
      throw error;
    }
  }

  async updateState(userId: string, newState: string): Promise<User> {
    try {
      const { data, error } = await getSupabaseAdminClient()
        .from('users')
        .update({ current_state: newState })
        .eq('id', userId)
        .select()
        .single();

      if (error) {
        throw error;
      }

      return data as User;
    } catch (error) {
      logger.error('Error updating user state', { userId, newState, error });
      throw error;
    }
  }

  async getAllUsers(limit = 100, offset = 0): Promise<User[]> {
    try {
      const { data, error } = await getSupabaseClient()
        .from('users')
        .select('*')
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        throw error;
      }

      return (data || []) as User[];
    } catch (error) {
      logger.error('Error getting all users', { limit, offset, error });
      throw error;
    }
  }

  async countUsers(): Promise<number> {
    try {
      const { error, count } = await getSupabaseClient()
        .from('users')
        .select('*', { count: 'exact', head: true });

      if (error) {
        throw error;
      }

      return count || 0;
    } catch (error) {
      logger.error('Error counting users', { error });
      throw error;
    }
  }
}

export const userRepository = new UserRepository();

