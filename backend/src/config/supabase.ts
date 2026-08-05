import { createClient, SupabaseClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { logger } from '../utils/logger';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

let supabase: SupabaseClient | null = null;

if (supabaseUrl && supabaseServiceKey) {
  supabase = createClient(supabaseUrl, supabaseServiceKey);
  logger.info('✅ Supabase client initialized');
} else {
  logger.warn('⚠️  SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set — Supabase Storage unavailable');
}

export const getSupabase = (): SupabaseClient | null => supabase;

export const STORAGE_BUCKET = 'attendance-photos';
