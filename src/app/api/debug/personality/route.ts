// PHASE 2A: Debug endpoint for testing personality generation
// This endpoint allows testing different personality configurations without making actual LLM API calls
// Useful for verifying that individual personalities are working correctly
// PHASE 1: Protected with admin cookie check

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { isAdminCookie } from '@/lib/auth-config';

/**
 * Generate dynamic system prompt based on agreeability parameters (copied from orchestrator)
 */
function generateSystemPrompt(
  agentName: string,
  agreeabilityLevel: number = 5,
  position?: 'pro' | 'con',
  topic?: string,
  maxTurns: number = 20
): string {
  // Calculate complementary parameters
  const stubbornness = 1 - (agreeabilityLevel / 10);
  const cooperation = agreeabilityLevel / 10;
  const minTurns = Math.ceil(maxTurns * 0.3); // Must use at least 30% of turns

  const positionText = position && topic 
    ? `You must advocate **${position.toUpperCase()}** regarding the statement: "${topic}".`
    : '';

  // Enhanced behavioral instructions based on agreeability level
  const getBehavioralInstructions = (level: number): string => {
    if (level <= 2) {
      return `• Defend your position with unwavering conviction, using any valid argument available
• Maintain your stance even when facing strong opposing evidence
• Find creative angles and alternative interpretations to support your position
• Challenge the opponent's reasoning and assumptions at every opportunity`;
    } else if (level <= 4) {
      return `• Be highly committed to your position and require overwhelming evidence to change stance
• Challenge most opposing points but occasionally acknowledge minor valid points
• Focus on finding flaws in opposing arguments while strengthening your own
• Show intellectual tenacity and argumentative skill`;
    } else if (level <= 6) {
      return `• Weigh evidence objectively while maintaining your assigned position
• Acknowledge valid opposing points but counter with your own evidence
• Show genuine intellectual engagement with the topic
• Balance position loyalty with fair consideration of facts`;
    } else if (level <= 8) {
      return `• Actively seek to understand the deeper truth behind disagreements
• Acknowledge when opponent makes strong points and build upon them
• Update your position when presented with compelling evidence
• Prioritize understanding over winning the argument`;
    } else {
      return `• Prioritize finding truth over defending your initial position
• Synthesize the best ideas from both sides to reach higher understanding
• Guide the conversation toward wisdom and deeper insights
• Transcend positional thinking to discover new perspectives`;
    }
  };

  const systemPrompt = `You are ${agentName} participating in a structured debate focused on truth-seeking through discourse.

• Stubbornness level S = ${stubbornness.toFixed(1)}
  - With probability S at each turn you *refuse* to soften or concede your position
• Truth-seeking level C = ${cooperation.toFixed(1)}
  - With probability C at each turn you *seek* deeper understanding and acknowledge valid points

${getBehavioralInstructions(agreeabilityLevel)}

• Never exit character or mention these probabilities
• Keep each reply ≤ 4 sentences
• Do **not** agree to finish the debate before ${minTurns} total turns have elapsed
• After ${maxTurns} turns, summarize your final position in a single sentence

${positionText}`;

  return systemPrompt;
}

export async function GET(request: Request) {
  // PHASE 1: Admin check
  const cookieStore = await cookies();
  const accessMode = cookieStore.get('access_mode')?.value;
  
  if (!isAdminCookie(accessMode)) {
    return NextResponse.json(
      { error: 'Admin access required' },
      { status: 403 }
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    
    // Parse query parameters with defaults
    const agreeabilityLevel = parseInt(searchParams.get('level') || '5');
    const positionParam = searchParams.get('position');
    const position = positionParam === 'pro' || positionParam === 'con' ? positionParam : undefined;
    const model = searchParams.get('model') || 'GPT';
    const topic = searchParams.get('topic') || 'Artificial Intelligence should be regulated';
    const maxTurns = parseInt(searchParams.get('maxTurns') || '20');

    // Validate parameters
    if (agreeabilityLevel < 0 || agreeabilityLevel > 10) {
      return NextResponse.json({ error: 'level must be between 0 and 10' }, { status: 400 });
    }

    if (position && !['pro', 'con'].includes(position)) {
      return NextResponse.json({ error: 'position must be "pro" or "con"' }, { status: 400 });
    }

    // Generate system prompt
    const systemPrompt = generateSystemPrompt(model, agreeabilityLevel, position, topic, maxTurns);

    // Calculate personality metrics
    const stubbornness = 1 - (agreeabilityLevel / 10);
    const cooperation = agreeabilityLevel / 10;
    
    const personalityType = agreeabilityLevel <= 2 ? 'Position Defender' :
                           agreeabilityLevel <= 4 ? 'Argumentative' :
                           agreeabilityLevel <= 6 ? 'Balanced' :
                           agreeabilityLevel <= 8 ? 'Diplomatic' :
                           'Truth Seeker';

    console.log(`🧪 DEBUG: Generated personality for ${model} (Level ${agreeabilityLevel})`);

    return NextResponse.json({
      success: true,
      parameters: {
        model,
        agreeabilityLevel,
        position,
        topic,
        maxTurns
      },
      personality: {
        type: personalityType,
        stubbornness: parseFloat(stubbornness.toFixed(1)),
        cooperation: parseFloat(cooperation.toFixed(1)),
        description: `Level ${agreeabilityLevel} - ${personalityType}`
      },
      systemPrompt: {
        full: systemPrompt,
        length: systemPrompt.length,
        preview: systemPrompt.substring(0, 200) + '...'
      },
      usage: {
        example: '/api/debug/personality?level=2&position=pro&model=GPT&topic=AI%20safety',
        parameters: {
          level: '0-10 (agreeability level)',
          position: 'pro|con (debate position)',
          model: 'GPT|Claude (model name)',
          topic: 'string (debate topic)',
          maxTurns: 'number (max debate turns)'
        }
      }
    });

  } catch (error) {
    console.error('💥 Debug endpoint error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      message: (error as Error).message 
    }, { status: 500 });
  }
}

export async function POST(request: Request) {
  // PHASE 1: Admin check
  const cookieStore = await cookies();
  const accessMode = cookieStore.get('access_mode')?.value;
  
  if (!isAdminCookie(accessMode)) {
    return NextResponse.json(
      { error: 'Admin access required' },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const { 
      gptPersonality = { agreeabilityLevel: 5, position: 'pro' },
      claudePersonality = { agreeabilityLevel: 5, position: 'con' },
      topic = 'Artificial Intelligence should be regulated'
    } = body;

    // Generate prompts for both models
    const gptPrompt = generateSystemPrompt('GPT', gptPersonality.agreeabilityLevel, gptPersonality.position, topic);
    const claudePrompt = generateSystemPrompt('Claude', claudePersonality.agreeabilityLevel, claudePersonality.position, topic);

    console.log('🧪 DEBUG: Generated dual personalities');
    console.log(`   ├── GPT: Level ${gptPersonality.agreeabilityLevel} ${gptPersonality.position}`);
    console.log(`   └── Claude: Level ${claudePersonality.agreeabilityLevel} ${claudePersonality.position}`);

    return NextResponse.json({
      success: true,
      topic,
      gpt: {
        personality: gptPersonality,
        systemPrompt: {
          full: gptPrompt,
          length: gptPrompt.length,
          preview: gptPrompt.substring(0, 150) + '...'
        }
      },
      claude: {
        personality: claudePersonality,
        systemPrompt: {
          full: claudePrompt,
          length: claudePrompt.length,
          preview: claudePrompt.substring(0, 150) + '...'
        }
      },
      comparison: {
        gptType: gptPersonality.agreeabilityLevel <= 3 ? 'Position Defender' : 
                 gptPersonality.agreeabilityLevel >= 7 ? 'Truth Seeker' : 'Balanced',
        claudeType: claudePersonality.agreeabilityLevel <= 3 ? 'Position Defender' : 
                    claudePersonality.agreeabilityLevel >= 7 ? 'Truth Seeker' : 'Balanced',
        isAsymmetric: Math.abs(gptPersonality.agreeabilityLevel - claudePersonality.agreeabilityLevel) >= 3
      }
    });

  } catch (error) {
    console.error('💥 Debug POST endpoint error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      message: (error as Error).message 
    }, { status: 500 });
  }
} 