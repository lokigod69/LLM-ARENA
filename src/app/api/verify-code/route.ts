// This file creates a user-facing API endpoint to verify an access code.
// It checks for a special admin code, and otherwise looks up the code
// in Vercel KV. It validates that the code exists, is active, and has
// queries remaining, returning the status to the client.

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
    const { accessCode } = await req.json();

    if (!accessCode) {
      return NextResponse.json({ error: 'Access code is required' }, { status: 400 });
    }

    // 1. Check for the ADMIN code first
    if (accessCode === "6969") {
      return NextResponse.json({
        isValid: true,
        isAdmin: true,
        queriesRemaining: 'Unlimited'
      });
    }

    // 2. If not admin, check the KV database for a regular code
    try {
      const codeData = await kv(['HGETALL', `token:${accessCode}`]);
      
      if (!codeData || Object.keys(codeData).length === 0) {
        return NextResponse.json({ isValid: false, error: 'Invalid access code' }, { status: 403 });
      }

      // Convert Redis hash to object
      const tokenData: any = {};
      for (let i = 0; i < codeData.length; i += 2) {
        tokenData[codeData[i]] = codeData[i + 1];
      }

      // 3. Check if the code is active and has queries
      if (tokenData.isActive === 'false') {
        return NextResponse.json({ isValid: false, error: 'This access code has been disabled.' }, { status: 403 });
      }

      const queriesRemaining = parseInt(tokenData.queries_remaining || '0');
      if (queriesRemaining <= 0) {
        return NextResponse.json({ isValid: false, error: 'This access code has no queries remaining.' }, { status: 403 });
      }

      // If valid, return its data
      return NextResponse.json({
        isValid: true,
        isAdmin: false,
        queriesRemaining: queriesRemaining
      });
    } catch (kvError) {
      console.error('KV Error:', kvError);
      return NextResponse.json({ isValid: false, error: 'Invalid access code' }, { status: 403 });
    }

  } catch (error) {
    console.error('Error verifying code:', error);
    return NextResponse.json({ error: 'An internal server error occurred.' }, { status: 500 });
  }
} 