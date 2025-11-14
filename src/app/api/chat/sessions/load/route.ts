// Load Chat Session API Endpoint
// Loads chat sessions from Supabase (Phase 3)

import { NextRequest, NextResponse } from 'next/server';
import { supabase, isSupabaseEnabled } from '@/lib/supabase';
import type { ChatSession } from '@/types/chat';

export async function GET(req: NextRequest) {
  try {
    // Check if Supabase is configured
    if (!isSupabaseEnabled()) {
      return NextResponse.json(
        { error: 'Database not configured' },
        { status: 503 }
      );
    }

    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Missing sessionId parameter' },
        { status: 400 }
      );
    }

    // Load from Supabase
    const { data, error } = await supabase!
      .from('chat_sessions')
      .select('*')
      .eq('id', sessionId)
      .single();

    if (error) {
      console.error('❌ Supabase load error:', error);
      return NextResponse.json(
        { error: 'Failed to load chat session', details: error.message },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { error: 'Chat session not found' },
        { status: 404 }
      );
    }

    // Convert back to ChatSession format
    const session: ChatSession = {
      id: data.id,
      userId: data.user_id || undefined,
      accessCode: data.access_code || undefined,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
      configuration: {
        modelName: data.model_name,
        personaId: data.persona_id,
        stance: data.stance,
        defaultExtensiveness: data.default_extensiveness,
      },
      messages: (data.messages || []).map((msg: any) => ({
        ...msg,
        timestamp: new Date(msg.timestamp),
      })),
      metadata: {
        totalTokens: data.total_tokens || 0,
        totalCost: Number(data.total_cost) || 0,
      },
    };

    console.log('✅ Chat session loaded from Supabase:', session.id);
    return NextResponse.json({ success: true, session });
  } catch (error) {
    console.error('❌ Chat session load error:', error);
    return NextResponse.json(
      {
        error: 'Failed to load chat session',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

