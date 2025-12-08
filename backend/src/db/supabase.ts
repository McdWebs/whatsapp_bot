import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { config } from '../config';
import { logger } from '../utils/logger';

let supabaseClient: SupabaseClient | null = null;
let supabaseAdminClient: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient {
  if (!supabaseClient) {
    supabaseClient = createClient(config.supabase.url, config.supabase.anonKey, {
      auth: {
        persistSession: false,
      },
    });
  }
  return supabaseClient;
}

export function getSupabaseAdminClient(): SupabaseClient {
  if (!supabaseAdminClient) {
    supabaseAdminClient = createClient(config.supabase.url, config.supabase.serviceRoleKey, {
      auth: {
        persistSession: false,
      },
    });
  }
  return supabaseAdminClient;
}

export async function testConnection(): Promise<boolean> {
  try {
    const client = getSupabaseClient();
    const { error } = await client.from('users').select('id').limit(1);
    if (error) {
      logger.error('Supabase connection test failed', { error: error.message });
      return false;
    }
    logger.info('Supabase connection successful');
    return true;
  } catch (error) {
    logger.error('Supabase connection test error', { error });
    return false;
  }
}

