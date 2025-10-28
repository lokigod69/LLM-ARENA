// Task 2.2 Complete: API route /api/debate/step created.
// Update: Added development-mode bypass to skip Vercel KV access code checks.
// This endpoint takes a message and model, then returns the other model's (simulated) reply.

// Step 2 Implementation: Enhanced API route with agreeability and position support
// Updated to handle personality slider and position assignment parameters
// Passes enhanced parameters to the orchestrator
// PHASE 2A: Added enhanced logging and validation for individual personality verification
// PHASE B: Updated to support flexible model system with exact API model names
// AUTH UPDATE: Now uses cookie-based auth and returns remaining queries

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import type { AvailableModel, Message } from '@/types';

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

// PHASE B: Updated interface for flexible model system
interface StepRequest {
  prevMessage: string;
  model: string; // Now accepts any model string (will be normalized by orchestrator)
  originalModel?: AvailableModel; // NEW: Original model name for future API expansion
  agreeabilityLevel: number;
  position: 'pro' | 'con';
  topic: string;
  maxTurns: number;
  extensivenessLevel?: number; // NEW: Response length control (1-5)
  personaId?: string | null;
  conversationHistory: Message[]; // <-- ADDED: Full conversation history
}

/**
 * POST /api/debate/step
 * Execute a single turn in the debate - Enhanced for flexible model system
 */
export async function POST(request: NextRequest) {
  try {
    const body: StepRequest = await request.json();
    const { 
      prevMessage, 
      model, 
      originalModel,
      agreeabilityLevel,
      position,
      topic,
      maxTurns,
      extensivenessLevel = 3, // Default to balanced if not provided
      personaId,
      conversationHistory, // <-- ADDED
    } = body;

    // Check authentication via cookies
    const c = await cookies();
    const accessMode = c.get('access_mode')?.value;
    const accessToken = c.get('access_token')?.value;
    
    let remainingQueries: number | string = 'Unlimited';

    if (accessMode === 'admin') {
      // Admin bypass - no quota check
      remainingQueries = 'Unlimited';
    } else if (accessMode === 'token' && accessToken) {
      // Token user - check and decrement quota
      try {
        const data = await kv(['HGETALL', `token:${accessToken}`]);
        
        if (!data || Object.keys(data).length === 0) {
          return NextResponse.json({ error: 'Invalid access token' }, { status: 403 });
        }

        // Convert Redis hash to object
        const tokenData: any = {};
        for (let i = 0; i < data.length; i += 2) {
          tokenData[data[i]] = data[i + 1];
        }

        if (tokenData.isActive !== 'true') {
          return NextResponse.json({ error: 'Access token has been disabled' }, { status: 403 });
        }

        const currentRemaining = Number(tokenData.queries_remaining || 0);
        if (currentRemaining <= 0) {
          return NextResponse.json({ error: 'No queries remaining' }, { status: 403 });
        }

        // Decrement quota
        const newRemaining = currentRemaining - 1;
        await kv(['HSET', `token:${accessToken}`, 'queries_remaining', String(newRemaining)]);
        remainingQueries = newRemaining;
      } catch (kvError) {
        console.error('KV Error in step:', kvError);
        return NextResponse.json({ error: 'Access token validation failed' }, { status: 403 });
      }
    } else {
      // No valid authentication
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    console.log('🎯 STEP API: Request received (FLEXIBLE)');
    
    console.log('🎯 STEP API: Parsed request data (FLEXIBLE):', {
      model,
      originalModel,
      agreeabilityLevel,
      position,
      messageLength: prevMessage?.length || 0,
      topic: topic?.substring(0, 30) + '...',
      maxTurns,
      extensivenessLevel,
      personaId,
      historyLength: conversationHistory?.length || 0, // <-- ADDED
    });

    // Validate required parameters
    if (!prevMessage || !model || agreeabilityLevel === undefined || !position || !topic || !conversationHistory) {
      console.error('❌ STEP API: Missing required parameters');
      return NextResponse.json(
        { error: 'Missing required parameters: prevMessage, model, agreeabilityLevel, position, topic, conversationHistory' },
        { status: 400 }
      );
    }

    // Use the orchestrator to get the response
    const { processDebateTurn } = await import('@/lib/orchestrator'); // <-- RENAMED: runTurn -> processDebateTurn
    
    console.log('🎯 STEP API: Calling orchestrator with flexible model system...');
    
    const response = await processDebateTurn({ // <-- RENAMED
      prevMessage, 
      model, // Pass the model string directly - orchestrator will normalize it
      agreeabilityLevel,
      position,
      topic,
      maxTurns,
      extensivenessLevel,
      personaId: personaId || undefined,
      conversationHistory, // <-- ADDED
    });
    
    console.log('🎯 STEP API: Orchestrator response received (FLEXIBLE):', {
      model: response.model,
      replyLength: response.reply?.length || 0,
      timestamp: response.timestamp,
      tokenUsage: response.tokenUsage ? 'included' : 'not available'
    });

    return NextResponse.json({ ...response, remaining: remainingQueries });
  } catch (error) {
    console.error('💥 STEP API ERROR (FLEXIBLE):', error);
    console.error('💥 Error details:', {
      message: (error as Error).message,
      stack: (error as Error).stack?.substring(0, 500)
    });
    
    return NextResponse.json(
      { 
        error: 'Failed to execute debate step', 
        details: (error as Error).message,
        model: 'error',
        remaining: 'Error' // Add remaining to error response
      },
      { status: 500 }
    );
  }
} 