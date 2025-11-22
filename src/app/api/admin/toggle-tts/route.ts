// Admin API endpoint to toggle TTS enabled/disabled state
// Protected by ADMIN_ACCESS_CODE environment variable
// Updates KV storage with new TTS toggle state

import { NextResponse } from 'next/server';
import { isAdminRequest } from '@/lib/auth-config';

// Direct REST API calls to Upstash KV - same pattern as other admin routes
const KV_URL = process.env.KV_REST_API_URL || process.env.KV_URL;
const KV_TOKEN = process.env.KV_REST_API_TOKEN || process.env.KV_TOKEN;

if (!KV_URL || !KV_TOKEN) {
  console.error('⚠️ KV credentials not configured. Set KV_REST_API_URL and KV_REST_API_TOKEN in environment.');
}

async function kv(cmd: string[]) {
  if (!KV_URL || !KV_TOKEN) {
    throw new Error('KV credentials not configured');
  }
  const url = `${KV_URL}/${cmd.map(encodeURIComponent).join('/')}`;
  const r = await fetch(url, { headers: { Authorization: `Bearer ${KV_TOKEN}` }});
  if (!r.ok) {
    const errorText = await r.text();
    console.error('KV Error:', r.status, errorText);
    throw new Error(`KV ${cmd[0]} ${r.status}: ${errorText}`);
  }
  return r.json();
}

export async function POST(req: Request) {
  try {
    const { adminCode, enabled } = await req.json();

    // PHASE 1: Use shared auth-config utility (removes insecure fallback)
    if (!isAdminRequest(adminCode)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    if (typeof enabled !== 'boolean') {
      return NextResponse.json({ error: 'Invalid enabled value. Must be boolean.' }, { status: 400 });
    }

    // Store TTS enabled state in KV
    await kv(['SET', 'tts-enabled', enabled ? 'true' : 'false']);

    return NextResponse.json({ success: true, enabled });
  } catch (error: any) {
    console.error('🔧 TOGGLE_TTS_ERROR:', error?.message || error);
    return NextResponse.json({ error: 'Failed to toggle TTS' }, { status: 500 });
  }
}

