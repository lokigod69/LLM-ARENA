// ElevenLabs TTS API Integration
// - Implemented POST handler to receive text, personaId, and optional modelName
// - Calls ElevenLabs API to generate audio from text
// - Supports both persona voices (unique per persona) and model voices (shared per model)
// - Includes error handling, rate limiting, and caching support
// - Returns audio blob in MP3 format

import { NextResponse } from 'next/server';
import { PERSONAS } from '@/lib/personas';
import { MODEL_CONFIGS } from '@/lib/orchestrator';

export async function POST(request: Request) {
  try {
    const { text, personaId, modelName } = await request.json();

    // LOG: What we received
    console.log('🎤 TTS API called with:', {
      personaId: personaId || 'NONE',
      modelName: modelName || 'NONE',
      textPreview: text?.substring(0, 50) + '...' || 'NO TEXT',
    });

    if (!text) {
      console.error('❌ TTS API: Missing text parameter');
      return new NextResponse('Missing text', { status: 400 });
    }

    // Get voice ID from persona or model
    let voiceId: string | undefined;
    let voiceSource: 'persona' | 'model' | 'none' = 'none';
    
    if (personaId) {
      // Priority 1: Use persona voice if personaId is provided
      console.log('🔍 TTS API: Looking up persona:', personaId);
      const persona = PERSONAS[personaId];
      if (!persona) {
        console.error('❌ TTS API: Persona not found:', personaId);
        return new NextResponse('Persona not found', { status: 404 });
      }
      voiceId = persona.elevenLabsVoiceId;
      voiceSource = 'persona';
      console.log('✅ TTS API: Found persona voice:', {
        personaId,
        personaName: persona.name,
        voiceId: voiceId || 'MISSING',
      });
    } else if (modelName) {
      // Priority 2: Use model voice if modelName is provided
      console.log('🔍 TTS API: Looking up model:', modelName);
      const modelConfig = MODEL_CONFIGS[modelName as keyof typeof MODEL_CONFIGS];
      if (modelConfig && 'elevenLabsVoiceId' in modelConfig) {
        voiceId = (modelConfig as any).elevenLabsVoiceId;
        voiceSource = 'model';
        console.log('✅ TTS API: Found model voice:', {
          modelName,
          voiceId: voiceId || 'MISSING',
        });
      } else {
        console.error('❌ TTS API: Model config not found or missing voice ID:', modelName);
      }
    }

    if (!voiceId) {
      console.error('❌ TTS API: No voice ID available');
      return new NextResponse('No voice ID available. Please provide personaId or modelName with configured voice.', { status: 400 });
    }

    console.log('🎯 TTS API: Using voice:', {
      voiceId,
      voiceSource,
      personaId: personaId || 'NONE',
      modelName: modelName || 'NONE',
    });

    // Get ElevenLabs API key from environment
    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) {
      console.error('ELEVENLABS_API_KEY not configured');
      return new NextResponse('TTS service not configured', { status: 503 });
    }

    // Call ElevenLabs API
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: {
        'Accept': 'audio/mpeg',
        'Content-Type': 'application/json',
        'xi-api-key': apiKey,
      },
      body: JSON.stringify({
        text: text,
        model_id: 'eleven_monolingual_v1', // Use monolingual for better quality
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
          style: 0.0,
          use_speaker_boost: true,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('ElevenLabs API error:', response.status, errorText);
      
      if (response.status === 401) {
        return new NextResponse('Invalid ElevenLabs API key', { status: 401 });
      } else if (response.status === 429) {
        return new NextResponse('Rate limit exceeded. Please try again later.', { status: 429 });
      } else if (response.status === 404) {
        return new NextResponse('Voice ID not found', { status: 404 });
      }
      
      return new NextResponse(`ElevenLabs API error: ${response.status}`, { status: response.status });
    }

    // Get audio blob
    const audioBlob = await response.blob();

    // Return audio blob
    return new NextResponse(audioBlob, {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'public, max-age=31536000, immutable', // Cache for 1 year
      },
    });

  } catch (error) {
    const err = error instanceof Error ? error.message : 'An unknown error occurred';
    console.error('TTS API error:', err);
    return new NextResponse(`Internal Server Error: ${err}`, { status: 500 });
  }
}
