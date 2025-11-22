// Task 2.2 Complete: API route /api/debate/step created.
// Update: Added development-mode bypass to skip Vercel KV access code checks.
// This endpoint takes a message and model, then returns the other model's (simulated) reply.

// Step 2 Implementation: Enhanced API route with agreeability and position support
// Updated to handle personality slider and position assignment parameters
// Passes enhanced parameters to the orchestrator
// PHASE 2A: Added enhanced logging and validation for individual personality verification
// PHASE B: Updated to support flexible model system with exact API model names
// AUTH UPDATE: Now uses cookie-based auth and returns remaining queries
// PHASE 1: Moved KV credentials to environment variables

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import type { AvailableModel, Message } from '@/types';
import { getUserAuth, checkOAuthQuota, decrementOAuthQuota } from '@/lib/auth-helpers';

// Direct REST API calls to Upstash KV - PHASE 1: Moved to environment variables
const KV_URL = process.env.KV_REST_API_URL || process.env.KV_URL;
const KV_TOKEN = process.env.KV_REST_API_TOKEN || process.env.KV_TOKEN;

if (!KV_URL || !KV_TOKEN) {
  console.error('⚠️ KV credentials not configured. Set KV_REST_API_URL and KV_REST_API_TOKEN in environment.');
}

// Helper to convert Redis HGETALL array to object
function arrayToObject(arr: string[]): Record<string, string> {
  const obj: Record<string, string> = {};
  for (let i = 0; i < arr.length; i += 2) {
    obj[arr[i]] = arr[i + 1];
  }
  return obj;
}

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
  // Declare variables outside try block so they're accessible in catch
  let prevMessage: string | undefined;
  let model: string | undefined;
  let originalModel: AvailableModel | undefined;
  let agreeabilityLevel: number | undefined;
  let position: 'pro' | 'con' | undefined;
  let topic: string | undefined;
  let maxTurns: number | undefined;
  let extensivenessLevel: number = 3;
  let personaId: string | undefined;
  let conversationHistory: Message[] | undefined;
  
  try {
    const body: StepRequest = await request.json();
    prevMessage = body.prevMessage;
    model = body.model;
    originalModel = body.originalModel;
    agreeabilityLevel = body.agreeabilityLevel;
    position = body.position;
    topic = body.topic;
    maxTurns = body.maxTurns;
    extensivenessLevel = body.extensivenessLevel ?? 3;
    personaId = body.personaId ?? undefined;
    conversationHistory = body.conversationHistory;

    // PHASE 2A: Dual authentication check (OAuth + Access Codes)
    const userAuth = await getUserAuth();
    
    if (!userAuth) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    
    let remainingQueries: number | string = 'Unlimited';

    if (userAuth.type === 'oauth') {
      // OAuth user - check Supabase quota (using email for lookup)
      const quotaCheck = await checkOAuthQuota(userAuth.email, 'debate');
      
      if (!quotaCheck.allowed) {
        // BETA PROTECTION: Check if user has 0 quota (new free-tier user)
        const isBetaProtected = userAuth.tier === 'free' && quotaCheck.remaining === 0;
        
        const errorMessage = isBetaProtected
          ? 'Beta access required. Enter an access code to unlock debates, or join our waitlist for early access.'
          : 'No debates remaining. Upgrade your plan to continue.';
        
        return NextResponse.json({ 
          error: errorMessage,
          betaProtected: isBetaProtected,
          tier: userAuth.tier,
          remaining: 0
        }, { status: 403 });
      }
      
      // Decrement quota
      const result = await decrementOAuthQuota(userAuth.email, 'debate');
      if (!result.success) {
        return NextResponse.json({ error: 'Failed to update quota' }, { status: 500 });
      }
      
      remainingQueries = result.remaining;
      
    } else if (userAuth.type === 'admin') {
      // Admin bypass - no quota check
      remainingQueries = 'Unlimited';
      
    } else if (userAuth.type === 'token') {
      // Access code user - check KV quota (existing logic)
      try {
        const rawData = await kv(['HGETALL', `token:${userAuth.token}`]);
        
        if (!rawData || !rawData.result || rawData.result.length === 0) {
          return NextResponse.json({ error: 'Invalid access token' }, { status: 403 });
        }

        const tokenData = arrayToObject(rawData.result);

        if (tokenData.isActive !== 'true') {
          return NextResponse.json({ error: 'Access token has been disabled' }, { status: 403 });
        }

        const currentRemaining = Number(tokenData.queries_remaining || 0);
        if (currentRemaining <= 0) {
          return NextResponse.json({ error: 'No queries remaining' }, { status: 403 });
        }

        // Decrement quota
        const newRemaining = currentRemaining - 1;
        await kv(['HSET', `token:${userAuth.token}`, 'queries_remaining', String(newRemaining)]);
        remainingQueries = newRemaining;
      } catch (kvError) {
        console.error('KV Error in step:', kvError);
        return NextResponse.json({ error: 'Access token validation failed' }, { status: 403 });
      }
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
    
    // Calculate turnNumber from conversationHistory length
    const turnNumber = conversationHistory?.length || 0;
    
    const response = await processDebateTurn({ // <-- RENAMED
      prevMessage, 
      model, // Pass the model string directly - orchestrator will normalize it
      agreeabilityLevel,
      position,
      topic,
      maxTurns,
      extensivenessLevel,
      personaId: personaId || undefined,
      conversationHistory: conversationHistory || [], // <-- ADDED: Ensure array exists
      turnNumber, // <-- ADDED: Calculate from conversation history
    });
    
    console.log('🎯 STEP API: Orchestrator response received (FLEXIBLE):', {
      model: response.model,
      replyLength: response.reply?.length || 0,
      timestamp: response.timestamp,
      tokenUsage: response.tokenUsage ? 'included' : 'not available'
    });

    return NextResponse.json({ ...response, remaining: remainingQueries });
  } catch (error: any) {
    console.error('💥 STEP API ERROR (FLEXIBLE):');
    console.error('💥 Error Type:', error?.constructor?.name || typeof error);
    console.error('💥 Error Message:', error?.message);
    console.error('💥 Error Stack:', error?.stack);
    console.error('💥 Full Error Object:', JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
    console.error('💥 Request Parameters:', {
      model: model || 'UNKNOWN',
      topic: topic || 'UNKNOWN',
      position: position || 'UNKNOWN',
      agreeabilityLevel: agreeabilityLevel ?? 'UNKNOWN',
      extensivenessLevel: extensivenessLevel ?? 'UNKNOWN',
      turnNumber: conversationHistory?.length || 0
    });
    
    // Return detailed error message to client (includes actual error message)
    const errorMessage = error?.message || 'Failed to execute debate step';
    return NextResponse.json(
      { 
        error: errorMessage,
        details: process.env.NODE_ENV === 'development' ? {
          type: error?.constructor?.name || typeof error,
          stack: error?.stack?.substring(0, 1000)
        } : undefined,
        model: 'error',
        remaining: 'Error'
      },
      { status: 500 }
    );
  }
} 