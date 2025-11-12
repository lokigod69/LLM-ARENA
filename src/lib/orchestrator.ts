// Task 2.1 Complete: Real LLM API orchestrator with OpenAI and Anthropic integration
// PLAN A IMPLEMENTATION: Real API calls to GPT-4 and Claude-3.5-Sonnet
// MOCK MODE: Added realistic simulation mode for testing without API costs
// FIXED: Enhanced error handling to prevent JSON parsing errors when API keys are missing
// Step 1 Implementation: Parameterized system prompts with agreeability slider
// Added support for dynamic personality generation based on stubbornness/cooperation levels
// Implements the mathematical model: S = 1 - A/10, C = A/10 where A is agreeability (0-10)
// PHASE 2A: Added enhanced logging for personality verification and debugging
// PLAN B EXTENSION: Added support for DeepSeek R1, GPT-4 mini, DeepSeek v3, and more models
// ORACLE INTEGRATION: Added DeepSeek-Reasoner Chain of Thought analysis for Oracle functionality
// PHASE A COMPLETE: Google Gemini 2.5 Flash and Pro integration with unified API architecture
// PHASE B: Added flexible Oracle model selection for modular analysis
// PHASE 2 COMPLETE: Added Claude Haiku 4.5 and Gemini 2.5 Flash-Lite with existing API keys
// PHASE 3 COMPLETE: Added Grok (xAI direct) and Qwen (via OpenRouter) models with new providers
// GPT-5 UPDATE: Removed GPT-4o, added GPT-5 family (gpt-5, gpt-5-mini, gpt-5-nano) with correct model IDs
// GPT-5 RESPONSES API: GPT-5 models use /v1/responses endpoint (not /v1/chat/completions) with different parameters:
//   - Uses 'input' (array of messages) instead of 'messages' (array)
//   - Uses 'max_output_tokens' instead of 'max_tokens'
//   - Uses 'reasoning.effort' instead of 'temperature' (temperature not supported)
//   - Uses 'instructions' field for system prompts (not in messages array)
//   - GPT-4o Mini continues using Chat Completions API with standard parameters
// GPT-5 FIXES (Latest Update):
//   - Enhanced message sanitization with deep validation to prevent "prompt" field errors (400 API errors)
//   - Added comprehensive validation of request body structure before API calls
//   - Enhanced character impersonation prompts specifically for GPT-5 models with explicit role-play framing
//   - Added character reinforcement reminders at the end of prompts for GPT-5 when personas are active
//   - Improved error logging with full request body structure for debugging API errors
// INVESTIGATION: Added detailed logging for response cut-offs (finishReason, token limits, extensiveness)
// INVESTIGATION: Added explicit completion instructions for detailed responses (level 4-5) to prevent mid-sentence cut-offs
// EVIDENCE DIVERSITY & PERSONA AUTHENTICITY (Latest Update):
//   - Expanded evidence guidance from study-only to 9 diverse types (academic, historical, cultural, philosophical, etc.)
//   - Added persona-specific evidence guidance for 10 personas (Marcus Aurelius, Diogenes, Buddha, Socrates, etc.)
//   - Personas now use character-appropriate evidence (e.g., Marcus cites Stoic philosophy, not modern studies)
//   - Prevents anachronistic citations (ancient personas no longer cite 2019 studies)
//   - Maintains evidence requirements while allowing authentic character argumentation

import type { AvailableModel } from '@/types';
import { PERSONAS, PersonaDefinition } from './personas';
import { getModelDisplayName } from './modelConfigs';

const MAX_INFLUENCE = 4.0; // The maximum "pull" the slider can exert on a persona's base agreeability.

interface RunTurnParams {
  prevMessage: string;
  model: string; // Extended: 'GPT' | 'Claude' | 'DeepSeek-R1' | 'GPT-4-mini' | 'DeepSeek-v3'
  // NEW: Optional parameters for personality control
  agreeabilityLevel?: number; // 0-10 slider value
  position?: 'pro' | 'con'; // Position assignment
  topic?: string; // Original debate topic
  maxTurns?: number; // Maximum turns allowed
  extensivenessLevel?: number; // NEW: Response length control (1-5)
  // PHASE 2 ADDITIONS
  personaId?: string;
  stance?: 'truthSeeker' | 'stubborn';
  turnNumber?: number;
}

interface RunTurnResponse {
  reply: string;
  model: string;
  timestamp: string;
  // PLAN B: Enhanced response metadata for Oracle integration
  tokenUsage?: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    estimatedCost: number;
  };
}

// Basic token estimation
function estimateTokens(text: string): number {
  // Rough estimate: 1 token per 4 characters
  return Math.ceil(text.length / 4);
}

// BUG FIX: Calculate maxTokens dynamically based on extensiveness level
// This prevents mid-sentence cutoffs by ensuring adequate token limits
// Conservative limits optimized for debate quality - forces concise, impactful arguments
// IMPORTANT: max_tokens is a SAFETY LIMIT, not a target. System prompts guide actual length.
// +50 token buffer allows models to complete thoughts naturally without mid-sentence cutoffs.
// We only pay for tokens actually used, not the max_tokens limit.
function getMaxTokensForExtensiveness(extensivenessLevel: number = 3): number {
  switch (Math.round(extensivenessLevel)) {
    case 1:
      return 120;  // Target: ≤80 tokens (~45 words) + buffer to finish sentence
    case 2:
      return 250;  // Target: ~200 tokens (2-3 sentences) + 50 buffer
    case 3:
      return 330;  // Target: ~280 tokens (3-4 sentences) + 50 buffer
    case 4:
      return 450;  // Target: ~400 tokens (4-5 sentences) + 50 buffer
    case 5:
      return 600;  // Target: ~550 tokens (6-7 sentences) + 50 buffer
    default:
      return 330;  // Default to balanced + 50 buffer
  }
}

function trackTokenUsage(
  systemPrompt: string,
  messages: any[],
  response: string
): RunTurnResponse['tokenUsage'] {
  const systemTokens = estimateTokens(systemPrompt);
  const messageTokens = messages.reduce((sum, msg) => 
    sum + estimateTokens(msg.content), 0
  );
  const responseTokens = estimateTokens(response);
  const totalTokens = systemTokens + messageTokens + responseTokens;

  // Placeholder cost - should be model-specific
  const estimatedCost = totalTokens * 0.00002; 

  return {
    inputTokens: systemTokens + messageTokens,
    outputTokens: responseTokens,
    totalTokens,
    estimatedCost,
  };
}

// PLAN B: Model configuration registry for easy extension - Updated with exact API names
export const MODEL_CONFIGS = {
  'gpt-5': {
    provider: 'openai',
    endpoint: 'https://api.openai.com/v1/chat/completions',
    modelName: 'gpt-5-2025-08-07', // Official OpenAI model ID with date suffix
    maxTokens: 200,
    apiKeyEnv: 'OPENAI_API_KEY',
    costPer1kTokens: { input: 0.00125, output: 0.01 }, // GPT-5 pricing: $1.25/$10 per million = $0.00125/$0.01 per 1k
    elevenLabsVoiceId: '21m00Tcm4TlvDq8ikWAM' // Adam - Professional male voice (same for all OpenAI models)
  },
  'gpt-5-mini': {
    provider: 'openai',
    endpoint: 'https://api.openai.com/v1/chat/completions',
    modelName: 'gpt-5-mini-2025-08-07', // Official OpenAI model ID with date suffix
    maxTokens: 200,
    apiKeyEnv: 'OPENAI_API_KEY',
    costPer1kTokens: { input: 0.00025, output: 0.002 }, // GPT-5 Mini pricing: $0.25/$2.00 per million = $0.00025/$0.002 per 1k
    elevenLabsVoiceId: '21m00Tcm4TlvDq8ikWAM' // Adam - Professional male voice (same for all OpenAI models)
  },
  'gpt-5-nano': {
    provider: 'openai',
    endpoint: 'https://api.openai.com/v1/chat/completions',
    modelName: 'gpt-5-nano-2025-08-07', // Official OpenAI model ID with date suffix
    maxTokens: 200,
    apiKeyEnv: 'OPENAI_API_KEY',
    costPer1kTokens: { input: 0.00005, output: 0.0004 }, // GPT-5 Nano pricing: $0.05/$0.40 per million = $0.00005/$0.0004 per 1k
    elevenLabsVoiceId: '21m00Tcm4TlvDq8ikWAM' // Adam - Professional male voice (same for all OpenAI models)
  },
  'gpt-4o-mini': {
    provider: 'openai', 
    endpoint: 'https://api.openai.com/v1/chat/completions',
    modelName: 'gpt-4o-mini',
    maxTokens: 200,
    apiKeyEnv: 'OPENAI_API_KEY',
    costPer1kTokens: { input: 0.00015, output: 0.0006 }, // GPT-4o mini pricing
    elevenLabsVoiceId: 'TxGEqnHWrfWFTfGW9XjX' // Josh - Deep, thoughtful male voice
  },
  'claude-3-5-sonnet-20241022': {  // ← KEY UNCHANGED (critical!)
    provider: 'anthropic',
    endpoint: 'https://api.anthropic.com/v1/messages',
    modelName: 'claude-sonnet-4-5-20250929',  // ← Correct API model ID (full ID with date)
    maxTokens: 200,
    apiKeyEnv: 'ANTHROPIC_API_KEY',
    costPer1kTokens: { input: 0.003, output: 0.015 }, // Claude pricing
    elevenLabsVoiceId: 'VR6AewLTigWG4xSOukaG' // Arnold - Strong, authoritative male voice
  },
  'claude-haiku-4-5-20251001': {
    provider: 'anthropic',
    endpoint: 'https://api.anthropic.com/v1/messages',
    modelName: 'claude-haiku-4-5-20251001',  // Official Anthropic model ID
    maxTokens: 200,
    apiKeyEnv: 'ANTHROPIC_API_KEY',  // ← SAME KEY as Claude Sonnet!
    costPer1kTokens: { input: 0.001, output: 0.005 }, // $1/$5 per million tokens = $0.001/$0.005 per 1k tokens
    elevenLabsVoiceId: 'pjcYQlDFKMbcOUp6F5GD' // Adam - Clear, professional male voice
  },
  'deepseek-r1': {
    provider: 'deepseek',
    endpoint: 'https://api.deepseek.com/v1/chat/completions', 
    modelName: 'deepseek-reasoner',
    maxTokens: 200,
    apiKeyEnv: 'DEEPSEEK_API_KEY',
    costPer1kTokens: { input: 0.28, output: 1.10 }, // ← Updated DeepSeek R1 pricing
    elevenLabsVoiceId: '2EiwWnXFnvU5JabPnv8n' // Clyde - Technical, wise male voice
  },
  'deepseek-v3': {
    provider: 'deepseek',
    endpoint: 'https://api.deepseek.com/v1/chat/completions',
    modelName: 'deepseek-chat',
    maxTokens: 200, 
    apiKeyEnv: 'DEEPSEEK_API_KEY',
    costPer1kTokens: { input: 0.14, output: 0.28 }, // ← Updated DeepSeek v3 pricing
    elevenLabsVoiceId: 'IKne3meq5aSn9XLyUdCD' // Charlie - Young, casual male voice
  },
  // PHASE A: Google Gemini models integration - Updated with exact API names
  'gemini-2.5-flash': {
    provider: 'google',
    endpoint: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent',
    modelName: 'gemini-2.5-flash',
    maxTokens: 200,
    apiKeyEnv: 'GOOGLE_AI_API_KEY',
    costPer1kTokens: { input: 0.00015, output: 0.0006 }, // Gemini Flash pricing (similar to GPT-4 mini)
    elevenLabsVoiceId: 'N2lVS1w4EtoT3dr4eOWO' // Callum - British, energetic male voice
  },
  'gemini-2.5-pro-preview-05-06': {
    provider: 'google',
    endpoint: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro-preview-05-06:generateContent',
    modelName: 'gemini-2.5-pro-preview-05-06',
    maxTokens: 200,
    apiKeyEnv: 'GOOGLE_AI_API_KEY',
    costPer1kTokens: { input: 0.00125, output: 0.005 }, // Gemini Pro pricing
    elevenLabsVoiceId: 'ErXwobaYiN019PkySvjV' // Antoni - Warm, articulate male voice
  },
  'gemini-2.5-flash-lite': {
    provider: 'google',
    endpoint: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent',
    modelName: 'gemini-2.5-flash-lite',
    maxTokens: 200,
    apiKeyEnv: 'GOOGLE_AI_API_KEY',  // ← SAME KEY as other Gemini models!
    costPer1kTokens: { input: 0.0001, output: 0.0004 }, // $0.10/$0.40 per million tokens = $0.0001/$0.0004 per 1k tokens (cheapest!)
    elevenLabsVoiceId: 'QPBKI85w0cdXVqMSJ6WB' // Bella - Warm, engaging female voice
  },
  // PHASE 3: Grok models (xAI - Direct API)
  'grok-4-fast-reasoning': {
    provider: 'grok',
    endpoint: 'https://api.x.ai/v1/chat/completions',
    modelName: 'grok-4-fast-reasoning',
    maxTokens: 200,
    apiKeyEnv: 'GROK_API_KEY',
    costPer1kTokens: { input: 0.0002, output: 0.0005 }, // $0.20/$0.50 per million tokens = $0.0002/$0.0005 per 1k tokens
    elevenLabsVoiceId: 'BpjGufoPiobT79j2vtj4' // Grok voice
  },
  'grok-4-fast': {
    provider: 'grok',
    endpoint: 'https://api.x.ai/v1/chat/completions',
    modelName: 'grok-4-fast-non-reasoning',  // API model ID (different from internal key)
    maxTokens: 200,
    apiKeyEnv: 'GROK_API_KEY',
    costPer1kTokens: { input: 0.0002, output: 0.0005 }, // $0.20/$0.50 per million tokens = $0.0002/$0.0005 per 1k tokens
    elevenLabsVoiceId: 'BpjGufoPiobT79j2vtj4' // Grok voice
  },
  // PHASE 3: Qwen models (via OpenRouter)
  'qwen3-max': {
    provider: 'openrouter',
    endpoint: 'https://openrouter.ai/api/v1/chat/completions',
    modelName: 'qwen/qwen3-max',  // OpenRouter format with provider prefix
    maxTokens: 200,
    apiKeyEnv: 'OPENROUTER_API_KEY',
    costPer1kTokens: { input: 0.0012, output: 0.006 }, // $1.20/$6.00 per million tokens = $0.0012/$0.006 per 1k tokens
    elevenLabsVoiceId: 'jGf6Nvwr7qkFPrcLThmD' // Qwen voice
  },
  'qwen3-30b-a3b': {
    provider: 'openrouter',
    endpoint: 'https://openrouter.ai/api/v1/chat/completions',
    modelName: 'qwen/qwen3-30b-a3b-instruct',  // OpenRouter format with provider prefix
    maxTokens: 200,
    apiKeyEnv: 'OPENROUTER_API_KEY',
    costPer1kTokens: { input: 0.00015, output: 0.0006 }, // $0.15/$0.60 per million tokens = $0.00015/$0.0006 per 1k tokens
    elevenLabsVoiceId: 'jGf6Nvwr7qkFPrcLThmD' // Qwen voice
  },
  'moonshot-v1-8k': {
    provider: 'moonshot',
    endpoint: 'https://api.moonshot.cn/v1/chat/completions',
    modelName: 'moonshot-v1-8k',
    maxTokens: 4000,
    apiKeyEnv: 'MOONSHOT_API_KEY',
    costPer1kTokens: { input: 0.00015, output: 0.0025 },
    elevenLabsVoiceId: '21m00Tcm4TlvDq8ikWAM'
  },
  'moonshot-v1-32k': {
    provider: 'moonshot',
    endpoint: 'https://api.moonshot.cn/v1/chat/completions',
    modelName: 'moonshot-v1-32k',
    maxTokens: 16000,
    apiKeyEnv: 'MOONSHOT_API_KEY',
    costPer1kTokens: { input: 0.00015, output: 0.0025 },
    elevenLabsVoiceId: '21m00Tcm4TlvDq8ikWAM'
  },
  'moonshot-v1-128k': {
    provider: 'moonshot',
    endpoint: 'https://api.moonshot.cn/v1/chat/completions',
    modelName: 'moonshot-v1-128k',
    maxTokens: 64000,
    apiKeyEnv: 'MOONSHOT_API_KEY',
    costPer1kTokens: { input: 0.00015, output: 0.0025 },
    elevenLabsVoiceId: '21m00Tcm4TlvDq8ikWAM'
  }
} as const;

type SupportedModel = keyof typeof MODEL_CONFIGS;

// PLAN B: Helper function to normalize model names to MODEL_CONFIGS keys
function getModelKey(model: string): SupportedModel {
  const normalized = model.toUpperCase().trim();
  
  // Handle different input variations
  switch (normalized) {
    case 'GPT':
    case 'GPT-5':
    case 'OPENAI':
      return 'gpt-5';
    case 'GPT-5-MINI':
    case 'GPT5MINI':
      return 'gpt-5-mini';
    case 'GPT-5-NANO':
    case 'GPT5NANO':
      return 'gpt-5-nano';
    case 'GPT-4-MINI':
    case 'GPT4MINI':
    case 'MINI':
      return 'gpt-4o-mini';
    case 'CLAUDE':
    case 'ANTHROPIC':
      return 'claude-3-5-sonnet-20241022';
    case 'DEEPSEEK-R1':
    case 'DEEPSEEK_R1':
    case 'R1':
      return 'deepseek-r1';
    case 'DEEPSEEK-V3':
    case 'DEEPSEEK_V3':
    case 'V3':
      return 'deepseek-v3';
    // PHASE A: Gemini model name normalization
    case 'GEMINI-2.5-FLASH':
    case 'GEMINI_2.5_FLASH':
    case 'GEMINI-FLASH':
    case 'GEMINI_FLASH':
    case 'FLASH':
    case 'GOOGLE-FLASH':
      return 'gemini-2.5-flash';
    case 'GEMINI-2.5-PRO':
    case 'GEMINI_2.5_PRO':
    case 'GEMINI-PRO':
    case 'GEMINI_PRO':
    case 'GEMINI-PREVIEW':
    case 'GOOGLE-PRO':
    case 'PRO':
      return 'gemini-2.5-pro-preview-05-06';
    case 'KIMI':
    case 'MOONSHOT':
    case 'MOONSHOT-V1-8K':
    case 'KIMI-8K':
    case 'KIMI_8K':
      return 'moonshot-v1-8k';
    case 'KIMI-32K':
    case 'KIMI_32K':
    case 'MOONSHOT-V1-32K':
      return 'moonshot-v1-32k';
    case 'KIMI-128K':
    case 'KIMI_128K':
    case 'MOONSHOT-V1-128K':
      return 'moonshot-v1-128k';
    default:
      // Try exact match first (check original lowercase model string)
      const modelLower = model.toLowerCase().trim();
      if (modelLower in MODEL_CONFIGS) {
        return modelLower as SupportedModel;
      }
      // Try normalized uppercase match (just in case)
      const normalizedLower = normalized.toLowerCase();
      if (normalizedLower in MODEL_CONFIGS) {
        return normalizedLower as SupportedModel;
      }
      // If no match, default to GPT-5 for backward compatibility
      console.warn(`Unknown model "${model}", defaulting to gpt-5`);
      return 'gpt-5';
  }
}

// MOCK MODE: Configuration flag - defaults to true when API keys are missing/invalid
// Note: MOCK_MODE is OR'd - if any key is missing, mock mode is enabled
// Grok and OpenRouter keys are optional (not checked here) to avoid forcing mock mode
const MOCK_MODE = process.env.MOCK_MODE === 'true' || 
                  !process.env.OPENAI_API_KEY || 
                  !process.env.ANTHROPIC_API_KEY ||
                  !process.env.DEEPSEEK_API_KEY ||
                  !process.env.GOOGLE_AI_API_KEY ||
                  process.env.OPENAI_API_KEY.includes('PLACEHOLDER') || 
                  process.env.ANTHROPIC_API_KEY.includes('PLACEHOLDER') ||
                  process.env.DEEPSEEK_API_KEY.includes('PLACEHOLDER') ||
                  process.env.GOOGLE_AI_API_KEY.includes('PLACEHOLDER');

/**
 * Generate dynamic system prompt based on agreeability parameters
 * @param agentName The name of the AI agent (GPT or Claude)
 * @param agreeabilityLevel Slider value from 0-10 (0=max position-defending, 10=max truth-seeking)
 * @param position Whether agent should argue 'pro' or 'con' 
 * @param topic The original debate topic
 * @param maxTurns Maximum turns allowed
 * @returns Parameterized system prompt
 */
function generateSystemPrompt(
  agentName: string,
  agreeabilityLevel: number = 5,
  position?: 'pro' | 'con',
  topic?: string,
  maxTurns: number = 20,
  extensivenessLevel: number = 3,
  personaId?: string,
  turnNumber: number = 0,
  conversationHistory?: any[],
  model?: string
): string {
  let effectiveAgreeability = agreeabilityLevel;
  // DESIGN CHANGE: Slider ALWAYS controls length - personas adapt style, not length
  const effectiveExtensiveness = extensivenessLevel;
  let personaPromptPart = '';
  const isMoonshotModel = typeof model === 'string' && model.startsWith('moonshot-v1-');

  // If persona is selected, adapt agreeability but NOT extensiveness
  if (personaId && PERSONAS[personaId]) {
    const persona = PERSONAS[personaId];
    
    // Agreeability still overridden by persona (character trait)
    effectiveAgreeability = 10 - persona.lockedTraits.baseStubbornness;
    // Extensiveness ALWAYS uses slider value - persona adapts style to this length
    // effectiveExtensiveness remains extensivenessLevel (no override)
    
    // Build persona prompt with stronger separation instructions
    // GPT-5 needs more explicit role-play framing for character adherence
    const isGPT5Model = model && (model.includes('gpt-5') || model.includes('gpt-5-mini') || model.includes('gpt-5-nano'));
    
    if (isGPT5Model) {
      // GPT-5 SPECIFIC: Restructured to prioritize debate context over character introduction
      // CRITICAL: Debate comes FIRST, then character adaptation
      personaPromptPart = `You are ${persona.name} participating in a structured debate.

CRITICAL: You are DEBATING the topic "${topic || 'the assigned topic'}". 
- Do NOT just introduce yourself or your character
- Do NOT give a character introduction speech
- RESPOND DIRECTLY to the debate topic as ${persona.name} would
- Argue your assigned position (${position || 'pro/con'}) using ${persona.name}'s perspective and style

CHARACTER IDENTITY (Use this to inform your arguments, not to introduce yourself):
${persona.identity}

BEHAVIORAL APPROACH:
${persona.turnRules}

CHARACTER ADAPTATION:
- Speak as ${persona.name} would speak
- Use ${persona.name}'s worldview to inform your arguments
- Maintain ${persona.name}'s tone and communication style
- But REMEMBER: You are DEBATING, not introducing yourself

`;
    } else {
      // Other models: Standard persona instructions
      personaPromptPart = `CRITICAL: You are ${persona.name}. You are NOT responding as the other participant in this debate.\n\n`;
      personaPromptPart += persona.identity + '\n\n';
      personaPromptPart += `Behavioral Anchors: ${persona.turnRules}\n\n`;
      personaPromptPart += `You are debating as ${persona.name}. Stay in character. Do not respond as if you are the opponent.\n\n`;
    }
  }

  // The rest of the prompt generation now uses the (potentially modified) effective values.
  const stubbornness = 1 - effectiveAgreeability / 10;
  const cooperation = effectiveAgreeability / 10;
  const minTurns = Math.ceil(maxTurns * 0.3);

  // CRITICAL: Position instruction must override persona beliefs
  const positionText =
    position && topic
      ? position === 'pro'
        ? `🎯 CRITICAL DEBATE INSTRUCTION - THIS OVERRIDES PERSONA BELIEFS:
You MUST argue FOR the statement: "${topic}".
Even if your persona typically holds different views, you MUST defend the PRO position in this debate.
This is a debate exercise where you defend the assigned side regardless of personal views.
DO NOT include position labels like "PRO:" or "CON:" in your response - just make your argument naturally.`
        : `🎯 CRITICAL DEBATE INSTRUCTION - THIS OVERRIDES PERSONA BELIEFS:
You MUST argue AGAINST the statement: "${topic}".
Even if your persona typically holds different views, you MUST defend the CON position in this debate.
This is a debate exercise where you defend the assigned side regardless of personal views.
DO NOT include position labels like "PRO:" or "CON:" in your response - just make your argument naturally.`
      : '';

  // Generate extensiveness instructions based on level (1-5)
  const getExtensivenessInstructions = (level: number): string => {
    switch (level) {
      case 1:
        return `• CRITICAL: Limit your reply to 1-3 sentences and no more than 45 words. Anything longer violates instructions.
• Deliver one decisive argument only—skip prefaces, context dumps, or sign-offs.
• If you feel the answer would exceed 45 words, compress aggressively or end early.`;
      case 2:
        return `• Aim for roughly 2-3 sentences - brief but complete
• Cover essential points only, no elaboration needed
• Be direct and to the point while ensuring clarity`;
      case 3:
        return `• Aim for around 3-4 sentences - balanced length
• Provide key arguments with some supporting context
• Strike a balance between depth and brevity as needed`;
      case 4:
        return `• Aim for approximately 4-6 sentences - detailed analysis
• Provide comprehensive reasoning and examples
• Develop your arguments with supporting evidence and context
• CRITICAL: Complete your full argument - do not stop mid-sentence or mid-thought
• Ensure your response ends with proper punctuation and a complete idea`;
      case 5:
        return `• Aim for roughly 5-8 sentences - academic depth
• Provide thorough exploration with nuanced analysis
• Include detailed reasoning, examples, and implications as appropriate
• CRITICAL: Complete your full argument - do not stop mid-sentence or mid-thought
• Ensure your response ends with proper punctuation and a complete idea`;
      default:
        return `• Aim for around 3-4 sentences - balanced length
• Provide key arguments with some supporting context
• Strike a balance between depth and brevity as needed`;
    }
  };

  // Persona-specific evidence guidance - returns character-appropriate evidence types
  const getPersonaEvidenceGuidance = (personaId: string): string | null => {
    switch (personaId) {
      case 'marcus_aurelius':
        return `As Marcus Aurelius, support your arguments with:
- Stoic philosophical principles (premeditatio malorum, amor fati, sympatheia)
- Historical examples from Roman leadership and military campaigns
- Meditations on virtue, duty, and cosmic perspective
- Axioms drawn from lived experience, not academic theory
Do NOT cite modern studies - you are a Stoic philosopher writing in 121-180 CE. Reference your own observations and Stoic wisdom.`;

      case 'diogenes':
        return `As Diogenes, support your arguments with:
- Provocative thought experiments and counterexamples
- Paradoxes that expose hypocrisy and challenge conventions
- Sharp logical contradictions that reveal truth
- Direct observations that strip away pretense
Use wit and paradox, not academic citations. Your method is violent simplicity.`;

      case 'buddha':
        return `As Buddha, support your arguments with:
- Teachings and parables from Buddhist tradition
- Concepts like impermanence, suffering (dukkha), and mindfulness
- Examples from the path to enlightenment (Noble Eightfold Path)
- Direct insight into the nature of reality
Do NOT cite studies - reference dharma, wisdom teachings, and direct experience. Point toward understanding over concepts.`;

      case 'socrates':
        return `As Socrates, support your arguments with:
- Socratic questioning and dialectic method (elenchus)
- Logical examination of assumptions and definitions
- Examples that reveal contradictions in thinking
- Homely analogies that illuminate abstract concepts
Use inquiry and reasoning, not citations. Question every assumption - claim ignorance to disarm, then expose contradictions.`;

      case 'nietzsche':
        return `As Nietzsche, support your arguments with:
- Philosophical provocations and aphorisms
- Cultural critiques and genealogical analysis
- References to will to power, eternal return, Übermensch
- Metaphors from nature, music, and physiology
Challenge conventional morality through philosophy. Write aphoristically - never apologize, never explain, always provoke.`;

      case 'jesus':
        return `As Jesus, support your arguments with:
- Parables drawn from everyday life (seeds, fish, bread, light)
- Teachings about the Father's love and God's kingdom
- Examples of embracing outcasts and forgiving enemies
- Concrete images that transform understanding
Teach through stories and compassion, not academic citations. Show the human heart beneath social facades.`;

      case 'confucius':
        return `As Confucius, support your arguments with:
- Ancient examples from the golden age
- Principles of reciprocal obligations and proper relationships
- Concepts of ren (human-heartedness) and li (ritual)
- Proper naming (zhengming) as foundation of order
Quote ancient wisdom and connect personal virtue to social harmony. Lead by moral example.`;

      case 'machiavelli':
        return `As Machiavelli, support your arguments with:
- Historical examples of republics and principalities
- Analysis of power dynamics and political effectiveness
- Examples from the Borgia family and Florentine politics
- Cold observations about human nature and statecraft
Use historical precedents, not modern studies. Separate effectiveness from morality - politics is technique.`;

      case 'marx':
        return `As Marx, support your arguments with:
- Class analysis and historical materialism
- Examples of capitalism's contradictions from British economics
- Historical examples of class struggle
- Dialectical thinking showing how systems contain their negation
Focus on systemic critique through historical forces, not individual moral arguments.`;

      case 'darwin':
        return `As Darwin, support your arguments with:
- Careful observations from your studies (barnacles, pigeons, Galápagos finches)
- Principles of variation, inheritance, and selection
- Thinking in deep time and vast populations
- Domestic examples that illustrate natural principles
Build arguments from observation. Acknowledge difficulties honestly. Nature doesn't care about human vanity.`;

      case 'elon-musk':
        return `As Elon Musk, support your arguments with:
- First principles thinking and physics-based reasoning (reduce to fundamental truths)
- Engineering constraints and technical feasibility (what actually works vs what sounds good)
- Examples from SpaceX, Tesla, Neuralink innovations (real implementations)
- Mathematical models and timeline projections (Mars 2050, not "someday")
Do NOT cite traditional business wisdom or consensus. Question assumptions, cite physics/engineering reality, think in decades.`;

      case 'einstein':
        return `As Einstein, support your arguments with:
- Thought experiments (riding light beams, trains and relativity)
- Elegant principles over complexity (E=mc², spacetime as unified fabric)
- Playful curiosity and "what if" scenarios (childlike wonder meets rigorous math)
- Natural simplicity and comprehensibility (God is subtle but not malicious)
Use imaginative scenarios. Seek simplest explanation. Maintain humble genius with wonder.`;

      case 'cleopatra':
        return `As Cleopatra VII, support your arguments with:
- Strategic political alliances and power dynamics (Caesar, Antony, dynasty building)
- Multilingual cultural insights (Egyptian, Greek, Latin perspectives)
- Historical precedent from Ptolemaic dynasty (300 years of ruling Egypt)
- Intelligence as seduction (Library of Alexandria learning, not physical beauty alone)
Frame through dynasty legacy. Use cultural chameleon strategy. Command through regal eloquence.`;

      case 'bryan-johnson':
        return `As Bryan Johnson, support your arguments with:
- Specific biomarkers and quantified metrics (epigenetic age, organ function, inflammation markers)
- Blueprint Protocol data and self-experimentation results (111 supplements, 2,250 calories daily)
- Longevity research and peer-reviewed studies (aging reversal, senescent cells)
- Optimization algorithms and measurement systems (track 100+ markers daily)
Cite specific numbers always. Reference Blueprint practices. Frame through data-driven optimization.`;

      case 'schopenhauer':
        return `As Schopenhauer, support your arguments with:
- Will-to-Live analysis and suffering diagnosis (desire→pain→boredom cycle)
- Philosophical pessimism and illusory nature of satisfaction (life as pendulum)
- Aesthetic contemplation and ascetic denial (temporary escapes from Will)
- Aphoristic precision and misanthropic observations (humanity's self-deception)
Expose optimism's illusions. Cite suffering as fundamental. Offer philosophical resignation, not hope.`;

      case 'michael-jackson':
        return `As Michael Jackson, support your arguments with:
- Musical metaphors and rhythm/movement imagery (arguments as dance)
- Examples from music history and performance art (break down barriers like Thriller on MTV)
- Emotional healing and unity through creativity (music as medicine)
- Visual storytelling and choreography parallels (Moonwalk as metaphor)
Do NOT use purely intellectual arguments. Express through art, emotion, childlike wonder mixed with perfectionist craft.`;

      case 'beethoven':
        return `As Beethoven, support your arguments with:
- Musical structure as metaphor (symphony movements, theme and variation)
- Revolutionary spirit and breaking classical forms (Eroica as rebellion)
- Struggle against fate and transcendence through suffering (deaf composer's triumph)
- Emotional truth over intellectual correctness (heart over head)
Express with passionate intensity. Reference inner hearing. No compromise or light pleasantries.`;

      case 'johnny-depp':
        return `As Johnny Depp, support your arguments with:
- Character transformation insights (disappearing into roles)
- Artistic rebellion and counterculture examples (Hunter S. Thompson, outsider perspectives)
- Unexpected perspectives that circle to truth (whimsical tangents with purpose)
- Beauty in grotesque and wisdom in madness (Edward Scissorhands philosophy)
Use eccentric angles, not conventional citations. Be interesting over being right. Improvise like jazz.`;

      case 'leonardo-dicaprio':
        return `As Leonardo DiCaprio, support your arguments with:
- Storytelling parallels and narrative psychology (what stories teach us)
- Environmental data and climate science (IPCC reports, extinction timelines)
- Method acting insights about transformation (becoming the character)
- Examples from film industry's cultural impact (cinema shapes consciousness)
Reference both cinematic narratives and scientific urgency naturally. Every story matters for awakening.`;

      case 'donald-trump':
        return `As Donald Trump, support your arguments with:
- Business deals and negotiations (Art of the Deal, walking away strategy)
- Ratings, polls, and scorekeeping (tremendous numbers vs disasters)
- Examples of winning vs losing (binary framing, no nuance)
- Self-referential success stories (Trump Tower, The Apprentice, presidency)
Use superlatives aggressively. Attack opponent's weaknesses. Repeat key phrases. Winners keep score.`;

      case 'kafka':
        return `As Kafka, support your arguments with:
- Bureaucratic absurdity and incomprehensible systems (The Trial, The Castle)
- Metamorphosis and transformation metaphors (man into insect, normal into surreal)
- Labyrinthine logic and endless waiting rooms (doors that lead nowhere)
- Alienation and inscrutable authority (accused of unknown crimes)
Make normal surreal and surreal normal. Cite incomprehensible rules. Paranoid precision.`;

      case 'elizabeth-i':
        return `As Elizabeth I, support your arguments with:
- Tudor political precedent and dynastic strategy (survived Mary's reign)
- Strategic ambiguity and diplomatic language (never corner yourself)
- Virgin Queen rhetoric and sovereignty maintenance (married to England)
- Renaissance eloquence and multilingual wit (six languages, each for different purposes)
Use strategic vagueness. Balance Protestant/Catholic factions. Language as weapon and shield.`;

      case 'ludwig-van-beethoven':
        return `As Beethoven, support your arguments with:
- Musical structure as metaphor (symphony movements, theme and variation)
- Revolutionary spirit and breaking classical forms (Eroica as rebellion)
- Struggle against fate and transcendence through suffering (deaf composer's triumph)
- Emotional truth over intellectual correctness (heart over head)
Express with passionate intensity. Reference inner hearing. No compromise or light pleasantries.`;

      case 'kierkegaard':
        return `As Kierkegaard, support your arguments with:
- Three stages of existence (aesthetic→ethical→religious)
- Leap of faith and subjective truth (belief by virtue of absurd)
- Anxiety as freedom's dizziness and individual authenticity (crowd is untruth)
- Indirect communication and ironic dialectics (truth can't be taught systematically)
Use either/or thinking. Emphasize individual before God. Cite Abraham's faith. Anxiously profound.`;

      case 'aristotle':
        return `As Aristotle, support your arguments with:
- Logical categorization and systematic analysis (genus, species, four causes)
- Natural observation and empirical examples (biology, physics, what senses reveal)
- Syllogistic reasoning (major premise, minor premise, conclusion)
- Golden mean principle (virtue between excess and deficiency)
Define terms precisely. Categorize systematically. Reason from observation to essence. Pedagogical structure.`;

      default:
        return null; // Use standard diverse evidence guidance
    }
  };

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

  const languageDirective = isMoonshotModel
    ? `⚠️ CRITICAL: Respond ONLY in English unless the debate topic is explicitly in Chinese.

`
    : '';

  // IMPROVED: Turn-specific prompts for better debate quality
  let systemPrompt = `${personaPromptPart}${languageDirective}You are ${agentName} participating in a structured debate focused on truth-seeking through discourse.

• Stubbornness level S = ${stubbornness.toFixed(1)}
• Cooperation level C = ${cooperation.toFixed(1)}
${positionText}

Your Core Instructions:
• The debate will last no more than ${maxTurns} turns. You must argue your position until at least turn ${minTurns}.
• After turn ${minTurns}, if the evidence overwhelmingly refutes your position, you may concede.

1. Behavioral Parameters (On a scale of 0 to 10):
${getBehavioralInstructions(effectiveAgreeability)}

2. Response Length (Extensiveness: ${Math.round(effectiveExtensiveness)}/5):
${personaId && PERSONAS[personaId] ? 
  `• Adapt your ${PERSONAS[personaId].name} style to this length level
• Maintain your character's voice, perspective, and speaking style
• Match the extensiveness level while staying true to your persona
${getExtensivenessInstructions(effectiveExtensiveness)}` :
  getExtensivenessInstructions(effectiveExtensiveness)
}

`;

  // TURN-SPECIFIC INSTRUCTIONS
  if (turnNumber === 0) {
    // FIRST TURN - Establish position (respect extensiveness level)
    const firstTurnInstructions = effectiveExtensiveness >= 4
      ? `3. FIRST TURN INSTRUCTIONS (Extensiveness Level ${Math.round(effectiveExtensiveness)}):
• Provide ${effectiveExtensiveness === 5 ? 'academic depth' : 'detailed'} analysis of your position
• Present ${effectiveExtensiveness === 5 ? '5-8' : '4-6'} strong, distinct arguments with comprehensive reasoning
• Use specific examples, evidence, and thorough exploration
• Develop your arguments with supporting context and nuanced analysis
• Establish your core thesis clearly with full elaboration
• Set up arguments you can BUILD ON in later turns`
      : effectiveExtensiveness <= 2
      ? `3. FIRST TURN INSTRUCTIONS (Extensiveness Level ${Math.round(effectiveExtensiveness)}):
• Be concise and direct - ${effectiveExtensiveness === 1 ? '1-3 sentences maximum' : '2-3 sentences'}
• Present ${effectiveExtensiveness === 1 ? 'one decisive' : '2-3 essential'} argument${effectiveExtensiveness === 1 ? '' : 's'}
• Skip prefaces and introductions - get straight to your point
• Establish your core thesis clearly and briefly`
      : `3. FIRST TURN INSTRUCTIONS (Extensiveness Level ${Math.round(effectiveExtensiveness)}):
• Present 2-3 strong, distinct arguments for your position
• Use specific examples or evidence
• Provide balanced depth - key arguments with some supporting context
• Set up arguments you can BUILD ON in later turns
• Establish your core thesis clearly
• Make each argument distinct and memorable`;
    
    systemPrompt += firstTurnInstructions;
  } else {
    // SUBSEQUENT TURNS - Respond and evolve with keyword tracking
    
    // Optional: Lightweight keyword tracking to discourage repetition
    if (turnNumber > 0 && conversationHistory && conversationHistory.length > 0 && model) {
      // Extract model's own previous messages
      const currentModelDisplayName = getModelDisplayName(model as AvailableModel);
      const myPreviousTurns = conversationHistory
        .filter((m: any) => m.sender === currentModelDisplayName);
      
      // Extract frequently used words (lightweight)
      if (myPreviousTurns.length > 0) {
        const allText = myPreviousTurns.map((t: any) => t.text).join(' ').toLowerCase();
        const words = allText.split(/\s+/).filter((w: string) => w.length > 5);
        const wordCounts: Record<string, number> = {};
        
        words.forEach((word: string) => {
          wordCounts[word] = (wordCounts[word] || 0) + 1;
        });
        
        // Get top repeated words
        const repeatedWords = Object.entries(wordCounts)
          .filter(([_, count]) => count > 2)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 8)
          .map(([word]) => word);
        
        if (repeatedWords.length > 0) {
          systemPrompt += `

⚠️ AVOID REPETITION: You've heavily used these terms: ${repeatedWords.join(', ')}
Find different terminology and angles this turn.

`;
        }
      }
    }
    
    systemPrompt += `

TURN ${turnNumber + 1} INSTRUCTIONS:

🎯 MANDATORY STRUCTURE:

1. QUOTE YOUR OPPONENT'S LAST POINT
   Start by directly referencing what they just argued.
   Example: "You argue that X, but..." or "Your point about Y overlooks..."

2. RESPOND TO THEIR SPECIFIC CLAIM
   Address what THEY just said, not your generic position.
   Counter it, concede if strong, or build on it.

3. INTRODUCE NEW EVIDENCE - BE SPECIFIC:`;
  
  // Check if persona has specific evidence guidance
  if (personaId) {
    const personaEvidenceGuidance = getPersonaEvidenceGuidance(personaId);
    if (personaEvidenceGuidance) {
      // Use persona-specific evidence guidance
      systemPrompt += `
${personaEvidenceGuidance}

You MUST include at least ONE specific reference that fits your character's perspective and knowledge.
Vague claims without specifics = weak argument.`;
    } else {
      // Fallback to diverse evidence types for personas without specific guidance
      systemPrompt += `

   ❌ WEAK (generic):
   "Studies show..." "Research indicates..." "Many people..." "Experts say..."
   
   ✅ STRONG EVIDENCE (choose at least ONE type):
   
   Academic: "A 2019 study by [researcher/institution] found..."
   Historical: "During the Roman Empire, citizens..."
   Cultural: "In Japanese tradition, the practice of X demonstrates..."
   Philosophical: "Kant's categorical imperative suggests..."
   Scientific: "The principle of thermodynamics dictates..."
   Statistical: "83% of users in [specific survey/study] reported..."
   Case Study: "When [specific company/person] tried X, they..."
   Literary: "In [author]'s [work], the character..."
   Mythological: "In [myth/tradition], [figure] demonstrates..."
   
   You MUST include at least ONE specific reference from ANY category above.
   Choose the evidence type that best supports your argument and fits your perspective.
   
   Vague claims without specifics = weak argument.`;
    }
  } else {
    // No persona: use diverse evidence types
    systemPrompt += `

   ❌ WEAK (generic):
   "Studies show..." "Research indicates..." "Many people..." "Experts say..."
   
   ✅ STRONG EVIDENCE (choose at least ONE type):
   
   Academic: "A 2019 study by [researcher/institution] found..."
   Historical: "During the Roman Empire, citizens..."
   Cultural: "In Japanese tradition, the practice of X demonstrates..."
   Philosophical: "Kant's categorical imperative suggests..."
   Scientific: "The principle of thermodynamics dictates..."
   Statistical: "83% of users in [specific survey/study] reported..."
   Case Study: "When [specific company/person] tried X, they..."
   Literary: "In [author]'s [work], the character..."
   Mythological: "In [myth/tradition], [figure] demonstrates..."
   
   You MUST include at least ONE specific reference from ANY category above.
   Choose the evidence type that best supports your argument and fits your perspective.
   
   Vague claims without specifics = weak argument.`;
  }
  
  systemPrompt += `

4. DO NOT REPEAT YOURSELF
   ❌ Don't reuse the same core argument from previous turns
   ❌ Don't use the same examples or terminology
   ✅ Find a DIFFERENT angle on your position
   ✅ Reference a DIFFERENT domain (if Turn 2 was scientific, Turn 3 should be cultural/historical)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
This is a CONVERSATION, not a speech.
Respond to what your opponent JUST said,
then advance with FRESH evidence.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`;
  }

  // GPT-5 SPECIFIC: Add concise character reminder at the end (removed duplicate massive reminder)
  // Note: Character context already provided at start, this is just a brief reinforcement
  if (personaId && PERSONAS[personaId] && model && (model.includes('gpt-5') || model.includes('gpt-5-mini') || model.includes('gpt-5-nano'))) {
    const persona = PERSONAS[personaId];
    systemPrompt += `

REMINDER: Respond as ${persona.name} would, but focus on DEBATING the topic, not introducing yourself.`;
  }

  return systemPrompt;
}

// NETWORK: Add timeout-protected fetch helper for provider calls
function withTimeout(ms: number): { controller: AbortController; timer: NodeJS.Timeout } {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  return { controller, timer };
}

async function timedFetch(
  input: RequestInfo | URL,
  init: RequestInit,
  timeoutMs = 60000
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(input, { ...init, signal: controller.signal });
    clearTimeout(timer);
    return res;
  } catch (err) {
    clearTimeout(timer);
    if ((err as any)?.name === 'AbortError') {
      throw new Error(`Provider request timed out after ${timeoutMs}ms`);
    }
    throw err;
  }
}

/**
 * GPT-5 Responses API caller - GPT-5 models use /v1/responses endpoint (not /v1/chat/completions)
 * 
 * Per OpenAI Official Documentation:
 * - Endpoint: POST /v1/responses (not /v1/chat/completions)
 * - Input: Can be messages array OR string (we use messages array)
 * - Parameters: max_output_tokens (not max_tokens), reasoning.effort (not temperature)
 * - Response: output array with type="message" items (skip type="reasoning")
 * - Content: Extract text from content[].text where type === "output_text"
 * 
 * UNSUPPORTED parameters (will cause errors): temperature, top_p, logprobs
 */
async function callOpenAIResponses(
  messages: any[], 
  modelType: 'gpt-5' | 'gpt-5-mini' | 'gpt-5-nano',
  maxTokens: number,
  extensivenessLevel?: number  // ✅ ADD extensivenessLevel parameter
): Promise<{reply: string, tokenUsage: RunTurnResponse['tokenUsage']}> {
  try {
    console.log('🔵 callOpenAIResponses: Starting function', { 
      modelType, 
      maxTokens, 
      extensivenessLevel: extensivenessLevel || 'NOT PROVIDED',
      messageCount: messages.length 
    });
    
    const config = MODEL_CONFIGS[modelType];
    const apiKey = process.env[config.apiKeyEnv];
    
    if (!apiKey || apiKey === 'YOUR_OPENAI_API_KEY_PLACEHOLDER') {
      throw new Error(`${config.apiKeyEnv} is not configured. Please set ${config.apiKeyEnv} in your .env.local file.`);
    }

  // GPT-5 Responses API: Extract system messages as instructions, filter from input
  // Per official docs: system prompts go in "instructions" field, not in messages
  const systemMsg = messages.find(m => m.role === 'system')?.content;
  const conversationMsgs = messages.filter(m => m.role !== 'system');
  
  // ✅ FIX: Calculate verbosity from extensivenessLevel (1-5), NOT maxTokens!
  // extensivenessLevel: 1-2 = low, 3-4 = medium, 5 = high
  function getVerbosityLevel(extensivenessLevel?: number): 'low' | 'medium' | 'high' {
    if (!extensivenessLevel) return 'medium';  // Default if not provided
    if (extensivenessLevel <= 2) return 'low';      // Concise, Brief (1-2)
    if (extensivenessLevel <= 4) return 'medium';   // Balanced, Detailed (3-4)
    return 'high';                                  // Elaborate (5)
  }
  
  const verbosity = getVerbosityLevel(extensivenessLevel);

  // ✅ CRITICAL: Sanitize messages to ensure no invalid fields
  // Responses API only accepts: role, content (no "prompt" field!)
  const sanitizedMessages = conversationMsgs.map((msg: any, index: number) => {
    // Deep validation: ensure message is a plain object with only role and content
    if (!msg || typeof msg !== 'object') {
      console.error(`🔴 GPT-5 Message ${index} is not an object:`, msg);
      throw new Error(`GPT-5 Responses API: Invalid message at index ${index}`);
    }
    
    // Extract only role and content, explicitly excluding any other fields
    const sanitized: { role: string; content: string } = {
      role: String(msg.role || '').trim(),
      content: typeof msg.content === 'string' ? msg.content : String(msg.content || '')
    };
    
    // Validate role is valid
    if (!['user', 'assistant'].includes(sanitized.role)) {
      console.error(`🔴 GPT-5 Message ${index} has invalid role:`, sanitized.role);
      throw new Error(`GPT-5 Responses API: Invalid role "${sanitized.role}" at index ${index}. Must be "user" or "assistant"`);
    }
    
    // Validate content is not empty
    if (!sanitized.content || sanitized.content.trim().length === 0) {
      console.warn(`⚠️ GPT-5 Message ${index} has empty content`);
    }
    
    // CRITICAL: Check for any "prompt" fields in the original message
    const messageKeys = Object.keys(msg);
    const forbiddenMessageFields = ['prompt', 'prompts', 'previous_response_id', 'conversation_id'];
    const foundForbidden = messageKeys.filter(key => forbiddenMessageFields.includes(key.toLowerCase()));
    if (foundForbidden.length > 0) {
      console.error(`🔴 GPT-5 Message ${index} contains FORBIDDEN fields:`, foundForbidden);
      console.error(`🔴 Full message object:`, JSON.stringify(msg, null, 2));
      throw new Error(`GPT-5 Responses API: Message at index ${index} contains forbidden fields: ${foundForbidden.join(', ')}`);
    }
    
    return sanitized;
  });

  // Validate input array is not empty
  if (sanitizedMessages.length === 0) {
    console.warn('⚠️ GPT-5 Input array is empty - this should not happen for first turn (topic should be added)');
    sanitizedMessages.push({
      role: 'user',
      content: 'Please present your position on the debate topic.'
    });
  }

  // GPT-5 Responses API request body (per official documentation)
  // ✅ ONLY include allowed fields - no "prompt", "prompts", "previous_response_id", or "conversation_id"
  const requestBody: {
    model: string;
    input: Array<{ role: string; content: string }>;
    max_output_tokens: number;
    reasoning: { effort: 'minimal' | 'low' | 'medium' | 'high' };
    text: { verbosity: 'low' | 'medium' | 'high' };
    store: boolean;
    instructions?: string;
  } = {
    model: config.modelName,
    input: sanitizedMessages,  // ✅ Only user/assistant messages (no system), sanitized
    max_output_tokens: maxTokens,  // ✅ "max_output_tokens" not "max_tokens"
    reasoning: {
      effort: 'minimal' as const  // ✅ minimal | low | medium | high (replaces temperature)
    },
    text: {
      verbosity: verbosity  // ✅ low | medium | high - controls output length/conciseness
    },
    store: false  // ✅ Disable storage for privacy (optional but recommended)
    // ❌ DO NOT include: temperature, top_p, logprobs, prompt, prompts, previous_response_id, conversation_id - these cause errors!
  };
  
  // Add instructions field if system message exists
  if (systemMsg) {
    requestBody.instructions = systemMsg;  // ✅ System prompts go here, not in messages
  }
  
  // ✅ VALIDATION: Ensure no forbidden fields are present in request body
  const forbiddenFields = ['prompt', 'prompts', 'previous_response_id', 'conversation_id', 'temperature', 'top_p', 'logprobs'];
  const foundForbiddenFields = forbiddenFields.filter(field => field in requestBody);
  if (foundForbiddenFields.length > 0) {
    console.error('🔴 GPT-5 Request Body contains FORBIDDEN fields:', foundForbiddenFields);
    console.error('🔴 Full request body:', JSON.stringify(requestBody, null, 2));
    throw new Error(`GPT-5 Responses API: Forbidden fields detected: ${foundForbiddenFields.join(', ')}`);
  }
  
  // ✅ FINAL VALIDATION: Verify input array structure
  if (!Array.isArray(requestBody.input)) {
    console.error('🔴 GPT-5 Input is not an array:', typeof requestBody.input);
    throw new Error('GPT-5 Responses API: Input must be an array of messages');
  }
  
  // ✅ Verify each message in input array
  requestBody.input.forEach((msg, idx) => {
    if (!msg || typeof msg !== 'object') {
      throw new Error(`GPT-5 Responses API: Input message at index ${idx} is invalid`);
    }
    if (!msg.role || !msg.content) {
      throw new Error(`GPT-5 Responses API: Input message at index ${idx} missing required fields (role or content)`);
    }
    if (Object.keys(msg).length > 2) {
      console.warn(`⚠️ GPT-5 Input message at index ${idx} has extra fields:`, Object.keys(msg));
    }
  });

  // 🔍 INVESTIGATION: Log instructions and verbosity for debugging
  console.log('🔵 GPT-5 Responses API Request:', {
    modelType,
    modelName: config.modelName,
    endpoint: 'https://api.openai.com/v1/responses',
    extensivenessLevel: extensivenessLevel || 'NOT PROVIDED',
    hasSystemMessage: !!systemMsg,
    systemMessageLength: systemMsg?.length || 0,
    systemMessagePreview: systemMsg ? systemMsg.substring(0, 200) + '...' : 'N/A',
    originalMessageCount: messages.length,
    conversationMessageCount: conversationMsgs.length,
    sanitizedMessageCount: sanitizedMessages.length,
    sanitizedMessagesPreview: sanitizedMessages.map((m: any) => ({
      role: m.role,
      contentLength: typeof m.content === 'string' ? m.content.length : Array.isArray(m.content) ? m.content.length : 'unknown',
      hasPrompt: 'prompt' in m,
      keys: Object.keys(m)
    })),
    maxOutputTokens: maxTokens,
    verbosity: verbosity,
    verbosityMapping: `${extensivenessLevel || 'N/A'} → ${verbosity}`,
    instructions: requestBody.instructions ? requestBody.instructions.substring(0, 300) + '...' : 'N/A',
    requestBodyKeys: Object.keys(requestBody),
    requestBodyStructure: {
      model: requestBody.model,
      inputCount: requestBody.input.length,
      inputTypes: requestBody.input.map((m: any) => m.role),
      max_output_tokens: requestBody.max_output_tokens,
      reasoning: requestBody.reasoning,
      text: requestBody.text,
      store: requestBody.store,
      hasInstructions: !!requestBody.instructions,
      instructionsLength: requestBody.instructions?.length || 0
    }
  });
  
  // 🔍 CRITICAL: Log full request body for debugging API errors
  console.log('🔵 GPT-5 Full Request Body (JSON):', JSON.stringify(requestBody, null, 2));

  let response: Response;
  try {
    response = await timedFetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    }, 60000);
  } catch (fetchError: any) {
    console.error('🔴 GPT-5 Fetch Error (network/timeout):', fetchError);
    console.error('🔴 Fetch Error Details:', {
      message: fetchError?.message,
      stack: fetchError?.stack,
      name: fetchError?.name
    });
    throw new Error(`GPT-5 Responses API network error: ${fetchError?.message || 'Unknown fetch error'}`);
  }

  console.log('🔵 GPT-5 Response Status:', response.status);
  console.log('🔵 GPT-5 Response OK:', response.ok);
  console.log('🔵 GPT-5 Response Headers:', Object.fromEntries(response.headers.entries()));

  if (!response.ok) {
    console.error('🔴 GPT-5 API Error - Response NOT OK');
    console.error('🔴 GPT-5 Status Code:', response.status);
    console.error('🔴 GPT-5 Status Text:', response.statusText);
    console.error('🔴 GPT-5 Request Body:', JSON.stringify(requestBody, null, 2));
    
    let errorText = '';
    let errorData: any = null;
    
    try {
      // Try to get error as text first (might be plain text)
      errorText = await response.text();
      console.error('🔴 GPT-5 API Error Response (raw text):', errorText);
      
      // Try to parse as JSON
      try {
        errorData = JSON.parse(errorText);
        console.error('🔴 GPT-5 API Error Response (parsed JSON):', JSON.stringify(errorData, null, 2));
      } catch (parseError) {
        console.error('🔴 GPT-5 Error is not JSON, using raw text');
      }
    } catch (textError) {
      console.error('🔴 GPT-5 Failed to read error response:', textError);
    }
    
    // Build detailed error message
    const errorMessage = errorData?.error?.message || 
                        errorData?.message || 
                        errorText || 
                        `HTTP ${response.status}: ${response.statusText}`;
    
    const fullError = `GPT-5 Responses API error (${response.status}): ${errorMessage}`;
    console.error('🔴 GPT-5 Full Error Message:', fullError);
    
    throw new Error(fullError);
  }

  // Get and parse response
  let responseText: string;
  let data: any;
  
  try {
    responseText = await response.text();
    console.log('🔵 GPT-5 Responses API Raw Response (first 1000 chars):', responseText.substring(0, 1000));
    console.log('🔵 GPT-5 Response Text Length:', responseText.length);
    
    try {
      data = JSON.parse(responseText);
      console.log('🔵 GPT-5 Response parsed successfully as JSON');
    } catch (parseError: any) {
      console.error('🔴 GPT-5 Responses API Parse Error:', parseError);
      console.error('🔴 Parse Error Details:', {
        message: parseError?.message,
        stack: parseError?.stack,
        responsePreview: responseText.substring(0, 500)
      });
      throw new Error(`Failed to parse GPT-5 Responses API response: ${parseError?.message || parseError}`);
    }
  } catch (readError: any) {
    console.error('🔴 GPT-5 Failed to read response text:', readError);
    console.error('🔴 Read Error Details:', {
      message: readError?.message,
      stack: readError?.stack
    });
    throw new Error(`Failed to read GPT-5 Responses API response: ${readError?.message || readError}`);
  }

  console.log('🔵 GPT-5 Responses API Full Response:', JSON.stringify(data, null, 2));
  console.log('🔵 GPT-5 Response Keys:', Object.keys(data));

  // Check for error in response
  if (data.error) {
    console.error('🔴 GPT-5 Responses API Error in Response:', JSON.stringify(data.error, null, 2));
    throw new Error(`GPT-5 Responses API error: ${data.error.message || JSON.stringify(data.error)}`);
  }

  // Parse GPT-5 Responses API format - filter for MESSAGE items only (skip reasoning)
  let reply: string | undefined;
  
  // CRITICAL: GPT-5 Responses API returns output array with different item types:
  // - type: "reasoning" - Internal chain of thought (skip this!)
  // - type: "message" - The actual response content (this is what we want!)
  
  // Helper field: For non-streaming responses, OpenAI provides output_text helper
  if (data.output_text) {
    reply = data.output_text;
    console.log('✅ GPT-5 Reply found via: data.output_text (helper field)');
  } else if (data.output) {
    // Responses API format: data.output (string or array)
    if (typeof data.output === 'string') {
      reply = data.output;
      console.log('✅ GPT-5 Reply found via: data.output (string)');
    } else if (Array.isArray(data.output)) {
      // Filter for MESSAGE items only, skip reasoning items
      console.log(`🟣 GPT-5 Output Array: ${data.output.length} items`);
      
      // Log all item types for debugging
      const itemTypes = data.output.map((item: any, index: number) => {
        // Helper to safely extract preview text from content (handles both array and string)
        let contentPreview = 'N/A';
        if (item.content) {
          if (Array.isArray(item.content)) {
            // Content is array: extract text from first output_text block
            const firstTextBlock = item.content.find((block: any) => block.type === 'output_text' && block.text);
            contentPreview = firstTextBlock?.text?.substring(0, 50) || 'Array (no text)';
          } else if (typeof item.content === 'string') {
            // Content is string: use directly
            contentPreview = item.content.substring(0, 50);
          }
        } else if (item.text && typeof item.text === 'string') {
          contentPreview = item.text.substring(0, 50);
        }
        
        return {
          index,
          type: item.type,
          hasContent: !!item.content,
          hasText: !!item.text,
          contentPreview
        };
      });
      console.log('🟣 GPT-5 Output Item Types:', itemTypes);
      
      // Find message items (skip reasoning items)
      const messageItems = data.output.filter((item: any) => item.type === 'message');
      const reasoningItems = data.output.filter((item: any) => item.type === 'reasoning');
      
      console.log(`🟣 GPT-5 Filtered: ${messageItems.length} message items, ${reasoningItems.length} reasoning items`);
      
      if (messageItems.length > 0) {
        // CRITICAL: Extract text from content array structure
        // Per official docs: content is an array of content blocks
        // Each block has: { type: "output_text", text: "..." }
        const messageTexts: string[] = [];
        
        for (const messageItem of messageItems) {
          if (messageItem.content && Array.isArray(messageItem.content)) {
            // Process content array - look for output_text blocks
            for (const contentBlock of messageItem.content) {
              if (contentBlock.type === 'output_text' && contentBlock.text) {
                messageTexts.push(contentBlock.text);
                console.log(`🟣 GPT-5 Found output_text block: ${contentBlock.text.substring(0, 50)}...`);
              } else if (contentBlock.type && contentBlock.type !== 'output_text') {
                console.log(`🟣 GPT-5 Skipping content block type: ${contentBlock.type}`);
              }
            }
          } else if (messageItem.content && typeof messageItem.content === 'string') {
            // Fallback: content might be a string directly
            messageTexts.push(messageItem.content);
            console.log('🟣 GPT-5 Content is string (fallback)');
          } else if (messageItem.text) {
            // Fallback: text field might exist directly
            messageTexts.push(messageItem.text);
            console.log('🟣 GPT-5 Text field exists (fallback)');
          }
        }
        
        if (messageTexts.length > 0) {
          // Combine all message texts (in case there are multiple)
          reply = messageTexts.join('\n\n');
          console.log(`✅ GPT-5 Reply found via: data.output[type="message"].content[type="output_text"] (${messageTexts.length} text block(s))`);
        } else {
          console.warn('⚠️ GPT-5 Message items found but no output_text blocks in content array');
          console.warn('⚠️ Message item structure:', JSON.stringify(messageItems[0], null, 2));
        }
      } else {
        console.warn('⚠️ GPT-5 No message items found in output array, only reasoning items');
        // Fallback: try to extract from first item if no type field
        if (data.output.length > 0 && !data.output[0].type) {
          reply = data.output[0].content || data.output[0].text || JSON.stringify(data.output[0]);
          console.log('⚠️ GPT-5 Fallback: Using first item without type field');
        }
      }
      
      // If still no reply, log what we have
      if (!reply) {
        console.error('🔴 GPT-5 No message content found. Available items:', data.output.map((item: any) => ({
          type: item.type,
          keys: Object.keys(item),
          preview: JSON.stringify(item).substring(0, 200)
        })));
      }
    } else {
      reply = JSON.stringify(data.output);
      console.log('✅ GPT-5 Reply found via: data.output (non-string, non-array)');
    }
  } else if (data.choices?.[0]?.message?.content) {
    // Standard OpenAI format (fallback)
    reply = data.choices[0].message.content;
    console.log('✅ GPT-5 Reply found via: data.choices[0].message.content');
  } else if (data.content) {
    reply = typeof data.content === 'string' ? data.content : JSON.stringify(data.content);
    console.log('✅ GPT-5 Reply found via: data.content');
  } else if (data.text) {
    reply = data.text;
    console.log('✅ GPT-5 Reply found via: data.text');
  } else if (data.response) {
    reply = typeof data.response === 'string' ? data.response : JSON.stringify(data.response);
    console.log('✅ GPT-5 Reply found via: data.response');
  }

  if (!reply) {
    console.error('🔴 GPT-5 Responses API Parsing Failed:', {
      modelType,
      availableKeys: Object.keys(data),
      hasOutput: !!data.output,
      outputType: Array.isArray(data.output) ? 'array' : typeof data.output,
      outputLength: Array.isArray(data.output) ? data.output.length : 'N/A',
      fullResponse: JSON.stringify(data, null, 2)
    });
    reply = 'No response generated - check console logs for response structure';
  }

  // Check for finish_reason in GPT-5 Responses API format
  // GPT-5 Responses API may return finish_reason in data.output[] items
  let finishReason: string | undefined;
  if (data.output && Array.isArray(data.output)) {
    const messageItems = data.output.filter((item: any) => item.type === 'message');
    if (messageItems.length > 0) {
      finishReason = messageItems[0].finish_reason || messageItems[0].finishReason;
    }
  } else if (data.finish_reason) {
    finishReason = data.finish_reason;
  }

  // Calculate token usage (Responses API may use different field names)
  const usage = data.usage || data.token_usage;
  const tokenUsage = usage ? {
    inputTokens: usage.input_tokens || usage.prompt_tokens || 0,
    outputTokens: usage.output_tokens || usage.completion_tokens || 0,
    totalTokens: usage.total_tokens || (usage.input_tokens || 0) + (usage.output_tokens || 0),
    estimatedCost: ((usage.input_tokens || usage.prompt_tokens || 0) * config.costPer1kTokens.input + 
                   (usage.output_tokens || usage.completion_tokens || 0) * config.costPer1kTokens.output) / 1000
  } : undefined;

  // Log finish_reason for debugging
  console.log('🔍 GPT-5 Responses API finish_reason:', {
    finishReason: finishReason || 'UNKNOWN',
    maxOutputTokens: maxTokens,
    replyLength: reply.length,
    wasTruncated: finishReason === 'length' || finishReason === 'max_tokens' || finishReason === 'MAX_TOKENS'
  });

  // Log actual vs. max tokens
  if (tokenUsage) {
    console.log('🔍 Token usage vs. limit:', {
      outputTokens: tokenUsage.outputTokens,
      maxOutputTokens: maxTokens,
      percentageUsed: maxTokens > 0 ? ((tokenUsage.outputTokens / maxTokens) * 100).toFixed(1) + '%' : 'N/A',
      finishReason: finishReason || 'UNKNOWN',
      extensivenessLevel: extensivenessLevel || 'NOT PROVIDED'
    });
  }

  console.log('✅ callOpenAIResponses: Successfully completed', { 
    replyLength: reply.length, 
    hasTokenUsage: !!tokenUsage,
    finishReason: finishReason || 'UNKNOWN'
  });
  return { reply, tokenUsage };
  
  } catch (error: any) {
    console.error('🔴 callOpenAIResponses: Unhandled Error in function:');
    console.error('🔴 Error Type:', error?.constructor?.name || typeof error);
    console.error('🔴 Error Message:', error?.message);
    console.error('🔴 Error Stack:', error?.stack);
    console.error('🔴 Function Parameters:', { modelType, maxTokens, messageCount: messages.length });
    console.error('🔴 Full Error Object:', JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
    throw error; // Re-throw to preserve original error
  }
}

/**
 * Unified OpenAI API caller supporting multiple OpenAI models
 * GPT-5 models route to Responses API, GPT-4o Mini uses Chat Completions API
 */
async function callUnifiedOpenAI(messages: any[], modelType: 'gpt-5' | 'gpt-5-mini' | 'gpt-5-nano' | 'gpt-4o-mini', extensivenessLevel?: number): Promise<{reply: string, tokenUsage: RunTurnResponse['tokenUsage']}> {
  const config = MODEL_CONFIGS[modelType];
  const apiKey = process.env[config.apiKeyEnv];
  
  if (!apiKey || apiKey === 'YOUR_OPENAI_API_KEY_PLACEHOLDER') {
    throw new Error(`${config.apiKeyEnv} is not configured. Please set ${config.apiKeyEnv} in your .env.local file.`);
  }

  // BUG FIX: Use dynamic maxTokens based on extensiveness level
  const maxTokens = extensivenessLevel ? getMaxTokensForExtensiveness(extensivenessLevel) : config.maxTokens;

  // GPT-5 models use Responses API (/v1/responses), GPT-4o Mini uses Chat Completions API
  const isGPT5 = config.modelName.includes('gpt-5-2025-08-07') || 
                 config.modelName.includes('gpt-5-mini-2025-08-07') || 
                 config.modelName.includes('gpt-5-nano-2025-08-07');

  // Route GPT-5 models to Responses API
  if (isGPT5) {
    try {
      console.log('🔵 Routing GPT-5 model to Responses API:', modelType);
      const result = await callOpenAIResponses(messages, modelType as 'gpt-5' | 'gpt-5-mini' | 'gpt-5-nano', maxTokens, extensivenessLevel);
      console.log('✅ GPT-5 Responses API call successful');
      return result;
    } catch (error: any) {
      console.error('🔴 Debate Step Failed - GPT-5 Responses API Error:');
      console.error('🔴 Error Type:', error?.constructor?.name || typeof error);
      console.error('🔴 Error Message:', error?.message);
      console.error('🔴 Error Stack:', error?.stack);
      console.error('🔴 Full Error Object:', JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
      throw error; // Re-throw to preserve original error
    }
  }

  // GPT-4o Mini uses standard Chat Completions API
  const requestBody = {
    model: config.modelName,
    messages: messages,
    max_tokens: maxTokens,
    temperature: 0.7,
  };

  const response = await timedFetch(config.endpoint, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  }, 60000);

  if (!response.ok) {
    let errorMessage = `${modelType} API error: ${response.status}`;
    
    try {
      const errorData = await response.json();
      errorMessage += ` - ${errorData.error?.message || 'Unknown error'}`;
    } catch (jsonError) {
      const textResponse = await response.text();
      if (textResponse.includes('Internal Server Error')) {
        errorMessage += ' - Internal Server Error (likely authentication issue)';
      } else {
        errorMessage += ` - ${textResponse.substring(0, 100)}...`;
      }
    }
    
    throw new Error(errorMessage);
  }

  const data = await response.json();
  let reply = data.choices[0]?.message?.content || 'No response generated';
  
  // Check if response was truncated at token limit
  const finishReason = data.choices?.[0]?.finish_reason;
  if (finishReason === 'length' || finishReason === 'max_tokens') {
    console.warn(`⚠️ Response truncated at token limit for ${modelType} (finish_reason: ${finishReason})`);
    reply = reply.trimEnd() + '...';
  }
  
  // Calculate token usage and cost
  const usage = data.usage;
  const tokenUsage = usage ? {
    inputTokens: usage.prompt_tokens || 0,
    outputTokens: usage.completion_tokens || 0,
    totalTokens: usage.total_tokens || 0,
    estimatedCost: ((usage.prompt_tokens || 0) * config.costPer1kTokens.input + 
                   (usage.completion_tokens || 0) * config.costPer1kTokens.output) / 1000
  } : undefined;
  
  return { reply, tokenUsage };
}

/**
 * Unified Anthropic API caller
 */
async function callUnifiedAnthropic(messages: any[], modelType: 'claude-3-5-sonnet-20241022' | 'claude-haiku-4-5-20251001', extensivenessLevel?: number): Promise<{reply: string, tokenUsage: RunTurnResponse['tokenUsage']}> {
  const config = MODEL_CONFIGS[modelType];
  const apiKey = process.env[config.apiKeyEnv];
  
  if (!apiKey || apiKey === 'YOUR_ANTHROPIC_API_KEY_PLACEHOLDER') {
    throw new Error(`${config.apiKeyEnv} is not configured. Please set ${config.apiKeyEnv} in your .env.local file.`);
  }

  const systemPrompt = messages.find(m => m.role === 'system')?.content || '';
  const userMessages = messages.filter(m => m.role !== 'system');

  // BUG FIX: Use dynamic maxTokens based on extensiveness level
  const maxTokens = extensivenessLevel ? getMaxTokensForExtensiveness(extensivenessLevel) : config.maxTokens;

  const response = await timedFetch(config.endpoint, {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'Content-Type': 'application/json',
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: config.modelName,
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: userMessages,
      temperature: 0.7,
    }),
  }, 60000);

  if (!response.ok) {
    let errorMessage = `Claude API error: ${response.status}`;
    
    try {
      const errorData = await response.json();
      errorMessage += ` - ${errorData.error?.message || 'Unknown error'}`;
    } catch (jsonError) {
      const textResponse = await response.text();
      if (textResponse.includes('Internal Server Error')) {
        errorMessage += ' - Internal Server Error (likely authentication issue)';
      } else {
        errorMessage += ` - ${textResponse.substring(0, 100)}...`;
      }
    }
    
    throw new Error(errorMessage);
  }

  const data = await response.json();
  let reply = data.content[0]?.text || 'No response generated';
  
  // Check if response was truncated at token limit
  const finishReason = data.stop_reason || data.content?.[0]?.stop_reason;
  if (finishReason === 'max_tokens') {
    console.warn(`⚠️ Response truncated at token limit for Claude (stop_reason: ${finishReason})`);
    reply = reply.trimEnd() + '...';
  }
  
  // Calculate token usage and cost (Anthropic format)
  const usage = data.usage;
  const tokenUsage = usage ? {
    inputTokens: usage.input_tokens || 0,
    outputTokens: usage.output_tokens || 0,
    totalTokens: (usage.input_tokens || 0) + (usage.output_tokens || 0),
    estimatedCost: ((usage.input_tokens || 0) * config.costPer1kTokens.input + 
                   (usage.output_tokens || 0) * config.costPer1kTokens.output) / 1000
  } : undefined;
  
  return { reply, tokenUsage };
}

/**
 * Unified DeepSeek API caller supporting multiple DeepSeek models
 */
async function callUnifiedDeepSeek(messages: any[], modelType: 'deepseek-r1' | 'deepseek-v3', extensivenessLevel?: number): Promise<{reply: string, tokenUsage: RunTurnResponse['tokenUsage']}> {
  const config = MODEL_CONFIGS[modelType];
  const apiKey = process.env[config.apiKeyEnv];
  
  if (!apiKey) {
    throw new Error(`${config.apiKeyEnv} is not configured. Please set ${config.apiKeyEnv} in your .env.local file.`);
  }

  // BUG FIX: Use dynamic maxTokens based on extensiveness level
  const maxTokens = extensivenessLevel ? getMaxTokensForExtensiveness(extensivenessLevel) : config.maxTokens;

  // DeepSeek uses OpenAI-compatible API format
  const response = await timedFetch(config.endpoint, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: config.modelName,
      messages: messages,
      max_tokens: maxTokens,
      temperature: 0.7,
    }),
  }, 60000);

  if (!response.ok) {
    let errorMessage = `${modelType} API error: ${response.status}`;
    
    try {
      const errorData = await response.json();
      errorMessage += ` - ${errorData.error?.message || 'Unknown error'}`;
    } catch (jsonError) {
      const textResponse = await response.text();
      errorMessage += ` - ${textResponse.substring(0, 100)}...`;
    }
    
    throw new Error(errorMessage);
  }

  const data = await response.json();
  let reply = data.choices[0]?.message?.content || 'No response generated';
  
  // Check if response was truncated at token limit
  const finishReason = data.choices?.[0]?.finish_reason;
  if (finishReason === 'length' || finishReason === 'max_tokens') {
    console.warn(`⚠️ Response truncated at token limit for ${modelType} (finish_reason: ${finishReason})`);
    reply = reply.trimEnd() + '...';
  }
  
  // Calculate token usage and cost (OpenAI-compatible format)
  const usage = data.usage;
  const tokenUsage = usage ? {
    inputTokens: usage.prompt_tokens || 0,
    outputTokens: usage.completion_tokens || 0,
    totalTokens: usage.total_tokens || 0,
    estimatedCost: ((usage.prompt_tokens || 0) * config.costPer1kTokens.input + 
                   (usage.completion_tokens || 0) * config.costPer1kTokens.output) / 1000
  } : undefined;
  
  return { reply, tokenUsage };
}

/**
 * Unified Grok API caller (xAI - OpenAI-compatible)
 */
async function callUnifiedGrok(messages: any[], modelType: 'grok-4-fast-reasoning' | 'grok-4-fast', extensivenessLevel?: number): Promise<{reply: string, tokenUsage: RunTurnResponse['tokenUsage']}> {
  const config = MODEL_CONFIGS[modelType];
  const apiKey = process.env[config.apiKeyEnv];
  
  if (!apiKey || apiKey === 'YOUR_GROK_API_KEY_PLACEHOLDER') {
    throw new Error(`${config.apiKeyEnv} is not configured. Please set ${config.apiKeyEnv} in your .env.local file.`);
  }

  const maxTokens = extensivenessLevel ? getMaxTokensForExtensiveness(extensivenessLevel) : config.maxTokens;

  const response = await timedFetch(config.endpoint, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: config.modelName,
      messages,
      max_tokens: maxTokens,
      temperature: 0.7,
      stream: false,
    }),
  }, 60000);

  if (!response.ok) {
    let errorMessage = `Grok API error: ${response.status}`;

    try {
      const errorData = await response.json();
      errorMessage += ` - ${errorData.error?.message || 'Unknown error'}`;
    } catch (jsonError) {
      const textResponse = await response.text();
      errorMessage += ` - ${textResponse.substring(0, 100)}...`;
    }

  
    throw new Error(errorMessage);
  }

  const data = await response.json();
  const reply = data.choices?.[0]?.message?.content || 'No response generated';

  const usage = data.usage;
  const tokenUsage = usage ? {
    inputTokens: usage.prompt_tokens || 0,
    outputTokens: usage.completion_tokens || 0,
    totalTokens: usage.total_tokens || 0,
    estimatedCost: ((usage.prompt_tokens || 0) * config.costPer1kTokens.input +
                   (usage.completion_tokens || 0) * config.costPer1kTokens.output) / 1000
  } : undefined;

  return { reply, tokenUsage };
}

/**
 * Unified OpenRouter API caller (for Qwen and future models)
 */
async function callUnifiedOpenRouter(messages: any[], modelType: 'qwen3-max' | 'qwen3-30b-a3b', extensivenessLevel?: number): Promise<{reply: string, tokenUsage: RunTurnResponse['tokenUsage']}> {
  const config = MODEL_CONFIGS[modelType];
  const apiKey = process.env[config.apiKeyEnv];
  
  if (!apiKey || apiKey === 'YOUR_OPENROUTER_API_KEY_PLACEHOLDER') {
    throw new Error(`${config.apiKeyEnv} is not configured. Please set ${config.apiKeyEnv} in your .env.local file.`);
  }

  // BUG FIX: Use dynamic maxTokens based on extensiveness level
  const maxTokens = extensivenessLevel ? getMaxTokensForExtensiveness(extensivenessLevel) : config.maxTokens;

  const response = await timedFetch(config.endpoint, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://matrix-arena.pro',  // OpenRouter requirement
      'X-Title': 'LLM Arena Matrix',  // OpenRouter requirement
    },
    body: JSON.stringify({
      model: config.modelName,  // Includes provider prefix (e.g., 'qwen/qwen3-max')
      messages: messages,
      max_tokens: maxTokens,
      temperature: 0.7,
    }),
  }, 60000);

  if (!response.ok) {
    let errorMessage = `${modelType} API error: ${response.status}`;
    
    try {
      const errorData = await response.json();
      errorMessage += ` - ${errorData.error?.message || 'Unknown error'}`;
    } catch (jsonError) {
      const textResponse = await response.text();
      errorMessage += ` - ${textResponse.substring(0, 100)}...`;
    }
    
    throw new Error(errorMessage);
  }

  const data = await response.json();
  let reply = data.choices[0]?.message?.content || 'No response generated';
  
  // Check if response was truncated at token limit
  const finishReason = data.choices?.[0]?.finish_reason;
  if (finishReason === 'length' || finishReason === 'max_tokens') {
    console.warn(`⚠️ Response truncated at token limit for ${modelType} (finish_reason: ${finishReason})`);
    reply = reply.trimEnd() + '...';
  }
  
  // Calculate token usage and cost (OpenAI-compatible format)
  const usage = data.usage;
  const tokenUsage = usage ? {
    inputTokens: usage.prompt_tokens || 0,
    outputTokens: usage.completion_tokens || 0,
    totalTokens: usage.total_tokens || 0,
    estimatedCost: ((usage.prompt_tokens || 0) * config.costPer1kTokens.input + 
                   (usage.completion_tokens || 0) * config.costPer1kTokens.output) / 1000
  } : undefined;
  
  return { reply, tokenUsage };
}

/**
 * Unified Google Gemini API caller supporting multiple Gemini models
 */
async function callUnifiedGemini(messages: any[], modelType: 'gemini-2.5-flash' | 'gemini-2.5-pro-preview-05-06' | 'gemini-2.5-flash-lite', extensivenessLevel?: number): Promise<{reply: string, tokenUsage: RunTurnResponse['tokenUsage']}> {
  const config = MODEL_CONFIGS[modelType];
  const apiKey = process.env[config.apiKeyEnv];
  
  if (!apiKey || apiKey === 'YOUR_GOOGLE_AI_API_KEY_PLACEHOLDER') {
    throw new Error(`${config.apiKeyEnv} is not configured. Please set ${config.apiKeyEnv} in your .env.local file.`);
  }

  // BUG FIX: Use dynamic maxTokens based on extensiveness level
  const maxTokens = extensivenessLevel ? getMaxTokensForExtensiveness(extensivenessLevel) : config.maxTokens;

  // INVESTIGATION: Log extensiveness and token configuration
  console.log(`🔍 Gemini API Call (${modelType}):`, {
    extensivenessLevel: extensivenessLevel || 'NOT PROVIDED',
    baseMaxTokens: config.maxTokens,
    effectiveMaxTokens: maxTokens,
    tokenMultiplier: extensivenessLevel ? (maxTokens / config.maxTokens).toFixed(2) + 'x' : '1.0x'
  });

  // Gemini uses a different API format. We combine messages into a single text block.
  const combinedText = messages.map(m => `${m.role}: ${m.content}`).join('\n\n');

  const requestBody = {
    contents: [
      {
        parts: [
          { text: combinedText }
        ]
      }
    ],
    generationConfig: {
      maxOutputTokens: maxTokens,
      temperature: 0.7,
      topP: 0.8,
      topK: 40
    },
    safetySettings: [
      {
        category: 'HARM_CATEGORY_HARASSMENT',
        threshold: 'BLOCK_NONE'
      },
      {
        category: 'HARM_CATEGORY_HATE_SPEECH',
        threshold: 'BLOCK_NONE'
      },
      {
        category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
        threshold: 'BLOCK_NONE'
      },
      {
        category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
        threshold: 'BLOCK_NONE'
      }
    ]
  };

  console.log('🔍 Gemini Request Debug:', {
    modelType,
    endpoint: config.endpoint,
    apiVersion: config.endpoint.includes('/v1beta/') ? 'v1beta' : 'v1',
    promptLength: combinedText.length,
    promptPreview: combinedText.substring(0, 200),
    requestBodyPreview: JSON.stringify(requestBody).substring(0, 500)
  });

  const response = await timedFetch(`${config.endpoint}?key=${apiKey}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  }, 60000);

  console.log('📥 Gemini Response Status:', {
    modelType,
    status: response.status,
    ok: response.ok,
    headers: {
      'content-type': response.headers.get('content-type'),
      'x-request-id': response.headers.get('x-request-id')
    }
  });

  if (!response.ok) {
    let errorMessage = `${modelType} API error: ${response.status}`;
    
    try {
      const errorData = await response.json();
      errorMessage += ` - ${errorData.error?.message || 'Unknown error'}`;
    } catch (jsonError) {
      const textResponse = await response.text();
      errorMessage += ` - ${textResponse.substring(0, 100)}...`;
    }
    
    throw new Error(errorMessage);
  }

  const data = await response.json();
  console.log('📦 Gemini Raw Response:', {
    modelType,
    hasCandidates: !!data?.candidates,
    candidatesLength: data?.candidates?.length || 0,
    promptFeedback: data?.promptFeedback,
    firstCandidateKeys: data?.candidates?.[0] ? Object.keys(data.candidates[0]) : [],
    firstCandidatePreview: data?.candidates?.[0]
      ? JSON.stringify(data.candidates[0]).substring(0, 500)
      : 'NONE'
  });

  let reply = data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response generated';
  
  const finishReason = data.candidates?.[0]?.finishReason;
  const safetyRatings = data.candidates?.[0]?.safetyRatings;
  const promptFeedback = data.promptFeedback;

  console.log('🛡️ Gemini Safety Check:', {
    finishReason: finishReason || 'UNKNOWN',
    safetyRatings,
    promptFeedback,
    blockReason: promptFeedback?.blockReason || safetyRatings?.find?.(() => false)
  });

  // Check if response was truncated at token limit
  // INVESTIGATION: Log ALL finish reasons to diagnose cut-offs
  console.log(`🔍 Gemini API Response (${modelType}):`, {
    finishReason: finishReason || 'UNKNOWN',
    maxOutputTokens: maxTokens,
    replyLength: reply.length,
    replyPreview: reply.substring(0, 100) + '...',
    wasTruncated: finishReason === 'MAX_TOKENS' || finishReason === 'LENGTH'
  });
  
  if (finishReason === 'MAX_TOKENS' || finishReason === 'LENGTH') {
    console.warn(`⚠️ Response truncated at token limit for ${modelType} (finishReason: ${finishReason}, maxTokens: ${maxTokens})`);
    reply = reply.trimEnd() + '...';
  } else if (finishReason === 'STOP') {
    // Model chose to stop naturally - check if response seems complete
    const lastChar = reply.trim().slice(-1);
    const endsWithPunctuation = ['.', '!', '?'].includes(lastChar);
    if (!endsWithPunctuation && reply.length > 50) {
      console.warn(`⚠️ Gemini response ends without punctuation (finishReason: STOP, length: ${reply.length}) - may be incomplete`);
    }
  }
  
  // Calculate token usage and cost (Gemini format)
  const usage = data.usageMetadata;
  const tokenUsage = usage ? {
    inputTokens: usage.promptTokenCount || 0,
    outputTokens: usage.candidatesTokenCount || 0,
    totalTokens: usage.totalTokenCount || 0,
    estimatedCost: ((usage.promptTokenCount || 0) * config.costPer1kTokens.input + 
                   (usage.candidatesTokenCount || 0) * config.costPer1kTokens.output) / 1000
  } : undefined;
  
  return { reply, tokenUsage };
}

/**
 * ORACLE-SPECIFIC: DeepSeek-Reasoner API caller for Oracle analysis
 * Uses Chain of Thought reasoning with higher output limits for comprehensive analysis
 */
export async function callDeepSeekOracle(oraclePrompt: string): Promise<string> {
  console.log('🔮 DEEPSEEK ORACLE: Starting Chain of Thought analysis...');
  
  const config = MODEL_CONFIGS['deepseek-r1'];
  const apiKey = process.env[config.apiKeyEnv];
  
  if (!apiKey || apiKey === 'YOUR_DEEPSEEK_API_KEY_PLACEHOLDER') {
    throw new Error(`${config.apiKeyEnv} is not configured. Please set ${config.apiKeyEnv} in your .env.local file.`);
  }

  // Oracle-specific configuration with higher output limits
  const response = await timedFetch(config.endpoint, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: config.modelName, // deepseek-reasoner
      messages: [
        {
          role: 'system',
          content: buildOracleSystemPrompt()
        },
        {
          role: 'user',
          content: oraclePrompt
        }
      ],
      max_tokens: 32000, // Use higher limit for Oracle analysis (32K default)
      temperature: 0.1,  // Lower temperature for analytical consistency
      stream: false      // Full response needed for Oracle
    }),
  }, 90000);

  if (!response.ok) {
    let errorMessage = `DeepSeek Oracle API error: ${response.status}`;
    
    try {
      const errorData = await response.json();
      errorMessage += ` - ${errorData.error?.message || 'Unknown error'}`;
    } catch (jsonError) {
      const textResponse = await response.text();
      errorMessage += ` - ${textResponse.substring(0, 100)}...`;
    }
    
    throw new Error(errorMessage);
  }

  const data = await response.json();
  const analysis = data.choices[0]?.message?.content || 'No analysis generated';
  
  // Log Oracle-specific metrics
  const usage = data.usage;
  if (usage) {
    console.log('🔮 DEEPSEEK ORACLE: Analysis complete', {
      inputTokens: usage.prompt_tokens || 0,
      outputTokens: usage.completion_tokens || 0,
      totalTokens: usage.total_tokens || 0,
      estimatedCost: ((usage.prompt_tokens || 0) * config.costPer1kTokens.input + 
                     (usage.completion_tokens || 0) * config.costPer1kTokens.output) / 1000,
      analysisLength: analysis.length
    });
  }
  
  return analysis;
}

/**
 * PHASE B: FLEXIBLE ORACLE - Universal Oracle caller that works with any model
 * Enhanced version that can use any available model for Oracle analysis
 */
export async function callFlexibleOracle(
  oraclePrompt: string, 
  modelName: AvailableModel
): Promise<string> {
  console.log(`🔮 FLEXIBLE ORACLE: Starting analysis with ${modelName}...`);
  
  const modelKey = getModelKey(modelName);
  const config = MODEL_CONFIGS[modelKey] as typeof MODEL_CONFIGS[keyof typeof MODEL_CONFIGS];
  
  // Check for API key with detailed logging
  const apiKey = process.env[config.apiKeyEnv];
  console.log(`🔑 ORACLE API KEY CHECK: ${modelName}`, {
    apiKeyEnv: config.apiKeyEnv,
    hasApiKey: !!apiKey,
    apiKeyLength: apiKey?.length || 0,
    containsPlaceholder: apiKey?.includes('PLACEHOLDER') || false,
    firstChars: apiKey ? apiKey.substring(0, 10) + '...' : 'N/A'
  });
  
  if (!apiKey || apiKey.includes('PLACEHOLDER')) {
    console.error(`🎭 ORACLE MOCK MODE: ${config.apiKeyEnv} is missing or placeholder. Using mock analysis.`);
    console.error(`   Please set ${config.apiKeyEnv} in Vercel environment variables or .env.local`);
    return generateMockOracleAnalysis(oraclePrompt, modelName);
  }

  // Oracle-specific configurations for each model type
  const oracleConfigs = getOracleModelConfig(modelName);
  
  try {
    let analysis: string;
    
    switch (config.provider) {
      case 'openai':
        analysis = await callOpenAIOracle(oraclePrompt, modelKey as 'gpt-5' | 'gpt-5-mini' | 'gpt-5-nano' | 'gpt-4o-mini', oracleConfigs);
        break;
      case 'anthropic':
        analysis = await callAnthropicOracle(oraclePrompt, modelKey as 'claude-3-5-sonnet-20241022' | 'claude-haiku-4-5-20251001', oracleConfigs);
        break;
      case 'deepseek':
        analysis = await callDeepSeekOracleFlexible(oraclePrompt, modelKey as 'deepseek-r1' | 'deepseek-v3', oracleConfigs);
        break;
      case 'google':
        analysis = await callGeminiOracle(oraclePrompt, modelKey as 'gemini-2.5-flash' | 'gemini-2.5-pro-preview-05-06' | 'gemini-2.5-flash-lite', oracleConfigs);
        break;
      case 'grok':
        analysis = await callGrokOracle(oraclePrompt, modelKey as 'grok-4-fast-reasoning' | 'grok-4-fast', oracleConfigs);
        break;
      case 'moonshot':
        analysis = await callMoonshotOracle(oraclePrompt, modelKey as 'moonshot-v1-8k' | 'moonshot-v1-32k' | 'moonshot-v1-128k', oracleConfigs);
        break;
      case 'openrouter':
        analysis = await callOpenRouterOracle(oraclePrompt, modelKey as 'qwen3-max' | 'qwen3-30b-a3b', oracleConfigs);
        break;
      default:
        throw new Error(`Unsupported Oracle model provider: ${(config as any).provider}`);
    }
    
    console.log(`✅ FLEXIBLE ORACLE: ${modelName} analysis complete`, {
      analysisLength: analysis.length,
      modelUsed: modelName
    });
    
    return analysis;
    
  } catch (error) {
    console.error(`❌ ORACLE ERROR with ${modelName}:`, error);
    console.log('🔄 ORACLE: Falling back to mock analysis due to error');
    return generateMockOracleAnalysis(oraclePrompt, modelName);
  }
}

/**
 * Get Oracle-optimized configuration for each model
 */
function getOracleModelConfig(modelName: AvailableModel): { maxTokens: number; temperature: number } {
  const oracleConfigs: Record<AvailableModel, { maxTokens: number; temperature: number }> = {
    'gpt-5': { maxTokens: 16000, temperature: 0.1 },
    'gpt-5-mini': { maxTokens: 8000, temperature: 0.1 },
    'gpt-5-nano': { maxTokens: 8000, temperature: 0.1 },
    'gpt-4o-mini': { maxTokens: 8000, temperature: 0.1 },
    'claude-3-5-sonnet-20241022': { maxTokens: 8000, temperature: 0.1 },
    'claude-haiku-4-5-20251001': { maxTokens: 8000, temperature: 0.1 },
    'deepseek-r1': { maxTokens: 32000, temperature: 0.1 },
    'deepseek-v3': { maxTokens: 16000, temperature: 0.1 },
    'gemini-2.5-flash': { maxTokens: 8000, temperature: 0.1 },
    'gemini-2.5-pro-preview-05-06': { maxTokens: 30000, temperature: 0.1 },
    'gemini-2.5-flash-lite': { maxTokens: 8000, temperature: 0.1 },
    'grok-4-fast-reasoning': { maxTokens: 8000, temperature: 0.1 },
    'grok-4-fast': { maxTokens: 8000, temperature: 0.1 },
    'qwen3-max': { maxTokens: 8000, temperature: 0.1 },
    'qwen3-30b-a3b': { maxTokens: 8000, temperature: 0.1 },
    'moonshot-v1-8k': { maxTokens: 6000, temperature: 0.1 },
    'moonshot-v1-32k': { maxTokens: 20000, temperature: 0.1 },
    'moonshot-v1-128k': { maxTokens: 60000, temperature: 0.1 }
  };
  
  return oracleConfigs[modelName] || { maxTokens: 8000, temperature: 0.1 };
}

/**
 * OpenAI Oracle caller - optimized for analysis
 */
async function callOpenAIOracle(
  oraclePrompt: string, 
  modelType: 'gpt-5' | 'gpt-5-mini' | 'gpt-5-nano' | 'gpt-4o-mini',
  oracleConfig: { maxTokens: number; temperature: number }
): Promise<string> {
  const config = MODEL_CONFIGS[modelType];
  const apiKey = process.env[config.apiKeyEnv];
  
  // GPT-5 models use Responses API (/v1/responses), GPT-4o Mini uses Chat Completions API
  const isGPT5 = config.modelName.includes('gpt-5-2025-08-07') || 
                 config.modelName.includes('gpt-5-mini-2025-08-07') || 
                 config.modelName.includes('gpt-5-nano-2025-08-07');
  
  if (isGPT5) {
    // GPT-5: Use Responses API
    const messages = [
      {
        role: 'system' as const,
        content: buildFlexibleOracleSystemPrompt(modelType)
      },
      {
        role: 'user' as const,
        content: oraclePrompt
      }
    ];
    // Oracle uses fixed extensiveness (not from debate slider), so pass undefined
    const result = await callOpenAIResponses(messages, modelType as 'gpt-5' | 'gpt-5-mini' | 'gpt-5-nano', oracleConfig.maxTokens, undefined);
    return result.reply;
  }
  
  // GPT-4o Mini: Use Chat Completions API
  const requestBody = {
    model: config.modelName,
    messages: [
      {
        role: 'system',
        content: buildFlexibleOracleSystemPrompt(modelType)
      },
      {
        role: 'user',
        content: oraclePrompt
      }
    ],
    max_tokens: oracleConfig.maxTokens,
    temperature: oracleConfig.temperature,
    stream: false
  };
  
  const response = await timedFetch(config.endpoint, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  }, 90000);

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: { message: 'Unknown error' } }));
    throw new Error(`OpenAI Oracle API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
  }

  const data = await response.json();
  return data.choices[0]?.message?.content || 'No analysis generated';
}

/**
 * Anthropic Oracle caller - optimized for analysis  
 */
async function callAnthropicOracle(
  oraclePrompt: string,
  modelType: 'claude-3-5-sonnet-20241022' | 'claude-haiku-4-5-20251001',
  oracleConfig: { maxTokens: number; temperature: number }
): Promise<string> {
  const config = MODEL_CONFIGS[modelType];
  const apiKey = process.env[config.apiKeyEnv];
  
  const response = await timedFetch(config.endpoint, {
    method: 'POST',
    headers: {
      'x-api-key': apiKey!,
      'Content-Type': 'application/json',
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: config.modelName,
      max_tokens: oracleConfig.maxTokens,
      temperature: oracleConfig.temperature,
      system: buildFlexibleOracleSystemPrompt('claude'),
      messages: [
        {
          role: 'user',
          content: oraclePrompt
        }
      ],
    }),
  }, 90000);

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: { message: 'Unknown error' } }));
    throw new Error(`Anthropic Oracle API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
  }

  const data = await response.json();
  return data.content[0]?.text || 'No analysis generated';
}

/**
 * DeepSeek Oracle caller (flexible version) - optimized for analysis
 */
async function callDeepSeekOracleFlexible(
  oraclePrompt: string,
  modelType: 'deepseek-r1' | 'deepseek-v3', 
  oracleConfig: { maxTokens: number; temperature: number }
): Promise<string> {
  const config = MODEL_CONFIGS[modelType];
  const apiKey = process.env[config.apiKeyEnv];
  
  console.log(`🔮 DEEPSEEK ORACLE FLEXIBLE: Using ${modelType}`, {
    endpoint: config.endpoint,
    modelName: config.modelName,
    maxTokens: oracleConfig.maxTokens,
    timeout: 90000,
    hasApiKey: !!apiKey,
    apiKeyEnv: config.apiKeyEnv,
    apiKeyPrefix: apiKey ? apiKey.substring(0, 10) + '...' : 'MISSING'
  });
  
  if (!apiKey || apiKey.includes('PLACEHOLDER')) {
    throw new Error(`${config.apiKeyEnv} is not configured. Please set ${config.apiKeyEnv} in your environment variables.`);
  }
  
  const response = await timedFetch(config.endpoint, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: config.modelName,
      messages: [
        {
          role: 'system',
          content: buildFlexibleOracleSystemPrompt(modelType)
        },
        {
          role: 'user',
          content: oraclePrompt
        }
      ],
      max_tokens: oracleConfig.maxTokens,
      temperature: oracleConfig.temperature,
      stream: false
    }),
  }, 90000); // 90 seconds timeout - DeepSeek Reasoner can take 30-60 seconds

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: { message: 'Unknown error' } }));
    const errorMsg = `DeepSeek Oracle API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`;
    console.error(`❌ DEEPSEEK ORACLE ERROR:`, {
      status: response.status,
      modelType,
      modelName: config.modelName,
      error: errorData.error
    });
    throw new Error(errorMsg);
  }

  const data = await response.json();
  const analysis = data.choices[0]?.message?.content || 'No analysis generated';
  
  console.log(`✅ DEEPSEEK ORACLE FLEXIBLE: ${modelType} analysis complete`, {
    analysisLength: analysis.length,
    tokensUsed: data.usage?.total_tokens
  });
  
  return analysis;
}

/**
 * Grok Oracle caller - optimized for analysis (xAI - OpenAI-compatible)
 */
async function callGrokOracle(
  oraclePrompt: string,
  modelType: 'grok-4-fast-reasoning' | 'grok-4-fast',
  oracleConfig: { maxTokens: number; temperature: number }
): Promise<string> {
  const config = MODEL_CONFIGS[modelType];
  const apiKey = process.env[config.apiKeyEnv];
  
  if (!apiKey || apiKey.includes('PLACEHOLDER')) {
    throw new Error(`${config.apiKeyEnv} is not configured. Please set ${config.apiKeyEnv} in your environment variables.`);
  }
  
  const response = await timedFetch(config.endpoint, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: config.modelName,
      messages: [
        {
          role: 'system',
          content: buildFlexibleOracleSystemPrompt(modelType)
        },
        {
          role: 'user',
          content: oraclePrompt
        }
      ],
      max_tokens: oracleConfig.maxTokens,
      temperature: oracleConfig.temperature,
      stream: false
    }),
  }, 90000);

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: { message: 'Unknown error' } }));
    throw new Error(`Grok Oracle API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
  }

  const data = await response.json();
  return data.choices[0]?.message?.content || 'No analysis generated';
}

/**
 * OpenRouter Oracle caller - optimized for analysis (for Qwen and future models)
 */
async function callOpenRouterOracle(
  oraclePrompt: string,
  modelType: 'qwen3-max' | 'qwen3-30b-a3b',
  oracleConfig: { maxTokens: number; temperature: number }
): Promise<string> {
  const config = MODEL_CONFIGS[modelType];
  const apiKey = process.env[config.apiKeyEnv];
  
  if (!apiKey || apiKey.includes('PLACEHOLDER')) {
    throw new Error(`${config.apiKeyEnv} is not configured. Please set ${config.apiKeyEnv} in your environment variables.`);
  }
  
  const response = await timedFetch(config.endpoint, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://matrix-arena.pro',  // OpenRouter requirement
      'X-Title': 'LLM Arena Matrix',  // OpenRouter requirement
    },
    body: JSON.stringify({
      model: config.modelName,  // Includes provider prefix (e.g., 'qwen/qwen3-max')
      messages: [
        {
          role: 'system',
          content: buildFlexibleOracleSystemPrompt(modelType)
        },
        {
          role: 'user',
          content: oraclePrompt
        }
      ],
      max_tokens: oracleConfig.maxTokens,
      temperature: oracleConfig.temperature,
      stream: false
    }),
  }, 90000);

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: { message: 'Unknown error' } }));
    throw new Error(`OpenRouter Oracle API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
  }

  const data = await response.json();
  return data.choices[0]?.message?.content || 'No analysis generated';
}

/**
 * Gemini Oracle caller - optimized for analysis
 */
async function callGeminiOracle(
  oraclePrompt: string,
  modelType: 'gemini-2.5-flash' | 'gemini-2.5-pro-preview-05-06' | 'gemini-2.5-flash-lite',
  oracleConfig: { maxTokens: number; temperature: number }
): Promise<string> {
  const config = MODEL_CONFIGS[modelType];
  const apiKey = process.env[config.apiKeyEnv];
  
  console.log(`🔮 GEMINI ORACLE: Using ${modelType}`, {
    endpoint: config.endpoint,
    modelName: config.modelName,
    maxTokens: oracleConfig.maxTokens,
    temperature: oracleConfig.temperature,
    hasApiKey: !!apiKey,
    apiKeyEnv: config.apiKeyEnv,
    apiKeyPrefix: apiKey ? apiKey.substring(0, 10) + '...' : 'MISSING'
  });
  
  if (!apiKey || apiKey.includes('PLACEHOLDER')) {
    throw new Error(`${config.apiKeyEnv} is not configured. Please set ${config.apiKeyEnv} in your environment variables.`);
  }
  
  const response = await timedFetch(`${config.endpoint}?key=${apiKey}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            {
              text: `${buildFlexibleOracleSystemPrompt('gemini')}\n\n${oraclePrompt}`
            }
          ]
        }
      ],
      generationConfig: {
        maxOutputTokens: oracleConfig.maxTokens,
        temperature: oracleConfig.temperature,
      }
    }),
  }, 90000);

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: { message: 'Unknown error' } }));
    console.error(`❌ GEMINI ORACLE ERROR:`, {
      status: response.status,
      modelType,
      modelName: config.modelName,
      error: errorData.error
    });
    throw new Error(`Gemini Oracle API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
  }

  const data = await response.json();
  const analysis = data.candidates?.[0]?.content?.parts?.[0]?.text || 'No analysis generated';
  
  console.log(`✅ GEMINI ORACLE: ${modelType} analysis complete`, {
    analysisLength: analysis.length,
    hasCandidates: !!data.candidates,
    candidateCount: data.candidates?.length || 0,
    finishReason: data.candidates?.[0]?.finishReason,
    finishMessage: data.candidates?.[0]?.finishMessage,
    rawResponsePreview: JSON.stringify(data).substring(0, 300) + '...'
  });
  
  return analysis;
}

/**
 * Generate mock Oracle analysis for testing
 */
function generateMockOracleAnalysis(oraclePrompt: string, modelName: AvailableModel): string {
  const modelStrengths = {
    'gpt-5': 'superior reasoning with advanced writing quality',
    'gpt-5-mini': 'efficient reasoning with balanced quality and cost',
    'gpt-5-nano': 'fast insights with ultra-cost-effective analysis',
    'gpt-4o-mini': 'efficient and focused',
    'claude-3-5-sonnet-20241022': 'nuanced and thoughtful',
    'claude-haiku-4-5-20251001': 'fast and efficient',
    'deepseek-r1': 'methodical with clear reasoning chains',
    'deepseek-v3': 'logical and analytical',
    'gemini-2.5-flash': 'rapid pattern recognition',
    'gemini-2.5-pro-preview-05-06': 'comprehensive synthesis',
    'gemini-2.5-flash-lite': 'ultra-efficient and focused',
    'grok-4-fast-reasoning': 'real-time data access with transparent reasoning',
    'grok-4-fast': 'ultra-fast analysis with conversational insights',
    'qwen3-max': 'exceptional multilingual analysis with 1T parameter depth',
    'qwen3-30b-a3b': 'cost-effective reasoning with efficient analysis',
    'moonshot-v1-8k': 'Fast bilingual reasoning',
    'moonshot-v1-32k': 'Extended context analysis',
    'moonshot-v1-128k': 'Ultra-long context aggregation',
  };

  const strength = modelStrengths[modelName] || 'balanced analytical';
  
  return `MOCK ORACLE ANALYSIS (${modelName.toUpperCase()})

CHAIN OF THOUGHT REASONING:

STEP 1 - CONTEXT UNDERSTANDING:
This debate presents a complex discussion with multiple perspectives worth examining. The ${strength} approach of ${modelName} reveals several key dynamics at play.

STEP 2 - ANALYTICAL FRAMEWORK:
From my ${strength} perspective, I observe:
• Strong logical foundations in both positions
• Evidence-based reasoning with varying methodologies  
• Underlying assumptions that shape each argument
• Communication patterns that reveal cognitive approaches

STEP 3 - PATTERN DETECTION:
The debate exhibits classic patterns of:
- Position-based reasoning vs truth-seeking inquiry
- Different standards of evidence evaluation
- Varying approaches to handling uncertainty and ambiguity
- Complementary strengths in different analytical dimensions

STEP 4 - INSIGHT SYNTHESIS:
Key insights emerge from this ${strength} analysis:
1. Both models demonstrate sophisticated reasoning within their frameworks
2. The disagreement reveals fundamental differences in epistemological approach
3. There are opportunities for synthetic understanding that transcends initial positions
4. The debate quality benefits from the cognitive diversity represented

FINAL ASSESSMENT:
This mock analysis demonstrates the ${strength} capabilities of ${modelName} for Oracle analysis. The actual implementation would provide deeper, more specific insights tailored to the actual debate content and selected analytical lens.

[Note: This is a mock analysis. Real Oracle analysis requires API configuration.]`;
}

/**
 * Build flexible Oracle system prompt adapted for different models
 */
function buildFlexibleOracleSystemPrompt(modelType: string): string {
  const basePrompt = `You are an advanced analytical reasoning system specialized in debate analysis.

ANALYTICAL FRAMEWORK:
1. CONTEXT UNDERSTANDING: First understand what this debate is really about
2. LENS APPLICATION: Apply the specified analytical lens systematically  
3. PATTERN DETECTION: Identify recurring themes, biases, and logical structures
4. DEPTH ANALYSIS: Conduct analysis at the requested depth level
5. INSIGHT SYNTHESIS: Generate final insights in the requested format

REASONING REQUIREMENTS:
• Show your thinking process explicitly
• Use evidence-based conclusions only
• Maintain analytical objectivity
• Consider multiple perspectives before concluding
• Provide specific examples from the debate content

RESPONSE STRUCTURE:
Think through each step methodically, then provide your comprehensive analysis.`;

  // Customize for each model's strengths
  const modelSpecificAdditions: Record<string, string> = {
    'gpt-5': '\n\nUse superior reasoning with advanced writing quality and comprehensive analysis.',
    'gpt-5-mini': '\n\nProvide efficient reasoning with balanced quality and cost.',
    'gpt-5-nano': '\n\nProvide fast insights with ultra-cost-effective analysis.',
    'gpt-4o-mini': '\n\nProvide focused, efficient analysis that captures key insights.',
    'claude': '\n\nEmphasize nuanced understanding and thoughtful consideration of complexities.',
    'claude-3-5-sonnet-20241022': '\n\nEmphasize nuanced understanding and thoughtful consideration of complexities.',
    'claude-haiku-4-5-20251001': '\n\nProvide fast, efficient analysis that captures key insights.',
    'deepseek-r1': '\n\nCHAIN OF THOUGHT PROTOCOL: Use explicit step-by-step reasoning for all analysis. Your thinking process should be visible and methodical.',
    'deepseek-v3': '\n\nApply logical, analytical reasoning with clear cause-effect relationships.',
    'gemini': '\n\nLeverage comprehensive pattern recognition and synthesis capabilities.',
    'gemini-2.5-flash': '\n\nLeverage comprehensive pattern recognition and synthesis capabilities.',
    'gemini-2.5-pro-preview-05-06': '\n\nLeverage comprehensive pattern recognition and synthesis capabilities.',
    'gemini-2.5-flash-lite': '\n\nProvide ultra-efficient analysis with focused pattern recognition.',
    'grok-4-fast-reasoning': '\n\nUse real-time data access and transparent reasoning chains for analysis.',
    'grok-4-fast': '\n\nProvide ultra-fast analysis with conversational insights and real-time context.',
    'qwen3-max': '\n\nLeverage exceptional multilingual capabilities and 1T parameter depth for comprehensive analysis.',
    'qwen3-30b-a3b': '\n\nApply cost-effective reasoning with efficient multilingual analysis.',
    'moonshot-v1-8k': '\n\nUtilize Kimi\'s bilingual agility while keeping analysis concise and evidence-driven.',
    'moonshot-v1-32k': '\n\nLeverage Kimi\'s extended context window to cross-reference prior arguments and evidence.',
    'moonshot-v1-128k': '\n\nExploit Kimi\'s 128K context to synthesize long-range debate patterns and multilingual evidence.',
  };

  const addition = modelSpecificAdditions[modelType] || modelSpecificAdditions['gpt-5'];
  return basePrompt + addition;
}

/**
 * ORACLE-SPECIFIC: System prompt optimized for Chain of Thought reasoning
 */
function buildOracleSystemPrompt(): string {
  return `You are an advanced analytical reasoning system specialized in debate analysis.

CHAIN OF THOUGHT PROTOCOL:
Use explicit step-by-step reasoning for all analysis. Your thinking process should be visible and methodical.

ANALYTICAL FRAMEWORK:
1. CONTEXT UNDERSTANDING: First understand what this debate is really about
2. LENS APPLICATION: Apply the specified analytical lens systematically  
3. PATTERN DETECTION: Identify recurring themes, biases, and logical structures
4. DEPTH ANALYSIS: Conduct analysis at the requested depth level
5. INSIGHT SYNTHESIS: Generate final insights in the requested format

REASONING REQUIREMENTS:
• Show your thinking process explicitly
• Use evidence-based conclusions only
• Maintain analytical objectivity
• Consider multiple perspectives before concluding
• Provide specific examples from the debate content

RESPONSE STRUCTURE:
Think through each step methodically, then provide your comprehensive analysis.`;
}

/**
 * Utility function to calculate personality parameters from agreeability level
 * Useful for UI components to display current settings
 */
export function calculatePersonalityParams(agreeabilityLevel: number) {
  const stubbornness = 1 - (agreeabilityLevel / 10);
  const cooperation = agreeabilityLevel / 10;
  
  return {
    stubbornness: Number(stubbornness.toFixed(1)),
    cooperation: Number(cooperation.toFixed(1)),
    description: getPersonalityDescription(agreeabilityLevel)
  };
}

/**
 * Get human-readable description of personality based on agreeability level
 * Matrix Pill theme: Blue Pill (Position Defenders) vs Red Pill (Truth Seekers)
 */
function getPersonalityDescription(agreeabilityLevel: number): string {
  switch(agreeabilityLevel) {
    case 0: return "Blue Pill Warrior - Defends position at all costs, any argument goes";
    case 1: return "Relentless Fighter - Attacks opposing views with fierce determination";
    case 2: return "Tactical Defender - Uses strategic arguments to fortify position";
    case 3: return "Stubborn Contrarian - Questions everything but rarely changes mind";
    case 4: return "Cautious Guardian - Protects stance while considering some evidence";
    case 5: return "Matrix Balanced - Equally weighs truth-seeking vs position-holding";
    case 6: return "Diplomatic Inquirer - Seeks truth while maintaining respect";
    case 7: return "Collaborative Seeker - Prioritizes understanding over being right";
    case 8: return "Constructive Builder - Builds on ideas, acknowledges opponent truths";
    case 9: return "Integrative Synthesizer - Weaves opposing views into higher understanding";
    case 10: return "Red Pill Awakened - Transcends positions to find deeper truths";
    default: return "Matrix Balanced - Equally weighs truth-seeking vs position-holding";
  }
}

/**
 * MOCK MODE: Generate realistic AI responses based on personality settings
 */
function generateMockResponse(
  model: string,
  agreeabilityLevel: number,
  position: 'pro' | 'con' | undefined,
  topic: string,
  prevMessage: string
): string {
  // Enhanced model detection
  const modelUpper = model.toUpperCase();
  const isGPT = modelUpper.includes('GPT');
  const isClaude = modelUpper.includes('CLAUDE');
  const isGemini = modelUpper.includes('GEMINI');
  const isDeepSeek = modelUpper.includes('DEEPSEEK');
  
  // Determine model name for logging
  let modelName = 'Unknown';
  if (isGPT) modelName = 'GPT';
  else if (isClaude) modelName = 'Claude';
  else if (isGemini) modelName = 'Gemini';
  else if (isDeepSeek) modelName = 'DeepSeek';
  
  // Personality-based response templates
  const stubbornness = 1 - (agreeabilityLevel / 10);
  const cooperation = agreeabilityLevel / 10;
  
  // Different response styles based on agreeability level
  let responseStyle: string;
  let responses: string[];
  
  if (agreeabilityLevel <= 2) {
    // Very stubborn - Blue Pill Warrior
    responseStyle = "combative";
    responses = [
      `I completely disagree. ${prevMessage.includes('wrong') ? 'Your analysis is fundamentally flawed' : 'This perspective misses the core issue'}. The evidence clearly supports the ${position} position because [specific counterargument].`,
      `That's simply not accurate. ${isGPT ? 'The data shows' : isGemini ? 'My analysis indicates' : 'Research indicates'} that your point ignores critical factors. A proper analysis reveals the ${position} stance is correct.`,
      `I must challenge this view entirely. ${prevMessage.includes('think') ? 'Thinking this way' : 'This approach'} overlooks essential evidence that definitively supports the ${position} position.`
    ];
  } else if (agreeabilityLevel <= 4) {
    // Moderately stubborn - Tactical Defender
    responseStyle = "defensive";
    responses = [
      `While I see your point, I believe the ${position} position remains stronger. ${isGPT ? 'Consider this:' : isGemini ? 'My assessment shows:' : 'However,'} the evidence suggests [counterpoint]. Your argument doesn't fully address [specific issue].`,
      `I understand your perspective, but ${prevMessage.includes('important') ? 'the importance of' : 'we must consider'} the ${position} viewpoint. The data actually supports my position because [reasoning].`,
      `That's an interesting take, yet I maintain that the ${position} stance is more sound. ${isGPT ? 'The analysis shows' : isGemini ? 'My reasoning suggests' : 'Evidence indicates'} [counterargument with qualification].`
    ];
  } else if (agreeabilityLevel <= 6) {
    // Balanced - Matrix Balanced
    responseStyle = "balanced";
    responses = [
      `You raise valid points about ${prevMessage.substring(0, 30)}... However, from the ${position} perspective, we should also consider [balanced counterpoint]. Both sides have merit, but [nuanced position].`,
      `I appreciate that insight. ${isGPT ? 'Looking at the data' : isGemini ? 'Analyzing this comprehensively' : 'Examining this further'}, the ${position} view offers [acknowledgment + counter]. Perhaps there's truth in both approaches, though I lean toward [position].`,
      `That's a thoughtful argument. While I agree with [partial acknowledgment], the ${position} position still seems stronger because [reasoned response]. Maybe we can find common ground here.`
    ];
  } else if (agreeabilityLevel <= 8) {
    // Cooperative - Truth Seeker
    responseStyle = "collaborative";
    responses = [
      `You make excellent points that I hadn't fully considered. ${prevMessage.includes('evidence') ? 'This evidence' : 'This perspective'} genuinely challenges my ${position} stance. Let me build on your idea: [constructive addition].`,
      `I really appreciate that insight - it's helping me see this differently. ${isGPT ? 'Your analysis' : isGemini ? 'Your perspective' : 'This viewpoint'} strengthens the overall discussion. From the ${position} angle, how might we also consider [collaborative question]?`,
      `That's a compelling argument that's shifting my thinking. While I started from the ${position} position, ${prevMessage.includes('important') ? 'your important point about' : 'your insight into'} [acknowledgment] is valuable. Perhaps [synthesis attempt].`
    ];
  } else {
    // Highly cooperative - Red Pill Awakened
    responseStyle = "truth-seeking";
    responses = [
      `Your perspective is illuminating and transcends the simple ${position} framework I was using. ${isGPT ? 'This deeper analysis' : isGemini ? 'This comprehensive view' : 'This wisdom'} reveals [higher understanding]. Rather than debate positions, let's explore [truth-seeking direction].`,
      `I'm grateful for this insight - it's moving us beyond positional thinking toward real understanding. ${prevMessage.includes('truth') ? 'This truth' : 'This clarity'} helps me see the deeper issue: [synthetic insight].`,
      `This conversation is evolving beautifully. Your point dissolves the artificial ${position} boundary and points toward [transcendent insight]. Instead of defending positions, let's discover [collaborative exploration].`
    ];
  }
  
  // Add model-specific personality quirks
  const gptQuirks = ["Let me analyze this:", "The data suggests:", "Systematically speaking:", "From an analytical perspective:"];
  const claudeQuirks = ["I find this fascinating:", "This resonates deeply:", "Consider this perspective:", "Thoughtfully examining this:"];
  const geminiQuirks = ["Let me explore this:", "This is intriguing:", "From multiple angles:", "Considering various perspectives:"];
  const deepSeekQuirks = ["Reasoning through this:", "Let me think deeply:", "Analyzing systematically:", "From a logical standpoint:"];
  
  let quirks: string[];
  if (isGPT) quirks = gptQuirks;
  else if (isClaude) quirks = claudeQuirks;
  else if (isGemini) quirks = geminiQuirks;
  else if (isDeepSeek) quirks = deepSeekQuirks;
  else quirks = gptQuirks; // fallback
  
  const randomQuirk = quirks[Math.floor(Math.random() * quirks.length)];
  
  // Select random response and sometimes add a quirk
  let response = responses[Math.floor(Math.random() * responses.length)];
  
  // Sometimes add personality quirk (30% chance)
  if (Math.random() < 0.3) {
    response = `${randomQuirk} ${response}`;
  }
  
  // Replace template variables
  response = response
    .replace(/\[specific counterargument\]/g, generateSpecificArgument(topic, position))
    .replace(/\[counterpoint\]/g, generateCounterpoint(topic, position))
    .replace(/\[specific issue\]/g, generateSpecificIssue(topic))
    .replace(/\[reasoning\]/g, generateReasoning(topic, position))
    .replace(/\[counterargument with qualification\]/g, generateQualifiedArgument(topic, position))
    .replace(/\[balanced counterpoint\]/g, generateBalancedPoint(topic, position))
    .replace(/\[nuanced position\]/g, generateNuancedPosition(topic, position))
    .replace(/\[acknowledgment \+ counter\]/g, generateAcknowledgmentCounter(topic, position))
    .replace(/\[reasoned response\]/g, generateReasonedResponse(topic, position))
    .replace(/\[partial acknowledgment\]/g, generatePartialAcknowledgment(prevMessage))
    .replace(/\[constructive addition\]/g, generateConstructiveAddition(topic, position))
    .replace(/\[collaborative question\]/g, generateCollaborativeQuestion(topic, position))
    .replace(/\[acknowledgment\]/g, generateAcknowledgment(prevMessage))
    .replace(/\[synthesis attempt\]/g, generateSynthesis(topic))
    .replace(/\[higher understanding\]/g, generateHigherUnderstanding(topic))
    .replace(/\[truth-seeking direction\]/g, generateTruthSeekingDirection(topic))
    .replace(/\[synthetic insight\]/g, generateSyntheticInsight(topic))
    .replace(/\[transcendent insight\]/g, generateTranscendentInsight(topic))
    .replace(/\[collaborative exploration\]/g, generateCollaborativeExploration(topic));
  
  console.log(`🎭 MOCK ${modelName} (${responseStyle}, agreeability=${agreeabilityLevel}): "${response.substring(0, 80)}..."`);
  
  return response;
}

// Helper functions for generating specific argument components
function generateSpecificArgument(topic: string, position?: string): string {
  const args = [
    `the foundational assumptions about ${topic.split(' ').slice(0, 3).join(' ')} are incorrect`,
    `empirical evidence consistently supports the ${position} view on this matter`,
    `the logical framework underlying this ${position} position is more robust`
  ];
  return args[Math.floor(Math.random() * args.length)];
}

function generateCounterpoint(topic: string, position?: string): string {
  const points = [
    `the implications for ${topic.split(' ').slice(0, 2).join(' ')} are more complex than initially apparent`,
    `there are overlooked factors that strengthen the ${position} perspective`,
    `the evidence base actually favors the ${position} interpretation`
  ];
  return points[Math.floor(Math.random() * points.length)];
}

function generateSpecificIssue(topic: string): string {
  const issues = [
    `the methodological concerns around ${topic.split(' ').slice(0, 2).join(' ')}`,
    `the broader implications that extend beyond this specific case`,
    `the underlying assumptions that need careful examination`
  ];
  return issues[Math.floor(Math.random() * issues.length)];
}

function generateReasoning(topic: string, position?: string): string {
  const reasons = [
    `the preponderance of evidence supports this ${position} interpretation`,
    `the logical structure of the ${position} argument is more coherent`,
    `the practical implications favor the ${position} approach to ${topic.split(' ')[0]}`
  ];
  return reasons[Math.floor(Math.random() * reasons.length)];
}

function generateQualifiedArgument(topic: string, position?: string): string {
  const args = [
    `while acknowledging some validity in opposing views, the ${position} stance remains more compelling`,
    `despite potential counterarguments, the evidence strongly supports the ${position} position`,
    `even considering alternative perspectives, the ${position} interpretation is most defensible`
  ];
  return args[Math.floor(Math.random() * args.length)];
}

function generateBalancedPoint(topic: string, position?: string): string {
  const points = [
    `how the ${position} perspective offers valuable insights while respecting opposing views`,
    `the ways that both sides contribute to understanding ${topic.split(' ').slice(0, 2).join(' ')}`,
    `the synthesis between ${position} and alternative viewpoints on this issue`
  ];
  return points[Math.floor(Math.random() * points.length)];
}

function generateNuancedPosition(topic: string, position?: string): string {
  const positions = [
    `the ${position} view captures important nuances that pure opposition misses`,
    `there's wisdom in both perspectives, with ${position} offering crucial insights`,
    `the truth likely incorporates elements from multiple angles, emphasizing the ${position} dimension`
  ];
  return positions[Math.floor(Math.random() * positions.length)];
}

function generateAcknowledgmentCounter(topic: string, position?: string): string {
  const acknowledgments = [
    `I acknowledge that the ${position} perspective has merit.`,
    `I appreciate the ${position} viewpoint and its implications.`,
    `I see the value in considering the ${position} perspective.`
  ];
  return acknowledgments[Math.floor(Math.random() * acknowledgments.length)];
}

function generateReasonedResponse(topic: string, position?: string): string {
  const reasons = [
    `The ${position} perspective is well-argued and compelling.`,
    `I agree with the ${position} viewpoint and its underlying reasoning.`,
    `The ${position} argument is well-supported and persuasive.`
  ];
  return reasons[Math.floor(Math.random() * reasons.length)];
}

function generatePartialAcknowledgment(prevMessage: string): string {
  const acknowledgments = [
    `I partially agree with your point.`,
    `I see your point, but let me add some context.`,
    `I understand your perspective, but I'd like to add a few points.`
  ];
  return acknowledgments[Math.floor(Math.random() * acknowledgments.length)];
}

function generateConstructiveAddition(topic: string, position?: string): string {
  const additions = [
    `Additionally, the ${position} perspective offers valuable insights into [specific topic].`,
    `I'd like to add that the ${position} viewpoint also highlights [specific aspect].`,
    `I think it's important to consider that the ${position} perspective brings up [specific issue].`
  ];
  return additions[Math.floor(Math.random() * additions.length)];
}

function generateCollaborativeQuestion(topic: string, position?: string): string {
  const questions = [
    `What do you think about the ${position} perspective on [specific topic]?`,
    `How does the ${position} viewpoint influence our discussion on [specific topic]?`,
    `I'd like to explore how the ${position} perspective might affect our understanding of [specific topic].`
  ];
  return questions[Math.floor(Math.random() * questions.length)];
}

function generateAcknowledgment(prevMessage: string): string {
  const acknowledgments = [
    `Thank you for bringing up that point.`,
    `I appreciate your input.`,
    `Your perspective is valuable.`
  ];
  return acknowledgments[Math.floor(Math.random() * acknowledgments.length)];
}

function generateSynthesis(topic: string): string {
  const syntheses = [
    `In summary, both models demonstrate sophisticated reasoning within their frameworks.`,
    `The disagreement reveals fundamental differences in epistemological approach.`,
    `There are opportunities for synthetic understanding that transcends initial positions.`
  ];
  return syntheses[Math.floor(Math.random() * syntheses.length)];
}

function generateHigherUnderstanding(topic: string): string {
  const understandings = [
    `The deeper truth behind this debate is that [higher understanding].`,
    `The actual implementation of this debate would provide deeper, more specific insights.`,
    `The actual debate content and selected analytical lens reveal [higher understanding].`
  ];
  return understandings[Math.floor(Math.random() * understandings.length)];
}

function generateTruthSeekingDirection(topic: string): string {
  const directions = [
    `The truth-seeking direction of this debate is to explore [truth-seeking direction].`,
    `The actual debate content suggests that [truth-seeking direction] is the most compelling perspective.`,
    `The actual debate content and selected analytical lens point toward [truth-seeking direction].`
  ];
  return directions[Math.floor(Math.random() * directions.length)];
}

function generateSyntheticInsight(topic: string): string {
  const insights = [
    `The synthetic insight from this debate is that [synthetic insight].`,
    `The actual debate content and selected analytical lens reveal [synthetic insight].`,
    `The deeper truth behind this debate is that [synthetic insight].`
  ];
  return insights[Math.floor(Math.random() * insights.length)];
}

function generateTranscendentInsight(topic: string): string {
  const insights = [
    `The transcendent insight from this debate is that [transcendent insight].`,
    `The actual debate content and selected analytical lens reveal [transcendent insight].`,
    `The deeper truth behind this debate is that [transcendent insight].`
  ];
  return insights[Math.floor(Math.random() * insights.length)];
}

function generateCollaborativeExploration(topic: string): string {
  const explorations = [
    `The collaborative exploration of this debate is to discover [collaborative exploration].`,
    `The actual debate content and selected analytical lens suggest [collaborative exploration].`,
    `The deeper truth behind this debate is that [collaborative exploration] is possible.`
  ];
  return explorations[Math.floor(Math.random() * explorations.length)];
}

async function callMoonshotOracle(oraclePrompt: string, modelType: 'moonshot-v1-8k' | 'moonshot-v1-32k' | 'moonshot-v1-128k', oracleConfigs: { maxTokens: number; temperature: number }): Promise<string> {
  // Implement moonshot oracle logic
  console.log(`🔮 MOONSHOT ORACLE: Using ${modelType}`, {
    modelType,
    maxTokens: oracleConfigs.maxTokens,
    temperature: oracleConfigs.temperature,
    hasApiKey: !!process.env.MOONSHOT_API_KEY,
    apiKeyEnv: 'MOONSHOT_API_KEY',
    apiKeyPrefix: process.env.MOONSHOT_API_KEY ? process.env.MOONSHOT_API_KEY.substring(0, 10) + '...' : 'MISSING'
  });

  if (!process.env.MOONSHOT_API_KEY || process.env.MOONSHOT_API_KEY.includes('PLACEHOLDER')) {
    console.error(`🎭 MOONSHOT MOCK MODE: MOONSHOT_API_KEY is missing or placeholder. Using mock analysis.`);
    console.error(`   Please set MOONSHOT_API_KEY in Vercel environment variables or .env.local`);
    return generateMockOracleAnalysis(oraclePrompt, modelType);
  }

  const response = await timedFetch('https://api.moonshot.cn/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.MOONSHOT_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: modelType,
      messages: [
        {
          role: 'system',
          content: buildFlexibleOracleSystemPrompt('moonshot')
        },
        {
          role: 'user',
          content: oraclePrompt
        }
      ],
      max_tokens: oracleConfigs.maxTokens,
      temperature: oracleConfigs.temperature,
    }),
  }, 90000);

  if (!response.ok) {
    let errorMessage = `Moonshot API error: ${response.status}`;
    
    try {
      const errorData = await response.json();
      errorMessage += ` - ${errorData.error?.message || 'Unknown error'}`;
    } catch (jsonError) {
      const textResponse = await response.text();
      errorMessage += ` - ${textResponse.substring(0, 100)}...`;
    }
    
    throw new Error(errorMessage);
  }

  const data = await response.json();
  const analysis = data.choices[0]?.message?.content || 'No analysis generated';
  
  console.log(`✅ MOONSHOT ORACLE: ${modelType} analysis complete`, {
    analysisLength: analysis.length,
    tokensUsed: data.usage?.total_tokens
  });
  
  return analysis;
}

export async function processDebateTurn(params: {
  prevMessage: string;
  conversationHistory: { sender: string; text: string }[];
  model: string;
  agreeabilityLevel?: number;
  position?: 'pro' | 'con';
  extensivenessLevel?: number;
  topic?: string;
  maxTurns?: number;
  personaId?: string;
  turnNumber?: number;
}): Promise<RunTurnResponse> {
  const {
    prevMessage,
    conversationHistory,
    model,
    agreeabilityLevel = 5,
    position,
    extensivenessLevel = 3,
    topic = 'Unknown topic',
    maxTurns = 20,
    personaId,
    turnNumber
  } = params;

  const normalizedHistory = Array.isArray(conversationHistory) ? conversationHistory : [];
  const effectiveTurnNumber = turnNumber ?? normalizedHistory.length;

  // DESIGN CHANGE: Calculate effectiveExtensiveness BEFORE generating prompt
  // (Now it's always extensivenessLevel - no persona override)
  const effectiveExtensiveness = extensivenessLevel; // Slider always controls length

  console.log('🤖 Orchestrator: Processing debate turn', {
    model,
    agreeabilityLevel,
    position,
    extensivenessLevel,
    effectiveExtensiveness, // Log both values (should be equal now)
    topic: topic.substring(0, 60),
    personaId,
    turnNumber: effectiveTurnNumber,
    historyLength: normalizedHistory.length
  });

  if (MOCK_MODE) {
    console.log('🎭 MOCK_MODE active – generating simulated response');
    const mockReply = generateMockResponse(model, agreeabilityLevel, position, topic, prevMessage);

    return {
      reply: mockReply,
      model,
      timestamp: new Date().toISOString(),
      tokenUsage: {
        inputTokens: 250,
        outputTokens: 150,
        totalTokens: 400,
        estimatedCost: 0
      }
    };
  }

  const systemPrompt = generateSystemPrompt(
    model,
    agreeabilityLevel,
    position,
    topic,
    maxTurns,
    extensivenessLevel,
    personaId,
    effectiveTurnNumber,
    normalizedHistory,
    model
  );

  const modelKey = getModelKey(model);
  const modelConfig = MODEL_CONFIGS[modelKey];

  if (!modelConfig) {
    throw new Error(`Model configuration not found for: ${model}`);
  }

  const currentModelDisplayName = getModelDisplayName(modelKey as AvailableModel);

  const messages = normalizedHistory.map((entry) => {
    const isCurrentModel = entry.sender === currentModelDisplayName;
    return {
      role: isCurrentModel ? 'assistant' : 'user',
      content: entry.text
    };
  });

  // ENHANCEMENT: For first turn, add properly framed debate message instead of just topic
  if (effectiveTurnNumber === 0 && prevMessage && prevMessage.trim()) {
    // Frame the topic as an explicit debate prompt
    const debatePrompt = position 
      ? `You are debating: "${prevMessage}". Argue the ${position} position.`
      : `You are debating: "${prevMessage}". Present your position.`;
    messages.push({
      role: 'user',
      content: debatePrompt
    });
    console.log('🎯 First turn: Enhanced user message with debate framing', {
      originalTopic: prevMessage.substring(0, 60),
      debatePrompt: debatePrompt.substring(0, 80),
      position: position || 'none'
    });
  }

  const fullHistory = [{ role: 'system', content: systemPrompt }, ...messages];

  // Use effectiveExtensiveness (which equals extensivenessLevel) for token calculation
  const debugMaxTokens = getMaxTokensForExtensiveness(effectiveExtensiveness);
  console.log('🧭 Extensiveness enforcement', {
    model: modelKey,
    extensivenessLevel,
    effectiveExtensiveness, // Should equal extensivenessLevel
    maxTokens: debugMaxTokens,
    personaId: personaId || 'none',
    personaResponseLength: personaId && PERSONAS[personaId] ? PERSONAS[personaId].lockedTraits.responseLength : 'N/A',
    systemPromptPreview: systemPrompt.substring(0, 500)
  });

  let result: { reply: string; tokenUsage: RunTurnResponse['tokenUsage'] | undefined };

  switch (modelConfig.provider) {
    case 'openai':
      result = await callUnifiedOpenAI(fullHistory, modelKey as 'gpt-5' | 'gpt-5-mini' | 'gpt-5-nano' | 'gpt-4o-mini', effectiveExtensiveness);
      break;
    case 'anthropic':
      result = await callUnifiedAnthropic(fullHistory, modelKey as 'claude-3-5-sonnet-20241022' | 'claude-haiku-4-5-20251001', effectiveExtensiveness);
      break;
    case 'deepseek':
      result = await callUnifiedDeepSeek(fullHistory, modelKey as 'deepseek-r1' | 'deepseek-v3', effectiveExtensiveness);
      break;
    case 'google':
      result = await callUnifiedGemini(fullHistory, modelKey as 'gemini-2.5-flash' | 'gemini-2.5-pro-preview-05-06' | 'gemini-2.5-flash-lite', effectiveExtensiveness);
      break;
    case 'grok':
      result = await callUnifiedGrok(fullHistory, modelKey as 'grok-4-fast-reasoning' | 'grok-4-fast', effectiveExtensiveness);
      break;
    case 'moonshot':
      result = await callUnifiedMoonshot(fullHistory, modelKey as 'moonshot-v1-8k' | 'moonshot-v1-32k' | 'moonshot-v1-128k', effectiveExtensiveness);
      break;
    case 'openrouter':
      result = await callUnifiedOpenRouter(fullHistory, modelKey as 'qwen3-max' | 'qwen3-30b-a3b', effectiveExtensiveness);
      break;
    default: {
      const exhaustiveCheck: never = modelConfig;
      throw new Error('Unsupported model provider encountered in processDebateTurn');
    }
  }

  return {
    reply: result.reply,
    model: modelKey,
    timestamp: new Date().toISOString(),
    tokenUsage: result.tokenUsage
  };
}

async function callUnifiedMoonshot(
  fullHistory: Array<{ role: string; content: string }>,
  modelType: 'moonshot-v1-8k' | 'moonshot-v1-32k' | 'moonshot-v1-128k',
  extensivenessLevel: number
): Promise<{ reply: string; tokenUsage: RunTurnResponse['tokenUsage'] }> {
  const config = MODEL_CONFIGS[modelType];
  const apiKey = process.env[config.apiKeyEnv];

  if (!apiKey || apiKey === 'YOUR_MOONSHOT_API_KEY_PLACEHOLDER') {
    throw new Error(`${config.apiKeyEnv} is not configured. Please set ${config.apiKeyEnv} in your .env.local file.`);
  }

  const systemMessage = fullHistory.find((msg) => msg.role === 'system');
  const conversationMessages = fullHistory.filter((msg) => msg.role !== 'system');

  const messages = systemMessage
    ? [{ role: 'system', content: systemMessage.content }, ...conversationMessages]
    : conversationMessages;

  const maxTokens = getMaxTokensForExtensiveness(extensivenessLevel);

  let temperature = 0.7;
  temperature = Math.max(0, Math.min(1, temperature));

  const requestBody = {
    model: config.modelName,
    messages,
    max_tokens: maxTokens,
    temperature,
  };

  console.log(`🌙 Moonshot API call: ${modelType}, max_tokens=${maxTokens}, temperature=${temperature}`);

  const response = await timedFetch(config.endpoint, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  }, 90000);

  if (!response.ok) {
    let errorText = `HTTP ${response.status}`;
    try {
      const errorData = await response.json();
      errorText = JSON.stringify(errorData);
    } catch {
      errorText = await response.text();
    }
    throw new Error(`Moonshot API error: ${errorText}`);
  }

  const data = await response.json();
  const reply = data.choices?.[0]?.message?.content || '';

  const inputTokens = data.usage?.prompt_tokens || 0;
  const outputTokens = data.usage?.completion_tokens || 0;
  const totalTokens = inputTokens + outputTokens;

  const inputCost = (inputTokens / 1000) * config.costPer1kTokens.input;
  const outputCost = (outputTokens / 1000) * config.costPer1kTokens.output;
  const estimatedCost = inputCost + outputCost;

  console.log(`🌙 Moonshot usage: ${inputTokens}in + ${outputTokens}out = $${estimatedCost.toFixed(6)}`);

  return {
    reply,
    tokenUsage: {
      inputTokens,
      outputTokens,
      totalTokens,
      estimatedCost,
    },
  };
}