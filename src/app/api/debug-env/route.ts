// Debug endpoint to check environment variables
// Shows which env vars are set (without exposing values)

import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const envCheck = {
      // KV Credentials
      KV_REST_API_URL: {
        set: !!process.env.KV_REST_API_URL,
        length: process.env.KV_REST_API_URL?.length || 0,
        preview: process.env.KV_REST_API_URL?.substring(0, 20) + '...' || 'not set'
      },
      KV_REST_API_TOKEN: {
        set: !!process.env.KV_REST_API_TOKEN,
        length: process.env.KV_REST_API_TOKEN?.length || 0,
        preview: process.env.KV_REST_API_TOKEN?.substring(0, 10) + '...' || 'not set'
      },
      KV_URL: {
        set: !!process.env.KV_URL,
        length: process.env.KV_URL?.length || 0,
        preview: process.env.KV_URL?.substring(0, 20) + '...' || 'not set'
      },
      KV_TOKEN: {
        set: !!process.env.KV_TOKEN,
        length: process.env.KV_TOKEN?.length || 0,
        preview: process.env.KV_TOKEN?.substring(0, 10) + '...' || 'not set'
      },
      // Admin Token
      ADMIN_ACCESS_CODE: {
        set: !!process.env.ADMIN_ACCESS_CODE,
        length: process.env.ADMIN_ACCESS_CODE?.length || 0,
        preview: process.env.ADMIN_ACCESS_CODE?.substring(0, 4) + '...' || 'not set'
      },
      // Node Environment
      NODE_ENV: process.env.NODE_ENV || 'not set',
      // Final values used by code
      final: {
        KV_URL: (process.env.KV_REST_API_URL || process.env.KV_URL) ? 'SET' : 'MISSING',
        KV_TOKEN: (process.env.KV_REST_API_TOKEN || process.env.KV_TOKEN) ? 'SET' : 'MISSING',
        ADMIN_ACCESS_CODE: (process.env.ADMIN_ACCESS_CODE || '6969') ? 'SET' : 'MISSING'
      }
    };

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      environment: envCheck
    });
  } catch (error) {
    console.error('💥 Debug env endpoint error:', error);
    return NextResponse.json({
      error: 'Internal server error',
      message: (error as Error).message
    }, { status: 500 });
  }
}

