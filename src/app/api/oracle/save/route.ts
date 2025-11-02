// Save Oracle Analysis Endpoint
// Saves completed Oracle analyses to Supabase database
// Returns 503 if Supabase not configured (graceful degradation)

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
      modelAName,
      modelBName,
      modelADisplayName,
      modelBDisplayName,
      oracleModel,
      verdict,
      confidence,
      analysis,
      agreeabilityLevel,
      extensivenessLevel,
      maxTurns,
      actualTurns,
      accessToken,
      debateId
    } = body;

    // Save to Supabase
    const { data, error } = await supabase!
      .from('oracle_analyses')
      .insert({
        topic,
        model_a_name: modelAName,
        model_b_name: modelBName,
        model_a_display_name: modelADisplayName,
        model_b_display_name: modelBDisplayName,
        oracle_model: oracleModel,
        verdict: verdict || null,
        confidence: confidence || null,
        analysis: analysis, // Full analysis JSON
        agreeability_level: agreeabilityLevel || null,
        extensiveness_level: extensivenessLevel || null,
        max_turns: maxTurns || null,
        actual_turns: actualTurns || null,
        access_token: accessToken || null,
        debate_id: debateId || null
      })
      .select()
      .single();

    if (error) {
      console.error('❌ Supabase Oracle save error:', error);
      return NextResponse.json(
        { error: 'Failed to save Oracle analysis', details: error.message },
        { status: 500 }
      );
    }

    console.log('✅ Oracle analysis saved to Supabase:', data.id);
    return NextResponse.json({ success: true, id: data.id });
  } catch (error: any) {
    console.error('❌ Save Oracle analysis error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

