// This file creates an admin-only API endpoint to generate new access codes.
// It is protected by an environment variable, `ADMIN_ACCESS_CODE`.
// When called, it generates a specified number of codes using `nanoid`,
// stores them in Vercel KV with a set number of queries, and returns the new codes.
// PHASE 1: Moved master token and KV credentials to environment variables

import { randomBytes } from 'crypto';
import { NextResponse } from 'next/server';

// Direct REST API calls to Upstash KV - PHASE 1: Moved to environment variables
const KV_URL = process.env.KV_REST_API_URL || process.env.KV_URL;
const KV_TOKEN = process.env.KV_REST_API_TOKEN || process.env.KV_TOKEN;

if (!KV_URL || !KV_TOKEN) {
  console.error('⚠️ KV credentials not configured. Set KV_REST_API_URL and KV_REST_API_TOKEN in environment.');
}

async function kv(cmd: string[]) {
  const url = `${KV_URL}/${cmd.map(encodeURIComponent).join('/')}`;
  console.log('🔧 KV REST CALL:', url);
  const r = await fetch(url, { headers: { Authorization: `Bearer ${KV_TOKEN}` }});
  if (!r.ok) {
    const errorText = await r.text();
    console.error('🔧 KV REST ERROR:', r.status, errorText);
    throw new Error(`KV ${cmd[0]} ${r.status}: ${errorText}`);
  }
  return r.json();
}

export async function POST(req: Request) {
  try {
    console.log('🔧 GEN_CODES: Starting token generation...');
    console.log('🔧 GEN_CODES: ADMIN_ACCESS_CODE env:', process.env.ADMIN_ACCESS_CODE ? 'SET' : 'NOT SET');
    
    const { adminCode, count = 1, queries = 30 } = await req.json();
    console.log('🔧 GEN_CODES: Request data:', { adminCode, count, queries });

    // PHASE 1: Master token moved to environment variable
    const expectedAdminCode = process.env.ADMIN_ACCESS_CODE || "6969";
    
    if (!process.env.ADMIN_ACCESS_CODE) {
      console.warn("⚠️ ADMIN_ACCESS_CODE not set, using default '6969'");
    }
    
    if (adminCode !== expectedAdminCode) {
      console.log('🔧 GEN_CODES: Unauthorized access attempt with code:', adminCode);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    console.log('🔧 GEN_CODES: Admin code verified, generating tokens...');
    const tokens: string[] = [];
    
    for (let i = 0; i < count; i++) {
      const id = `test-${randomBytes(6).toString('base64url')}`;
      console.log('🔧 GEN_CODES: Creating token:', id);
      
      try {
        // Store as a Redis hash: HSET token:{id} field value...
        await kv(['HSET', `token:${id}`,
          'queries_allowed', String(queries),
          'queries_remaining', String(queries),
          'isActive', 'true',
          'created_at', new Date().toISOString()
        ]);
        console.log('🔧 GEN_CODES: Token stored successfully:', id);
        tokens.push(id);
      } catch (kvError: any) {
        console.error('🔧 GEN_CODES: KV Error for token', id, ':', kvError?.stack || kvError?.message || kvError);
        throw kvError;
      }
    }

    console.log('🔧 GEN_CODES: Successfully generated', tokens.length, 'tokens');
    return NextResponse.json({ message: `Successfully generated ${count} codes.`, codes: tokens });
  } catch (error: any) {
    console.error('🔧 GEN_CODES_ERROR:', error?.stack || error?.message || error);
    return NextResponse.json({ error: String(error?.message || error) }, { status: 500 });
  }
} 