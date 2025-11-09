// Changes: Export both server-side and browser-side Supabase clients with diagnostics.
import { createClient } from '@supabase/supabase-js';

// Server-side client (uses private env vars)
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_ANON_KEY || '';

export const supabase = supabaseUrl && supabaseKey
  ? createClient(supabaseUrl, supabaseKey)
  : null;

// Browser-safe client (uses public env vars)
const supabaseBrowserUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseBrowserKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const supabaseBrowser = supabaseBrowserUrl && supabaseBrowserKey
  ? createClient(supabaseBrowserUrl, supabaseBrowserKey)
  : null;

// Check functions
export function isSupabaseEnabled(): boolean {
  return !!supabase;
}

export function isSupabaseBrowserEnabled(): boolean {
  return !!supabaseBrowser;
}

// Startup diagnostic (browser only)
if (typeof window !== 'undefined') {
  console.log('🔧 Supabase Browser Client Init:', {
    url: supabaseBrowserUrl ? 'SET ✅' : 'MISSING ❌',
    key: supabaseBrowserKey ? 'SET ✅' : 'MISSING ❌',
    clientCreated: !!supabaseBrowser,
  });
}

