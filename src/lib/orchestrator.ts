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

import type { AvailableModel } from '@/types';
import { PERSONAS, PersonaDefinition } from './personas';
import { getModelDisplayName } from './modelConfigs';

const MAX_INFLUENCE = 4.0; // The maximum "pull" the slider can exert on a persona's base agreeability.

/**
 * Calculates the effective agreeability by mapping the full 0-10 slider range
 * onto the persona's possible agreeability range, using their base agreeability as an anchor.
 * @param sliderLevel The UI slider value (0-10)
 * @param baseAgreeability The persona's innate agreeability (0-10)
 * @returns The final, calculated agreeability score.
 */
function calculateEffectiveAgreeability(sliderLevel: number, baseAgreeability: number): number {
  const minPossible = Math.max(0, baseAgreeability - MAX_INFLUENCE);
  const maxPossible = Math.min(10, baseAgreeability + MAX_INFLUENCE);

  if (sliderLevel === 5) {
    return baseAgreeability; // Neutral slider = base personality.
  } 
  
  else if (sliderLevel < 5) {
    // Map slider's [0, 5) range to persona's [minPossible, baseAgreeability) range.
    const sliderPercentage = sliderLevel / 5.0;
    return minPossible + (sliderPercentage * (baseAgreeability - minPossible));
  } 
  
  else { // sliderLevel > 5
    // Map slider's (5, 10] range to persona's (baseAgreeability, maxPossible] range.
    const sliderPercentage = (sliderLevel - 5) / 5.0;
    return baseAgreeability + (sliderPercentage * (maxPossible - baseAgreeability));
  }
}

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
  'gpt-4o': {
    provider: 'openai',
    endpoint: 'https://api.openai.com/v1/chat/completions',
    modelName: 'gpt-4o',
    maxTokens: 200,
    apiKeyEnv: 'OPENAI_API_KEY',
    costPer1kTokens: { input: 0.03, output: 0.06 } // GPT-4o pricing
  },
  'gpt-4o-mini': {
    provider: 'openai', 
    endpoint: 'https://api.openai.com/v1/chat/completions',
    modelName: 'gpt-4o-mini',
    maxTokens: 200,
    apiKeyEnv: 'OPENAI_API_KEY',
    costPer1kTokens: { input: 0.00015, output: 0.0006 } // GPT-4o mini pricing
  },
  'claude-3-5-sonnet-20241022': {
    provider: 'anthropic',
    endpoint: 'https://api.anthropic.com/v1/messages',
    modelName: 'claude-3-5-sonnet-20241022',
    maxTokens: 200,
    apiKeyEnv: 'ANTHROPIC_API_KEY',
    costPer1kTokens: { input: 0.003, output: 0.015 } // Claude pricing
  },
  'deepseek-r1': {
    provider: 'deepseek',
    endpoint: 'https://api.deepseek.com/v1/chat/completions', 
    modelName: 'deepseek-reasoner',
    maxTokens: 200,
    apiKeyEnv: 'DEEPSEEK_API_KEY',
    costPer1kTokens: { input: 0.0014, output: 0.0028 } // DeepSeek R1 pricing
  },
  'deepseek-v3': {
    provider: 'deepseek',
    endpoint: 'https://api.deepseek.com/v1/chat/completions',
    modelName: 'deepseek-chat',
    maxTokens: 200, 
    apiKeyEnv: 'DEEPSEEK_API_KEY',
    costPer1kTokens: { input: 0.00014, output: 0.00028 } // DeepSeek v3 pricing
  },
  // PHASE A: Google Gemini models integration - Updated with exact API names
  'gemini-2.5-flash-preview-05-06': {
    provider: 'google',
    endpoint: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-06:generateContent',
    modelName: 'gemini-2.5-flash-preview-05-06',
    maxTokens: 200,
    apiKeyEnv: 'GOOGLE_AI_API_KEY',
    costPer1kTokens: { input: 0.00015, output: 0.0006 } // Gemini Flash pricing (similar to GPT-4 mini)
  },
  'gemini-2.5-pro-preview-05-06': {
    provider: 'google',
    endpoint: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro-preview-05-06:generateContent',
    modelName: 'gemini-2.5-pro-preview-05-06',
    maxTokens: 200,
    apiKeyEnv: 'GOOGLE_AI_API_KEY',
    costPer1kTokens: { input: 0.00125, output: 0.005 } // Gemini Pro pricing
  }
} as const;

type SupportedModel = keyof typeof MODEL_CONFIGS;

// PLAN B: Helper function to normalize model names to MODEL_CONFIGS keys
function getModelKey(model: string): SupportedModel {
  const normalized = model.toUpperCase().trim();
  
  // Handle different input variations
  switch (normalized) {
    case 'GPT':
    case 'GPT-4':
    case 'OPENAI':
      return 'gpt-4o';
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
      return 'gemini-2.5-flash-preview-05-06';
    case 'GEMINI-2.5-PRO':
    case 'GEMINI_2.5_PRO':
    case 'GEMINI-PRO':
    case 'GEMINI_PRO':
    case 'GEMINI-PREVIEW':
    case 'GOOGLE-PRO':
    case 'PRO':
      return 'gemini-2.5-pro-preview-05-06';
    default:
      // Try exact match first
      if (normalized in MODEL_CONFIGS) {
        return normalized as SupportedModel;
      }
      // If no match, default to GPT for backward compatibility
      console.warn(`Unknown model "${model}", defaulting to gpt-4o`);
      return 'gpt-4o';
  }
}

// MOCK MODE: Configuration flag - defaults to true when API keys are missing/invalid
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
  stance?: 'truthSeeker' | 'stubborn',
  turnNumber: number = 0,
  conversationHistory?: any[],
  model?: string
): string {
  let effectiveAgreeability = agreeabilityLevel;
  let effectiveExtensiveness = extensivenessLevel;
  let personaPromptPart = '';

  // If persona is selected, it MODIFIES the slider values.
  if (personaId && PERSONAS[personaId]) {
    const persona = PERSONAS[personaId];
    const baseAgreeability = 10 - persona.lockedTraits.baseStubbornness;
    
    // NEW LOGIC: Use the two-sided interpolation model
    effectiveAgreeability = calculateEffectiveAgreeability(agreeabilityLevel, baseAgreeability);

    const baseLength = persona.lockedTraits.responseLength;
    effectiveExtensiveness = baseLength + (extensivenessLevel - 3) * 0.5;

    // effectiveAgreeability is already clamped within its function
    effectiveExtensiveness = Math.max(1, Math.min(5, Math.round(effectiveExtensiveness)));
    
    // Build the persona-specific part of the prompt
    personaPromptPart = persona.identity + '\n\n';
    if (stance && persona.stanceModifiers[stance]) {
      personaPromptPart += `Stance Guidance: ${persona.stanceModifiers[stance]}\n\n`;
    }
    personaPromptPart += `Behavioral Anchors: ${persona.turnRules}\n\n`;
  }

  // The rest of the prompt generation now uses the (potentially modified) effective values.
  const stubbornness = 1 - effectiveAgreeability / 10;
  const cooperation = effectiveAgreeability / 10;
  const minTurns = Math.ceil(maxTurns * 0.3);

  const positionText =
    position && topic
      ? `You must advocate **${position.toUpperCase()}** regarding the statement: "${topic}".`
      : '';

  // Generate extensiveness instructions based on level (1-5)
  const getExtensivenessInstructions = (level: number): string => {
    switch (level) {
      case 1:
        return `• Aim for approximately 1-2 sentences - be powerfully concise
• Every word must count - maximum impact, minimum length
• Avoid explanations - state your point directly and with precision`;
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
• Develop your arguments with supporting evidence and context`;
      case 5:
        return `• Aim for roughly 5-8 sentences - academic depth
• Provide thorough exploration with nuanced analysis
• Include detailed reasoning, examples, and implications as appropriate`;
      default:
        return `• Aim for around 3-4 sentences - balanced length
• Provide key arguments with some supporting context
• Strike a balance between depth and brevity as needed`;
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

  // IMPROVED: Turn-specific prompts for better debate quality
  let systemPrompt = `${personaPromptPart}You are ${agentName} participating in a structured debate focused on truth-seeking through discourse.

• Stubbornness level S = ${stubbornness.toFixed(1)}
• Cooperation level C = ${cooperation.toFixed(1)}
${positionText}

Your Core Instructions:
• The debate will last no more than ${maxTurns} turns. You must argue your position until at least turn ${minTurns}.
• After turn ${minTurns}, if the evidence overwhelmingly refutes your position, you may concede.

1. Behavioral Parameters (On a scale of 0 to 10):
${getBehavioralInstructions(effectiveAgreeability)}

2. Response Length (Extensiveness: ${Math.round(effectiveExtensiveness)}/5):
${getExtensivenessInstructions(effectiveExtensiveness)}

`;

  // TURN-SPECIFIC INSTRUCTIONS
  if (turnNumber === 0) {
    // FIRST TURN - Establish position
    systemPrompt += `3. FIRST TURN INSTRUCTIONS:
• Present 2-3 strong, distinct arguments for your position
• Use specific examples or evidence
• Be concise but substantive
• Set up arguments you can BUILD ON in later turns
• Establish your core thesis clearly
• Make each argument distinct and memorable`;
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

3. INTRODUCE NEW EVIDENCE
   You MUST bring something new this turn.
   
   Options for any topic:
   • Scientific research or data
   • Historical examples
   • Cultural perspectives
   • Psychological principles
   • Expert opinions
   • Concrete scenarios or thought experiments
   • Cross-domain analogies
   
   ❌ AVOID vague phrases like "many people believe" or "it's well known"
   ✅ USE specific references: "Studies show...", "In 1960s Japan...", "Psychologists call this..."

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
 * Unified OpenAI API caller supporting multiple OpenAI models
 */
async function callUnifiedOpenAI(messages: any[], modelType: 'gpt-4o' | 'gpt-4o-mini'): Promise<{reply: string, tokenUsage: RunTurnResponse['tokenUsage']}> {
  const config = MODEL_CONFIGS[modelType];
  const apiKey = process.env[config.apiKeyEnv];
  
  if (!apiKey || apiKey === 'YOUR_OPENAI_API_KEY_PLACEHOLDER') {
    throw new Error(`${config.apiKeyEnv} is not configured. Please set ${config.apiKeyEnv} in your .env.local file.`);
  }

  const response = await timedFetch(config.endpoint, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: config.modelName,
      messages: messages,
      max_tokens: config.maxTokens,
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
      if (textResponse.includes('Internal Server Error')) {
        errorMessage += ' - Internal Server Error (likely authentication issue)';
      } else {
        errorMessage += ` - ${textResponse.substring(0, 100)}...`;
      }
    }
    
    throw new Error(errorMessage);
  }

  const data = await response.json();
  const reply = data.choices[0]?.message?.content || 'No response generated';
  
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
async function callUnifiedAnthropic(messages: any[]): Promise<{reply: string, tokenUsage: RunTurnResponse['tokenUsage']}> {
  const config = MODEL_CONFIGS['claude-3-5-sonnet-20241022'];
  const apiKey = process.env[config.apiKeyEnv];
  
  if (!apiKey || apiKey === 'YOUR_ANTHROPIC_API_KEY_PLACEHOLDER') {
    throw new Error(`${config.apiKeyEnv} is not configured. Please set ${config.apiKeyEnv} in your .env.local file.`);
  }

  const systemPrompt = messages.find(m => m.role === 'system')?.content || '';
  const userMessages = messages.filter(m => m.role !== 'system');

  const response = await timedFetch(config.endpoint, {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'Content-Type': 'application/json',
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: config.modelName,
      max_tokens: config.maxTokens,
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
  const reply = data.content[0]?.text || 'No response generated';
  
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
async function callUnifiedDeepSeek(messages: any[], modelType: 'deepseek-r1' | 'deepseek-v3'): Promise<{reply: string, tokenUsage: RunTurnResponse['tokenUsage']}> {
  const config = MODEL_CONFIGS[modelType];
  const apiKey = process.env[config.apiKeyEnv];
  
  if (!apiKey) {
    throw new Error(`${config.apiKeyEnv} is not configured. Please set ${config.apiKeyEnv} in your .env.local file.`);
  }

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
      max_tokens: config.maxTokens,
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
  const reply = data.choices[0]?.message?.content || 'No response generated';
  
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
async function callUnifiedGemini(messages: any[], modelType: 'gemini-2.5-flash-preview-05-06' | 'gemini-2.5-pro-preview-05-06'): Promise<{reply: string, tokenUsage: RunTurnResponse['tokenUsage']}> {
  const config = MODEL_CONFIGS[modelType];
  const apiKey = process.env[config.apiKeyEnv];
  
  if (!apiKey || apiKey === 'YOUR_GOOGLE_AI_API_KEY_PLACEHOLDER') {
    throw new Error(`${config.apiKeyEnv} is not configured. Please set ${config.apiKeyEnv} in your .env.local file.`);
  }

  // Gemini uses a different API format. We combine messages into a single text block.
  const combinedText = messages.map(m => `${m.role}: ${m.content}`).join('\n\n');

  const response = await timedFetch(`${config.endpoint}?key=${apiKey}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            { text: combinedText }
          ]
        }
      ],
      generationConfig: {
        maxOutputTokens: config.maxTokens,
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
  const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response generated';
  
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
  
  // Check for API key
  const apiKey = process.env[config.apiKeyEnv];
  if (!apiKey || apiKey.includes('PLACEHOLDER')) {
    console.log('🎭 ORACLE MOCK MODE: No API key, using mock analysis');
    return generateMockOracleAnalysis(oraclePrompt, modelName);
  }

  // Oracle-specific configurations for each model type
  const oracleConfigs = getOracleModelConfig(modelName);
  
  try {
    let analysis: string;
    
    switch (config.provider) {
      case 'openai':
        analysis = await callOpenAIOracle(oraclePrompt, modelKey as 'gpt-4o' | 'gpt-4o-mini', oracleConfigs);
        break;
      case 'anthropic':
        analysis = await callAnthropicOracle(oraclePrompt, oracleConfigs);
        break;
      case 'deepseek':
        analysis = await callDeepSeekOracleFlexible(oraclePrompt, modelKey as 'deepseek-r1' | 'deepseek-v3', oracleConfigs);
        break;
      case 'google':
        analysis = await callGeminiOracle(oraclePrompt, modelKey as 'gemini-2.5-flash-preview-05-06' | 'gemini-2.5-pro-preview-05-06', oracleConfigs);
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
    'gpt-4o': { maxTokens: 16000, temperature: 0.1 },
    'gpt-4o-mini': { maxTokens: 8000, temperature: 0.1 },
    'claude-3-5-sonnet-20241022': { maxTokens: 8000, temperature: 0.1 },
    'deepseek-r1': { maxTokens: 32000, temperature: 0.1 },
    'deepseek-v3': { maxTokens: 16000, temperature: 0.1 },
    'gemini-2.5-flash-preview-05-06': { maxTokens: 8000, temperature: 0.1 },
    'gemini-2.5-pro-preview-05-06': { maxTokens: 30000, temperature: 0.1 }
  };
  
  return oracleConfigs[modelName] || { maxTokens: 8000, temperature: 0.1 };
}

/**
 * OpenAI Oracle caller - optimized for analysis
 */
async function callOpenAIOracle(
  oraclePrompt: string, 
  modelType: 'gpt-4o' | 'gpt-4o-mini',
  oracleConfig: { maxTokens: number; temperature: number }
): Promise<string> {
  const config = MODEL_CONFIGS[modelType];
  const apiKey = process.env[config.apiKeyEnv];
  
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
  oracleConfig: { maxTokens: number; temperature: number }
): Promise<string> {
  const config = MODEL_CONFIGS['claude-3-5-sonnet-20241022'];
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
    throw new Error(`DeepSeek Oracle API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
  }

  const data = await response.json();
  return data.choices[0]?.message?.content || 'No analysis generated';
}

/**
 * Gemini Oracle caller - optimized for analysis
 */
async function callGeminiOracle(
  oraclePrompt: string,
  modelType: 'gemini-2.5-flash-preview-05-06' | 'gemini-2.5-pro-preview-05-06',
  oracleConfig: { maxTokens: number; temperature: number }
): Promise<string> {
  const config = MODEL_CONFIGS[modelType];
  const apiKey = process.env[config.apiKeyEnv];
  
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
    throw new Error(`Gemini Oracle API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
  }

  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || 'No analysis generated';
}

/**
 * Generate mock Oracle analysis for testing
 */
function generateMockOracleAnalysis(oraclePrompt: string, modelName: AvailableModel): string {
  const modelStrengths = {
    'gpt-4o': 'systematic and structured',
    'gpt-4o-mini': 'efficient and focused',
    'claude-3-5-sonnet-20241022': 'nuanced and thoughtful',
    'deepseek-r1': 'methodical with clear reasoning chains',
    'deepseek-v3': 'logical and analytical',
    'gemini-2.5-flash-preview-05-06': 'rapid pattern recognition',
    'gemini-2.5-pro-preview-05-06': 'comprehensive synthesis'
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
    'gpt-4o': '\n\nUse systematic, structured analysis with clear logical progression.',
    'gpt-4o-mini': '\n\nProvide focused, efficient analysis that captures key insights.',
    'claude': '\n\nEmphasize nuanced understanding and thoughtful consideration of complexities.',
    'claude-3-5-sonnet-20241022': '\n\nEmphasize nuanced understanding and thoughtful consideration of complexities.',
    'deepseek-r1': '\n\nCHAIN OF THOUGHT PROTOCOL: Use explicit step-by-step reasoning for all analysis. Your thinking process should be visible and methodical.',
    'deepseek-v3': '\n\nApply logical, analytical reasoning with clear cause-effect relationships.',
    'gemini': '\n\nLeverage comprehensive pattern recognition and synthesis capabilities.',
    'gemini-2.5-flash-preview-05-06': '\n\nLeverage comprehensive pattern recognition and synthesis capabilities.',
    'gemini-2.5-pro-preview-05-06': '\n\nLeverage comprehensive pattern recognition and synthesis capabilities.',
  };

  const addition = modelSpecificAdditions[modelType] || modelSpecificAdditions['gpt-4o'];
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
  const counters = [
    `valuable perspectives that also support the ${position} framework when examined closely`,
    `important insights that can be integrated with the ${position} approach`,
    `compelling points that actually strengthen rather than weaken the ${position} stance`
  ];
  return counters[Math.floor(Math.random() * counters.length)];
}

function generateReasonedResponse(topic: string, position?: string): string {
  const responses = [
    `the evidence, when carefully analyzed, supports the ${position} interpretation`,
    `the logical structure of the ${position} argument remains sound despite challenges`,
    `the practical considerations ultimately favor the ${position} approach`
  ];
  return responses[Math.floor(Math.random() * responses.length)];
}

function generatePartialAcknowledgment(prevMessage: string): string {
  const key = prevMessage.split(' ').slice(0, 3).join(' ');
  const acknowledgments = [
    `your insight about ${key}`,
    `the validity of your point regarding ${key}`,
    `the strength of your argument concerning ${key}`
  ];
  return acknowledgments[Math.floor(Math.random() * acknowledgments.length)];
}

function generateConstructiveAddition(topic: string, position?: string): string {
  const additions = [
    `this opens up new avenues for exploring the ${position} perspective on ${topic.split(' ')[0]}`,
    `we might consider how this insight enhances our understanding of the ${position} viewpoint`,
    `this creates opportunities to deepen the ${position} analysis while building on your foundation`
  ];
  return additions[Math.floor(Math.random() * additions.length)];
}

function generateCollaborativeQuestion(topic: string, position?: string): string {
  const questions = [
    `integrating both our perspectives to better understand ${topic.split(' ').slice(0, 2).join(' ')}`,
    `building on this foundation to explore the ${position} dimension more deeply`,
    `using this insight to advance our collective understanding of the core issues`
  ];
  return questions[Math.floor(Math.random() * questions.length)];
}

function generateAcknowledgment(prevMessage: string): string {
  const key = prevMessage.split(' ').slice(1, 4).join(' ');
  const acknowledgments = [
    `the thoughtful analysis of ${key}`,
    `your careful consideration of ${key}`,
    `the depth of insight regarding ${key}`
  ];
  return acknowledgments[Math.floor(Math.random() * acknowledgments.length)];
}

function generateSynthesis(topic: string): string {
  const syntheses = [
    `we can find a higher-order understanding that transcends the initial ${topic.split(' ')[0]} debate`,
    `both perspectives contribute to a richer understanding of the underlying issues`,
    `there's an emerging synthesis that honors the complexity of ${topic.split(' ').slice(0, 2).join(' ')}`
  ];
  return syntheses[Math.floor(Math.random() * syntheses.length)];
}

function generateHigherUnderstanding(topic: string): string {
  const understandings = [
    `the deeper dynamics at play in ${topic.split(' ').slice(0, 2).join(' ')} transcend simple positions`,
    `the meta-level patterns that govern how we think about ${topic.split(' ')[0]}`,
    `the underlying principles that make this entire discussion about ${topic.split(' ')[0]} meaningful`
  ];
  return understandings[Math.floor(Math.random() * understandings.length)];
}

function generateTruthSeekingDirection(topic: string): string {
  const directions = [
    `the fundamental questions that underlie our entire approach to ${topic.split(' ')[0]}`,
    `what we can learn together about the nature of ${topic.split(' ').slice(0, 2).join(' ')}`,
    `the wisdom that emerges when we transcend adversarial thinking about ${topic.split(' ')[0]}`
  ];
  return directions[Math.floor(Math.random() * directions.length)];
}

function generateSyntheticInsight(topic: string): string {
  const insights = [
    `how apparent contradictions about ${topic.split(' ')[0]} reveal deeper unities`,
    `the way that diverse perspectives on ${topic.split(' ').slice(0, 2).join(' ')} actually complement each other`,
    `the emergence of new understanding that transcends the original ${topic.split(' ')[0]} framework`
  ];
  return insights[Math.floor(Math.random() * insights.length)];
}

function generateTranscendentInsight(topic: string): string {
  const insights = [
    `the artificial nature of the original ${topic.split(' ')[0]} dichotomy and points toward integration`,
    `how this question about ${topic.split(' ').slice(0, 2).join(' ')} connects to larger patterns of understanding`,
    `the way that moving beyond positions opens up entirely new dimensions of ${topic.split(' ')[0]} wisdom`
  ];
  return insights[Math.floor(Math.random() * insights.length)];
}

function generateCollaborativeExploration(topic: string): string {
  const explorations = [
    `what we might discover together about the essence of ${topic.split(' ')[0]}`,
    `the collaborative investigation of deeper truths about ${topic.split(' ').slice(0, 2).join(' ')}`,
    `our joint inquiry into the fundamental nature of ${topic.split(' ')[0]} itself`
  ];
  return explorations[Math.floor(Math.random() * explorations.length)];
}

/**
 * MOCK MODE: Simulate API response delay
 */
async function simulateApiDelay(): Promise<void> {
  // Realistic API response time: 500ms to 2000ms
  const delay = Math.random() * 1500 + 500;
  await new Promise(resolve => setTimeout(resolve, delay));
}

// Example of how this might be used with the new agreeability system:
/*
async function testAgreeabilitySystem() {
  try {
    // Test extreme disagreement (A=0)
    console.log('=== Testing A=0 (Maximum Disagreement) ===');
    const combativeResponse = await runTurn({ 
      prevMessage: "I think the glass is half full", 
      model: "GPT",
      agreeabilityLevel: 0,
      position: 'con',
      topic: "The glass is half full",
      currentTurn: 1,
      maxTurns: 10
    });
    console.log('Combative GPT:', combativeResponse);

    // Test extreme agreement (A=10)
    console.log('=== Testing A=10 (Maximum Agreement) ===');
    const cooperativeResponse = await runTurn({ 
      prevMessage: "I think we should find common ground", 
      model: "Claude",
      agreeabilityLevel: 10,
      position: 'pro',
      topic: "Finding common ground is important",
      currentTurn: 1,
      maxTurns: 10
    });
    console.log('Cooperative Claude:', cooperativeResponse);

    // Test balanced approach (A=5)
    console.log('=== Testing A=5 (Balanced) ===');
    const balancedResponse = await runTurn({ 
      prevMessage: "What do you think about this topic?", 
      model: "GPT",
      agreeabilityLevel: 5,
      currentTurn: 1,
      maxTurns: 10
    });
    console.log('Balanced GPT:', balancedResponse);

  } catch (error) {
    console.error("Error testing agreeability system:", error);
  }
}

// Uncomment to test:
// testAgreeabilitySystem();
*/

export async function processDebateTurn(params: {
  prevMessage: string;
  conversationHistory: any[];
  model: string;
  agreeabilityLevel?: number;
  position?: 'pro' | 'con';
  extensivenessLevel?: number;
  topic?: string;
  maxTurns?: number;
  personaId?: string;
  stance?: 'truthSeeker' | 'stubborn';
  turnNumber?: number;
}): Promise<RunTurnResponse> {
  // Enhanced logging for better debugging
  console.log('🤖 Orchestrator: Processing turn for', { 
    model: params.model, 
    turn: params.turnNumber, 
    position: params.position, 
    agreeability: params.agreeabilityLevel,
    extensiveness: params.extensivenessLevel,
    personaId: params.personaId 
  });
  console.log(`🎭 MOCK_MODE is currently: ${MOCK_MODE}`);

  // FIX: Immediately handle mock mode to prevent real API calls
  if (MOCK_MODE) {
    console.log('🎭 Executing in MOCK_MODE. Generating simulated response...');
    const mockReply = generateMockResponse(
      params.model,
      params.agreeabilityLevel ?? 5,
      params.position,
      params.topic || 'an unspecified topic',
      params.prevMessage
    );

    await simulateApiDelay(); // Simulate network latency

    return {
      reply: mockReply,
      model: params.model,
      timestamp: new Date().toISOString(),
      tokenUsage: {
        inputTokens: 250,
        outputTokens: 150,
        totalTokens: 400,
        estimatedCost: 0.0008,
      },
    };
  }

  // Generate the dynamic system prompt
  const systemPrompt = generateSystemPrompt(
    params.model,
    params.agreeabilityLevel,
    params.position,
    params.topic,
    params.maxTurns,
    params.extensivenessLevel,
    params.personaId,
    params.stance,
    params.turnNumber ?? 0,
    params.conversationHistory,
    params.model
  );
  
  console.log('📝 SYSTEM PROMPT:', {
    model: params.model,
    position: params.position,
    agreeabilityLevel: params.agreeabilityLevel,
    promptPreview: systemPrompt.slice(0, 200)
  });
  
  console.log('📋 FULL SYSTEM PROMPT FOR DEBUGGING:', {
    model: params.model,
    position: params.position,
    turn: params.conversationHistory.length + 1,
    fullPrompt: systemPrompt
  });

  // REAL API Call
  // Build chronological messages with correct roles relative to the current responding model
  const currentModelName = getModelDisplayName(params.model as AvailableModel);
  
  // Map conversationHistory (already chronological) with correct roles
  const messages = params.conversationHistory.map(m => {
    const isCurrentModelSpeaking = m.sender === currentModelName;
    
    console.log('🔍 Role check:', {
      messageSender: m.sender,
      currentModel: currentModelName,
      matches: isCurrentModelSpeaking,
      assignedRole: isCurrentModelSpeaking ? 'assistant' : 'user',
      messageText: m.text.slice(0, 40)
    });
    
    return {
      role: isCurrentModelSpeaking ? 'assistant' : 'user',
      content: m.text,
    };
  });
  
  // DON'T append prevMessage - it's already the last message in conversationHistory!
  // The frontend already includes all previous messages in conversationHistory

  // Build final history
  const fullHistory = [{ role: 'system', content: systemPrompt }, ...messages];
  
  console.log('🔍 Message sequence for', currentModelName, ':', 
    fullHistory.map((m, idx) => `[${idx}] ${m.role}: ${String(m.content).slice(0, 40)}...`).join(' | ')
  );
  
  console.log('🌐 SENDING TO API:', {
    model: params.model,
    historyCount: messages.length,
    lastThreeMessages: messages.slice(-3).map(m => ({
      role: m.role,
      content: m.content.slice(0, 50)
    }))
  });
  
  let result: { reply: string; tokenUsage: RunTurnResponse['tokenUsage'] | undefined };

  const modelKey = getModelKey(params.model);
  const modelConfig = MODEL_CONFIGS[modelKey];

  switch (modelConfig.provider) {
    case 'openai':
      result = await callUnifiedOpenAI(fullHistory, modelKey as 'gpt-4o' | 'gpt-4o-mini');
      break;
    case 'anthropic':
      result = await callUnifiedAnthropic(fullHistory);
      break;
    case 'deepseek':
      result = await callUnifiedDeepSeek(fullHistory, modelKey as 'deepseek-r1' | 'deepseek-v3');
      break;
    case 'google':
      result = await callUnifiedGemini(fullHistory, modelKey as 'gemini-2.5-flash-preview-05-06' | 'gemini-2.5-pro-preview-05-06');
      break;
    default:
      throw new Error(`Unsupported model provider`);
  }

  return {
    ...result,
    model: modelKey,
    timestamp: new Date().toISOString()
  };
} 