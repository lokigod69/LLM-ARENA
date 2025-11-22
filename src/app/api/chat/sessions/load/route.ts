// Load Chat Session API Endpoint
// Loads chat sessions from Supabase (Phase 3)

import { NextRequest, NextResponse } from 'next/server';
import { supabase, isSupabaseEnabled } from '@/lib/supabase';
import type { ChatSession } from '@/types/chat';
import { auth } from '@/auth';
import { cookies } from 'next/headers';

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

    // SECURITY: Verify ownership before returning data
    const authSession = await auth();
    const c = await cookies();
    const userEmail = authSession?.user?.email;
    const accessCode = c.get('access_token')?.value;

    const isOwner = 
      (data.user_email && data.user_email === userEmail) ||
      (data.access_code && data.access_code === accessCode);

    if (!isOwner) {
      console.warn('⛔ Unauthorized access attempt:', {
        sessionId,
        requestingUser: userEmail || 'none',
        requestingCode: accessCode ? 'present' : 'none',
        sessionOwner: data.user_email || data.access_code || 'none'
      });
      return NextResponse.json(
        { error: 'Unauthorized - session belongs to another user' },
        { status: 403 }
      );
    }

    console.log('✅ Session ownership verified:', {
      sessionId,
      owner: userEmail || 'access_code_user'
    });

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
        stance: data.stance ?? undefined, // Backward compatibility: old sessions may have stance
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

