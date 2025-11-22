// This file creates an admin-only API endpoint to generate new access codes.
// It is protected by an environment variable, `ADMIN_ACCESS_CODE`.
// When called, it generates a specified number of codes using `nanoid`,
// stores them in Vercel KV with a set number of queries, and returns the new codes.
// PHASE 1: Moved master token and KV credentials to environment variables

import { randomBytes } from 'crypto';
import { NextResponse } from 'next/server';
import { isAdminRequest } from '@/lib/auth-config';

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
    console.error('KV Error:', r.status, errorText);
    throw new Error(`KV ${cmd[0]} ${r.status}: ${errorText}`);
  }
  return r.json();
}

export async function POST(req: Request) {
  try {
    const { adminCode, count = 1, queries = 30 } = await req.json();

    // PHASE 1: Use shared auth-config utility (removes insecure fallback)
    if (!isAdminRequest(adminCode)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const tokens: string[] = [];
    
    for (let i = 0; i < count; i++) {
      const id = `test-${randomBytes(6).toString('base64url')}`;
      
      try {
        // Store as a Redis hash: HSET token:{id} field value...
        await kv(['HSET', `token:${id}`,
          'queries_allowed', String(queries),
          'queries_remaining', String(queries),
          'isActive', 'true',
          'created_at', new Date().toISOString()
        ]);
        tokens.push(id);
      } catch (kvError: any) {
        console.error('🔧 GEN_CODES: KV Error for token', id, ':', kvError?.stack || kvError?.message || kvError);
        throw kvError;
      }
    }

    return NextResponse.json({ message: `Successfully generated ${count} codes.`, codes: tokens });
  } catch (error: any) {
    console.error('🔧 GEN_CODES_ERROR:', error?.stack || error?.message || error);
    return NextResponse.json({ error: String(error?.message || error) }, { status: 500 });
  }
} 