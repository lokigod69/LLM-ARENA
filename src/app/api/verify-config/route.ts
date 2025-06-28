/**
 * API Configuration Verification Endpoint
 * This endpoint verifies API configuration without making actual API calls
 */

import { NextResponse } from 'next/server';
import { verifyApiConfiguration } from '@/lib/verify-api-config';

export async function GET() {
  try {
    const results = verifyApiConfiguration();
    
    return NextResponse.json({
      success: true,
      results
    });
  } catch (error) {
    console.error('❌ Configuration verification failed:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 