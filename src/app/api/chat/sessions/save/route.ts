// Save Chat Session API Endpoint
// Saves chat sessions to Supabase (Phase 3)

import { NextRequest, NextResponse } from 'next/server';
import { supabase, isSupabaseEnabled } from '@/lib/supabase';
import type { ChatSession } from '@/types/chat';

export async function POST(req: NextRequest) {
  try {
    // Check if Supabase is configured
    if (!isSupabaseEnabled()) {
      return NextResponse.json(
        { error: 'Database not configured' },
        { status: 503 }
      );
    }

    const body = await req.json();
    const { session } = body as { session: ChatSession };

    if (!session) {
      return NextResponse.json(
        { error: 'Missing session data' },
        { status: 400 }
      );
    }

    // Convert Date objects to ISO strings for JSONB storage
    const messagesForStorage = session.messages.map(msg => ({
      ...msg,
      timestamp: msg.timestamp instanceof Date ? msg.timestamp.toISOString() : msg.timestamp,
    }));

    // Save to Supabase
    const { data, error } = await supabase!
      .from('chat_sessions')
      .insert({
        id: session.id,
        user_id: session.userId || null,
        access_code: session.accessCode || null,
        created_at: session.createdAt instanceof Date ? session.createdAt.toISOString() : session.createdAt,
        updated_at: session.updatedAt instanceof Date ? session.updatedAt.toISOString() : session.updatedAt,
        model_name: session.configuration.modelName,
        persona_id: session.configuration.personaId,
        stance: session.configuration.stance,
        default_extensiveness: session.configuration.defaultExtensiveness,
        messages: messagesForStorage,
        total_tokens: session.metadata?.totalTokens || 0,
        total_cost: session.metadata?.totalCost || 0,
      })
      .select()
      .single();

    if (error) {
      console.error('❌ Supabase save error:', error);
      return NextResponse.json(
        { error: 'Failed to save chat session', details: error.message },
        { status: 500 }
      );
    }

    console.log('✅ Chat session saved to Supabase:', data.id);
    return NextResponse.json({ success: true, sessionId: data.id });
  } catch (error) {
    console.error('❌ Chat session save error:', error);
    return NextResponse.json(
      {
        error: 'Failed to save chat session',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

