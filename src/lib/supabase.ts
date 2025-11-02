// Supabase Client Helper
// Creates Supabase client only if credentials are configured
// Gracefully handles missing credentials without breaking functionality

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_ANON_KEY || '';

// Only create client if credentials exist
export const supabase = supabaseUrl && supabaseKey
  ? createClient(supabaseUrl, supabaseKey)
  : null;

export function isSupabaseEnabled(): boolean {
  return !!supabase;
}

