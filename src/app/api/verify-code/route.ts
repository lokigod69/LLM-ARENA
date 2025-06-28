// This file creates a user-facing API endpoint to verify an access code.
// It checks for a special admin code, and otherwise looks up the code
// in Vercel KV. It validates that the code exists, is active, and has
// queries remaining, returning the status to the client.

import { kv } from '@vercel/kv';
import { NextResponse } from 'next/server';

interface CodeData {
  queries_allowed: number;
  queries_remaining: number;
  isActive: boolean;
  created_at: string;
}

export async function POST(req: Request) {
  try {
    const { accessCode } = await req.json();

    if (!accessCode) {
      return NextResponse.json({ error: 'Access code is required' }, { status: 400 });
    }

    // 1. Check for the ADMIN code first
    if (process.env.ADMIN_ACCESS_CODE && accessCode === process.env.ADMIN_ACCESS_CODE) {
      return NextResponse.json({
        isValid: true,
        isAdmin: true,
        queriesRemaining: 'Unlimited'
      });
    }

    // 2. If not admin, check the KV database for a regular code
    const codeData = await kv.get<CodeData>(accessCode);

    if (!codeData) {
      return NextResponse.json({ isValid: false, error: 'Invalid access code' }, { status: 403 });
    }

    // 3. Check if the code is active and has queries
    if (codeData.isActive === false) {
      return NextResponse.json({ isValid: false, error: 'This access code has been disabled.' }, { status: 403 });
    }

    if (codeData.queries_remaining <= 0) {
      return NextResponse.json({ isValid: false, error: 'This access code has no queries remaining.' }, { status: 403 });
    }

    // If valid, return its data
    return NextResponse.json({
      isValid: true,
      isAdmin: false,
      queriesRemaining: codeData.queries_remaining
    });

  } catch (error) {
    console.error('Error verifying code:', error);
    return NextResponse.json({ error: 'An internal server error occurred.' }, { status: 500 });
  }
} 