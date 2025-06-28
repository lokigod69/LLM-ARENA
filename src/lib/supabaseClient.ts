// Task 1.2 & 2.2 Update: Supabase client now uses environment variables.
// This file exports the Supabase client, initialized with API key and URL from .env.local.

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl) {
  throw new Error("Supabase URL not found. Please set NEXT_PUBLIC_SUPABASE_URL in your .env.local file.")
}

if (!supabaseAnonKey) {
  throw new Error("Supabase Anon Key not found. Please set NEXT_PUBLIC_SUPABASE_ANON_KEY in your .env.local file.")
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey) 