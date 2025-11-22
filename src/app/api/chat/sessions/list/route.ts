// List Chat Sessions API Endpoint
// Lists user's chat sessions from Supabase (Phase 3)

import { NextRequest, NextResponse } from 'next/server';
import { supabase, isSupabaseEnabled } from '@/lib/supabase';
import { cookies } from 'next/headers';
import { auth } from '@/auth';

export async function GET(_req: NextRequest) {
  try {
    // Check if Supabase is configured
    if (!isSupabaseEnabled()) {
      return NextResponse.json(
        { error: 'Database not configured' },
        { status: 503 }
      );
    }

    // SECURITY: Determine user identity from server-side session
    const authSession = await auth();
    const c = await cookies();
    const userEmail = authSession?.user?.email;
    const accessCode = c.get('access_token')?.value;

    console.log('📚 Listing sessions for:', {
      userEmail: userEmail || 'none',
      accessCode: accessCode ? 'present' : 'none'
    });

    // Build query with proper user filtering
    let query = supabase!
      .from('chat_sessions')
      .select('id, created_at, model_name, persona_id, stance, default_extensiveness, message_count')
      .order('created_at', { ascending: false })
      .limit(50);

    // Filter by user identity
    if (userEmail) {
      // OAuth user - filter by email
      query = query.eq('user_email', userEmail);
    } else if (accessCode) {
      // Access code user - filter by code
      query = query.eq('access_code', accessCode);
    } else {
      // No auth - return empty list
      console.log('⚠️ No authentication found, returning empty list');
      return NextResponse.json({ success: true, sessions: [] });
    }

    const { data, error } = await query;

    if (error) {
      console.error('❌ Supabase list error:', error);
      return NextResponse.json(
        { error: 'Failed to list chat sessions', details: error.message },
        { status: 500 }
      );
    }

    // Format response
    const sessions = (data || []).map((session: any) => ({
      id: session.id,
      createdAt: new Date(session.created_at),
      configuration: {
        modelName: session.model_name,
        personaId: session.persona_id,
        stance: session.stance,
        defaultExtensiveness: session.default_extensiveness,
      },
      messageCount: session.message_count || 0,
      preview: '', // Will be populated from first message if needed
    }));

    console.log('✅ Chat sessions listed:', sessions.length);
    return NextResponse.json({ success: true, sessions });
  } catch (error) {
    console.error('❌ Chat session list error:', error);
    return NextResponse.json(
      {
        error: 'Failed to list chat sessions',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

