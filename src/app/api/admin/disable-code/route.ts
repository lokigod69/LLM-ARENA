// This file creates an admin-only API endpoint to disable an existing access code.
// It is protected by an environment variable, `ADMIN_ACCESS_CODE`.
// When called, it finds the specified code in Vercel KV, sets its `isActive` flag
// to false, and saves the change back to the database.

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
    const { adminCode, codeToDisable } = await req.json();

    if (!process.env.ADMIN_ACCESS_CODE) {
      console.error("ADMIN_ACCESS_CODE is not set in environment variables.");
      return NextResponse.json({ error: 'Server configuration error.' }, { status: 500 });
    }

    // Protect the endpoint
    if (adminCode !== process.env.ADMIN_ACCESS_CODE) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    if (!codeToDisable) {
      return NextResponse.json({ error: '`codeToDisable` is required.' }, { status: 400 });
    }

    const codeData = await kv.get<CodeData>(codeToDisable);
    if (!codeData) {
      return NextResponse.json({ error: 'Code to disable not found.' }, { status: 404 });
    }

    // Update the flag and save it back
    codeData.isActive = false;
    await kv.set(codeToDisable, codeData);

    return NextResponse.json({ message: `Code '${codeToDisable}' has been disabled.` });
  } catch (error) {
    console.error(`Error disabling code '${(await req.json()).codeToDisable}':`, error);
    return NextResponse.json({ error: 'An internal server error occurred.' }, { status: 500 });
  }
} 