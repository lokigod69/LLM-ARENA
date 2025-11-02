// This endpoint returns the current authentication state unambiguously
// Returns exactly what the UI needs: mode, token info, and remaining queries
// PHASE 1: Moved KV credentials to environment variables

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

export async function POST() {
  try {
    const c = await cookies();
    const mode = c.get('access_mode')?.value;
    
    if (mode === 'admin') {
      return NextResponse.json({ mode: 'admin' });
    }
    
    if (mode === 'token') {
      const token = c.get('access_token')?.value || '';
      if (!token) {
        return NextResponse.json({ mode: 'none' }, { status: 401 });
      }
      
      try {
        const data = await kv(['HGETALL', `token:${token}`]);
        
        if (!data || Object.keys(data).length === 0) {
          return NextResponse.json({ mode: 'token', error: 'invalid' }, { status: 403 });
        }

        // Convert Redis hash to object
        const tokenData: any = {};
        for (let i = 0; i < data.length; i += 2) {
          tokenData[data[i]] = data[i + 1];
        }

        if (tokenData.isActive !== 'true') {
          return NextResponse.json({ mode: 'token', error: 'disabled' }, { status: 403 });
        }

        return NextResponse.json({
          mode: 'token',
          token,
          remaining: Number(tokenData.queries_remaining || 0),
          allowed: Number(tokenData.queries_allowed || 0),
        });
      } catch (kvError) {
        console.error('KV Error in verify:', kvError);
        return NextResponse.json({ mode: 'token', error: 'invalid' }, { status: 403 });
      }
    }
    
    return NextResponse.json({ mode: 'none' }, { status: 401 });
  } catch (error) {
    console.error('Error in auth verify:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
