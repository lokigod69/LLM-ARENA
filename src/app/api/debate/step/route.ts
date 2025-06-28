// Task 2.2 Complete: API route /api/debate/step created.
// This endpoint takes a message and model, then returns the other model's (simulated) reply.

// Step 2 Implementation: Enhanced API route with agreeability and position support
// Updated to handle personality slider and position assignment parameters
// Passes enhanced parameters to the orchestrator
// PHASE 2A: Added enhanced logging and validation for individual personality verification
// PHASE B: Updated to support flexible model system with exact API model names

import { NextRequest, NextResponse } from 'next/server';
import type { AvailableModel, Message } from '@/types';

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
    console.log('🎯 STEP API: Request received (FLEXIBLE)');
    
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
    }: StepRequest = await request.json();

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

    return NextResponse.json(response);
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
        model: 'error' 
      },
      { status: 500 }
    );
  }
} 