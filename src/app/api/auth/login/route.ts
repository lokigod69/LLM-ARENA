// This endpoint handles login with proper admin/token separation
// Sets HttpOnly cookies and returns auth state
// PHASE 1: Moved master token and KV credentials to environment variables

import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { isAdminRequest } from '@/lib/auth-config';

// Direct REST API calls to Upstash KV - PHASE 1: Moved to environment variables
const KV_URL = process.env.KV_REST_API_URL || process.env.KV_URL;
const KV_TOKEN = process.env.KV_REST_API_TOKEN || process.env.KV_TOKEN;

// DEBUG: Log which env vars are being used
console.log('🔍 KV Credentials Check:', {
  KV_REST_API_URL_set: !!process.env.KV_REST_API_URL,
  KV_URL_set: !!process.env.KV_URL,
  KV_REST_API_TOKEN_set: !!process.env.KV_REST_API_TOKEN,
  KV_TOKEN_set: !!process.env.KV_TOKEN,
  KV_URL_final: KV_URL ? 'SET' : 'MISSING',
  KV_TOKEN_final: KV_TOKEN ? 'SET' : 'MISSING'
});

if (!KV_URL || !KV_TOKEN) {
  console.error('⚠️ KV credentials not configured. Set KV_REST_API_URL and KV_REST_API_TOKEN in environment.');
}

// Helper to convert Redis HGETALL array to object
function arrayToObject(arr: string[]): Record<string, string> {
  const obj: Record<string, string> = {};
  for (let i = 0; i < arr.length; i += 2) {
    obj[arr[i]] = arr[i + 1];
  }
  return obj;
}

async function kv(cmd: string[]) {
  if (!KV_URL || !KV_TOKEN) {
    throw new Error('KV credentials not configured. Set KV_REST_API_URL and KV_REST_API_TOKEN in environment.');
  }
  
  const url = `${KV_URL}/${cmd.map(encodeURIComponent).join('/')}`;
  const r = await fetch(url, { headers: { Authorization: `Bearer ${KV_TOKEN}` }});
  if (!r.ok) {
    const errorText = await r.text();
    throw new Error(`KV ${cmd[0]} ${r.status}: ${errorText}`);
  }
  return r.json();
}

export async function POST(req: Request) {
  try {
    const { code } = await req.json();
    
    if (!code) {
      return NextResponse.json({ error: 'Missing access code' }, { status: 400 });
    }

    // PHASE 1: Use shared auth-config utility (removes insecure fallback)
    if (isAdminRequest(code)) {
      // Admin login
      const cs = await cookies();
      const isProd = process.env.NODE_ENV === 'production';
      const opts = { httpOnly: true, sameSite: 'lax' as const, secure: isProd, path: '/' };
      
      cs.set('access_mode', 'admin', opts);
      cs.delete('access_token');
      
      return NextResponse.json({ mode: 'admin' });
    }

    // Token login - verify token exists and is active
    try {
      const rawData = await kv(['HGETALL', `token:${code}`]);
      
      // BUG FIX: KV returns { result: ['key', 'value', ...] } - convert array to object
      if (!rawData || !rawData.result || rawData.result.length === 0) {
        console.error('❌ Token not found in KV');
        return NextResponse.json({ error: 'Invalid access code' }, { status: 403 });
      }

      // Convert Redis HGETALL array to object
      const tokenData = arrayToObject(rawData.result);

      if (tokenData.isActive !== 'true') {
        return NextResponse.json({ error: 'Access code has been disabled' }, { status: 403 });
      }

      const remaining = Number(tokenData.queries_remaining || 0);
      if (remaining <= 0) {
        return NextResponse.json({ error: 'No queries remaining' }, { status: 403 });
      }

      // Set token cookies
      const cs = await cookies();
      const isProd = process.env.NODE_ENV === 'production';
      const opts = { httpOnly: true, sameSite: 'lax' as const, secure: isProd, path: '/' };
      
      cs.set('access_mode', 'token', opts);
      cs.set('access_token', code, opts);

      return NextResponse.json({
        mode: 'token',
        remaining: remaining,
        allowed: Number(tokenData.queries_allowed || 0),
      });
    } catch (kvError) {
      console.error('KV Error in login:', kvError);
      return NextResponse.json({ error: 'Invalid access code' }, { status: 403 });
    }
  } catch (error) {
    console.error('Error in auth login:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
