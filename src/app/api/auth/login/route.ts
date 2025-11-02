// This endpoint handles login with proper admin/token separation
// Sets HttpOnly cookies and returns auth state
// PHASE 1: Moved master token and KV credentials to environment variables

import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

// Direct REST API calls to Upstash KV - PHASE 1: Moved to environment variables
const KV_URL = process.env.KV_REST_API_URL || process.env.KV_URL;
const KV_TOKEN = process.env.KV_REST_API_TOKEN || process.env.KV_TOKEN;

if (!KV_URL || !KV_TOKEN) {
  console.error('⚠️ KV credentials not configured. Set KV_REST_API_URL and KV_REST_API_TOKEN in environment.');
}

async function kv(cmd: string[]) {
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

    // PHASE 1: Master token moved to environment variable
    const ADMIN_ACCESS_CODE = process.env.ADMIN_ACCESS_CODE || "6969";
    
    if (!process.env.ADMIN_ACCESS_CODE) {
      console.warn("⚠️ ADMIN_ACCESS_CODE not set, using default '6969'");
    }
    
    if (code === ADMIN_ACCESS_CODE) {
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
      const data = await kv(['HGETALL', `token:${code}`]);
      
      if (!data || Object.keys(data).length === 0) {
        return NextResponse.json({ error: 'Invalid access code' }, { status: 403 });
      }

      // Convert Redis hash to object
      const tokenData: any = {};
      for (let i = 0; i < data.length; i += 2) {
        tokenData[data[i]] = data[i + 1];
      }

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
