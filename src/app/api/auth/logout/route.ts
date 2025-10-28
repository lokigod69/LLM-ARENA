// This endpoint clears authentication cookies for logout/switch functionality

import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST() {
  try {
    const cs = await cookies();
    cs.delete('access_mode');
    cs.delete('access_token');
    
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Error in auth logout:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
