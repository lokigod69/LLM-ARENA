// Task 2.2 Complete: API route /api/debate/step created.
// Update: Added development-mode bypass to skip Vercel KV access code checks.
// This endpoint takes a message and model, then returns the other model's (simulated) reply.

// Step 2 Implementation: Enhanced API route with agreeability and position support
// Updated to handle personality slider and position assignment parameters
// Passes enhanced parameters to the orchestrator
// PHASE 2A: Added enhanced logging and validation for individual personality verification
// PHASE B: Updated to support flexible model system with exact API model names

import { NextRequest, NextResponse } from 'next/server';
import type { AvailableModel, Message } from '@/types';
import { kv } from '@vercel/kv';

interface CodeData {
  queries_allowed: number;
  queries_remaining: number;
  isActive: boolean;
  created_at: string;
}

// PHASE B: Updated interface for flexible model system
interface StepRequest {
  accessCode: string; // <-- ADDED: For usage control
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
      accessCode,
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

    let queriesRemaining: number | string = 'Unlimited';

    // Access Code Validation Logic
    // Development mode bypass
    if (process.env.NODE_ENV === 'development') {
      console.log('🔧 DEV MODE: Bypassing KV access code check');
      queriesRemaining = 'Unlimited (Dev)';
    }
    // Production: check KV
    else if (accessCode !== process.env.ADMIN_ACCESS_CODE) {
      const codeData = await kv.get<CodeData>(accessCode);

      if (!codeData || !codeData.isActive || codeData.queries_remaining <= 0) {
        return NextResponse.json({ error: 'Access denied. Invalid or expired code.' }, { status: 403 });
      }

      // Decrement the count (this is the critical transaction)
      const newQueriesRemaining = codeData.queries_remaining - 1;
      await kv.set(accessCode, { ...codeData, queries_remaining: newQueriesRemaining });
      queriesRemaining = newQueriesRemaining;
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

    return NextResponse.json({ ...response, queriesRemaining });
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
        queriesRemaining: 'Error' // Add queriesRemaining to error response
      },
      { status: 500 }
    );
  }
} 