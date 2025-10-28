// This endpoint handles login with proper admin/token separation
// Sets HttpOnly cookies and returns auth state

import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

// Direct REST API calls to Upstash KV
const KV_URL = "https://touching-stallion-7895.upstash.io";
const KV_TOKEN = "AR7XAAImcDIxNTc0YzFkMTg5MDE0NmVkYmZhNDZjZDY1MjVhMzNiOHAyNzg5NQ";

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

    // Hardcoded admin code for testing
    const ADMIN_ACCESS_CODE = "6969";
    
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
