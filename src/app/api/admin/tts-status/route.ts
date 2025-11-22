// Admin API endpoint to check TTS enabled status
// Returns the current TTS toggle state from KV storage
// Used by AdminPanel to display current TTS status
// PHASE 1: Protected with admin cookie check

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { isAdminCookie } from '@/lib/auth-config';

// Direct REST API calls to Upstash KV - same pattern as other admin routes
const KV_URL = process.env.KV_REST_API_URL || process.env.KV_URL;
const KV_TOKEN = process.env.KV_REST_API_TOKEN || process.env.KV_TOKEN;

async function kv(cmd: string[]) {
  if (!KV_URL || !KV_TOKEN) {
    throw new Error('KV credentials not configured');
  }
  const url = `${KV_URL}/${cmd.map(encodeURIComponent).join('/')}`;
  const r = await fetch(url, { headers: { Authorization: `Bearer ${KV_TOKEN}` }});
  if (!r.ok) {
    const errorText = await r.text();
    throw new Error(`KV ${cmd[0]} ${r.status}: ${errorText}`);
  }
  return r.json();
}

export async function GET() {
  // PHASE 1: Admin check
  const cookieStore = await cookies();
  const accessMode = cookieStore.get('access_mode')?.value;
  
  if (!isAdminCookie(accessMode)) {
    return NextResponse.json(
      { error: 'Admin access required' },
      { status: 403 }
    );
  }

  try {
    // Check if TTS is enabled in KV (default to false if not set)
    const result = await kv(['GET', 'tts-enabled']);
    const enabled = result?.result === 'true' || result?.result === true || false;
    
    console.log('🎤 TTS Status Check:', { enabled });
    
    return NextResponse.json({ enabled });
  } catch (error) {
    // If key doesn't exist or error, default to disabled
    console.log('🎤 TTS Status: Key not found, defaulting to disabled');
    return NextResponse.json({ enabled: false });
  }
}

