// Character Chat Message API Endpoint
// Handles character responses for chat conversations (isolated from debate system)

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import type { ChatMessage, ChatConfiguration } from '@/types/chat';
import { processChatTurn } from '@/lib/orchestrator';
import { getRelevantContext } from '@/lib/chatHelpers';
import { PERSONAS } from '@/lib/personas';
import { getUserAuth, checkOAuthQuota, decrementOAuthQuota } from '@/lib/auth-helpers';

// Direct REST API calls to Upstash KV - Same pattern as debate system
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
  const r = await fetch(url, { headers: { Authorization: `Bearer ${KV_TOKEN}` } });
  if (!r.ok) {
    const errorText = await r.text();
    throw new Error(`KV ${cmd[0]} ${r.status}: ${errorText}`);
  }
  return r.json();
}

interface ChatMessageRequest {
  message: string;
  configuration: ChatConfiguration;
  conversationHistory: ChatMessage[];
}

/**
 * POST /api/chat/message
 * Get character response for chat conversation
 */
export async function POST(request: NextRequest) {
  let message: string | undefined;
  let configuration: ChatConfiguration | undefined;
  let conversationHistory: ChatMessage[] | undefined;

  try {
    const body: ChatMessageRequest = await request.json();
    message = body.message;
    configuration = body.configuration;
    conversationHistory = body.conversationHistory || [];

    // PHASE 2A: Dual authentication check (OAuth + Access Codes)
    const userAuth = await getUserAuth();
    
    console.log('💬 CHAT MESSAGE API: Auth check:', {
      hasAuth: !!userAuth,
      authType: userAuth?.type,
      email: userAuth?.type === 'oauth' ? userAuth.email : 'n/a'
    });
    
    if (!userAuth) {
      return NextResponse.json(
        {
          success: false,
          error: {
            type: 'auth',
            message: 'Authentication required',
            retryable: false,
          },
        },
        { status: 401 }
      );
    }
    
    let remainingQueries: number | string = 'Unlimited';

    if (userAuth.type === 'oauth') {
      // OAuth user - check Supabase quota (using email for lookup)
      console.log('💬 OAuth user detected, checking chat quota for:', userAuth.email);
      const quotaCheck = await checkOAuthQuota(userAuth.email, 'chat');
      
      console.log('💬 Quota check result:', quotaCheck);
      
      if (!quotaCheck.allowed) {
        return NextResponse.json(
          {
            success: false,
            error: {
              type: 'cost',
              message: 'No chats remaining. Upgrade your plan to continue.',
              retryable: false,
            },
            tier: userAuth.tier,
            remaining: 0
          },
          { status: 403 }
        );
      }
      
      // Decrement quota
      console.log('💬 Decrementing chat quota for:', userAuth.email);
      const result = await decrementOAuthQuota(userAuth.email, 'chat');
      console.log('💬 Decrement result:', result);
      
      if (!result.success) {
        console.error('❌ Failed to decrement chat quota');
        return NextResponse.json(
          {
            success: false,
            error: {
              type: 'api',
              message: 'Failed to update quota',
              retryable: true,
            },
          },
          { status: 500 }
        );
      }
      
      remainingQueries = result.remaining;
      console.log('✅ Chat quota decremented successfully. Remaining:', remainingQueries);
      
    } else if (userAuth.type === 'admin') {
      // Admin bypass - no quota check
      remainingQueries = 'Unlimited';
      
    } else if (userAuth.type === 'token') {
      // Access code user - check KV quota (existing logic)
      const accessToken = userAuth.token;
      try {
        const rawData = await kv(['HGETALL', `token:${accessToken}`]);

        if (!rawData || !rawData.result || rawData.result.length === 0) {
          return NextResponse.json(
            {
              success: false,
              error: {
                type: 'auth',
                message: 'Invalid access token',
                retryable: false,
              },
            },
            { status: 403 }
          );
        }

        const tokenData = arrayToObject(rawData.result);

        if (tokenData.isActive !== 'true') {
          return NextResponse.json(
            {
              success: false,
              error: {
                type: 'auth',
                message: 'Access token has been disabled',
                retryable: false,
              },
            },
            { status: 403 }
          );
        }

        const currentRemaining = Number(tokenData.queries_remaining || 0);
        if (currentRemaining <= 0) {
          return NextResponse.json(
            {
              success: false,
              error: {
                type: 'cost',
                message: 'No queries remaining',
                retryable: false,
              },
            },
            { status: 403 }
          );
        }

        // Decrement quota
        const newRemaining = currentRemaining - 1;
        await kv(['HSET', `token:${accessToken}`, 'queries_remaining', String(newRemaining)]);
        remainingQueries = newRemaining;
      } catch (kvError) {
        console.error('KV Error in chat message:', kvError);
        return NextResponse.json(
          {
            success: false,
            error: {
              type: 'auth',
              message: 'Access token validation failed',
              retryable: true,
            },
          },
          { status: 403 }
        );
      }
    }

    // Validate required parameters
    if (!message || !configuration) {
      return NextResponse.json(
        {
          success: false,
          error: {
            type: 'api',
            message: 'Missing required parameters: message, configuration',
            retryable: false,
          },
        },
        { status: 400 }
      );
    }

    // Validate configuration properties
    if (!configuration.personaId || !configuration.modelName) {
      return NextResponse.json(
        {
          success: false,
          error: {
            type: 'api',
            message: 'Invalid configuration: missing personaId or modelName',
            retryable: false,
          },
        },
        { status: 400 }
      );
    }

    // At this point, TypeScript knows configuration is defined and has required properties
    // Create a const reference to help TypeScript with type narrowing
    const config = configuration;

    // Get relevant context using token-budget sliding window
    const relevantMessages = getRelevantContext(conversationHistory || [], 4000);

    // Convert chat messages to orchestrator format
    const orchestratorHistory = relevantMessages.map((msg) => ({
      sender: msg.role === 'user' ? 'User' : (PERSONAS[config.personaId]?.name || 'Assistant'),
      text: msg.content,
    }));

    // Get persona details
    const persona = PERSONAS[config.personaId];
    if (!persona) {
      return NextResponse.json(
        {
          success: false,
          error: {
            type: 'api',
            message: `Persona not found: ${config.personaId}`,
            retryable: false,
          },
        },
        { status: 400 }
      );
    }

    // Derive stance from persona's hardcoded baseStubbornness
    // NOTE: Stance slider removed from UI - each persona uses their authentic stubbornness
    const derivedStance = persona.lockedTraits.baseStubbornness;

    console.log('💬 CHAT API: Using persona\'s hardcoded stance', {
      personaId: config.personaId,
      personaName: persona.name,
      hardcodedStance: derivedStance,
      userProvidedStance: config.stance, // May exist in old sessions
      using: 'hardcodedStance'
    });

    // Debug logging for Moonshot/Kimi authentication (dev only)
    const isMoonshotModel = config.modelName.startsWith('moonshot') || config.modelName.includes('kimi');
    if (isMoonshotModel && process.env.NODE_ENV === 'development') {
      console.log('🔍 Moonshot Debug:', {
        apiKeyExists: !!process.env.MOONSHOT_API_KEY,
        modelName: config.modelName
      });
    }

    console.log('💬 CHAT API: Processing message', {
      model: config.modelName,
      personaId: config.personaId,
      stance: derivedStance, // Using persona's hardcoded value
      extensiveness: config.defaultExtensiveness,
      messageLength: message.length,
      contextMessages: relevantMessages.length,
      isMoonshotModel,
    });

    // Call orchestrator with chat-specific parameters (conversational, not debate)
    const response = await processChatTurn({
      userMessage: message,
      conversationHistory: orchestratorHistory,
      model: config.modelName,
      stance: derivedStance, // Using persona's hardcoded baseStubbornness
      extensivenessLevel: config.defaultExtensiveness,
      personaId: config.personaId,
    });

    console.log('✅ CHAT API: Response received', {
      replyLength: response.reply?.length || 0,
      tokenUsage: response.tokenUsage ? 'included' : 'not available',
    });

    return NextResponse.json({
      success: true,
      reply: response.reply,
      tokenUsage: response.tokenUsage,
      remaining: remainingQueries,
    });
  } catch (error) {
    console.error('❌ CHAT API ERROR:', error);

    // Determine error type
    let errorType: 'api' | 'network' | 'rate_limit' = 'api';
    let retryable = false;

    if (error instanceof Error) {
      if (error.message.includes('rate limit') || error.message.includes('429')) {
        errorType = 'rate_limit';
        retryable = true;
      } else if (error.message.includes('network') || error.message.includes('fetch')) {
        errorType = 'network';
        retryable = true;
      }
    }

    return NextResponse.json(
      {
        success: false,
        error: {
          type: errorType,
          message: error instanceof Error ? error.message : 'Unknown error occurred',
          retryable,
        },
      },
      { status: 500 }
    );
  }
}

