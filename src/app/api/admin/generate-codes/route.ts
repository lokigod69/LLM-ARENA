// This file creates an admin-only API endpoint to generate new access codes.
// It is protected by an environment variable, `ADMIN_ACCESS_CODE`.
// When called, it generates a specified number of codes using `nanoid`,
// stores them in Vercel KV with a set number of queries, and returns the new codes.

import { kv } from '@vercel/kv';
import { nanoid } from 'nanoid';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { adminCode, count = 1, queries = 3 } = await req.json();

    if (!process.env.ADMIN_ACCESS_CODE) {
      console.error("ADMIN_ACCESS_CODE is not set in environment variables.");
      return NextResponse.json({ error: 'Server configuration error.' }, { status: 500 });
    }

    // Protect the endpoint
    if (adminCode !== process.env.ADMIN_ACCESS_CODE) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const newCodes: string[] = [];
    for (let i = 0; i < count; i++) {
      const newCode = `test-${nanoid(8)}`; // e.g., test-hJkLp_2a
      await kv.set(newCode, {
        queries_allowed: parseInt(queries, 10),
        queries_remaining: parseInt(queries, 10),
        isActive: true, // Codes are active by default
        created_at: new Date().toISOString()
      });
      newCodes.push(newCode);
    }

    return NextResponse.json({ message: `Successfully generated ${count} codes.`, codes: newCodes });
  } catch (error) {
    console.error('Error generating codes:', error);
    return NextResponse.json({ error: 'An internal server error occurred.' }, { status: 500 });
  }
} 