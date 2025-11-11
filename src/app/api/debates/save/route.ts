// Save Debate Endpoint
// Saves completed debates to Supabase database
// Returns 503 if Supabase not configured (graceful degradation)
// Access code tracking: stores provided access codes for analytics

import { NextRequest, NextResponse } from 'next/server';
import { supabase, isSupabaseEnabled } from '@/lib/supabase';

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
    
    const {
      topic,
      maxTurns,
      actualTurns,
      modelAName,
      modelBName,
      modelADisplayName,
      modelBDisplayName,
      agreeabilityLevel,
      extensivenessLevel,
      messages,
      oracleAnalysis,
      accessCode,
      debateDurationSeconds,
      totalTokensUsed
    } = body;

    // Save to Supabase
    const { data, error } = await supabase!
      .from('debates')
      .insert({
        topic,
        max_turns: maxTurns,
        actual_turns: actualTurns,
        model_a_name: modelAName,
        model_b_name: modelBName,
        model_a_display_name: modelADisplayName,
        model_b_display_name: modelBDisplayName,
        agreeability_level: agreeabilityLevel,
        extensiveness_level: extensivenessLevel,
        messages: messages,
        oracle_analysis: oracleAnalysis || null,
        access_code: accessCode || null,
        debate_duration_seconds: debateDurationSeconds || null,
        total_tokens_used: totalTokensUsed || null
      })
      .select()
      .single();

    if (error) {
      console.error('❌ Supabase save error:', error);
      return NextResponse.json(
        { error: 'Failed to save debate', details: error.message },
        { status: 500 }
      );
    }

    console.log('✅ Debate saved to Supabase:', data.id);
    return NextResponse.json({ success: true, id: data.id });
  } catch (error: any) {
    console.error('❌ Save debate error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

