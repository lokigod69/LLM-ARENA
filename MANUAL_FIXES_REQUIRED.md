# MANUAL FIXES REQUIRED

This file contains the complete, corrected code for two files that could not be modified automatically.

**Instructions:**

1.  **Open `src/lib/orchestrator.ts`:** Select all content in the file and delete it. Then, copy the entire code block below and paste it into the empty file.
2.  **Open `src/components/DualPersonalitySlider.tsx`:** Select all content in the file and delete it. Then, copy the entire code block below and paste it into the empty file.

This will apply the final fixes and complete the feature implementation.

---

### 1. File: `src/lib/orchestrator.ts`

```typescript
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
// CORRECTED: Restored missing API call functions and fixed all type errors.

import type { AvailableModel, Message } from '@/types';
import { PERSONAS } from './personas';
import { getModelDisplayName } from './modelConfigs';

interface RunTurnParams {
  prevMessage: string;
  model: string; 
  agreeabilityLevel?: number; 
  position?: 'pro' | 'con'; 
  topic?: string; 
  maxTurns?: number; 
  extensivenessLevel?: number;
  personaId?: string;
  stance?: 'truthSeeker' | 'stubborn';
  turnNumber?: number;
}

interface RunTurnResponse {
  reply: string;
  model: string;
  timestamp: string;
  tokenUsage?: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    estimatedCost: number;
  };
}

// MOCK MODE: Configuration flag
const MOCK_MODE = process.env.MOCK_MODE === 'true' || 
                  !process.env.OPENAI_API_KEY || 
                  !process.env.ANTHROPIC_API_KEY ||
                  process.env.OPENAI_API_KEY.includes('PLACEHOLDER') || 
                  process.env.ANTHROPIC_API_KEY.includes('PLACEHOLDER');

// Model configuration registry
export const MODEL_CONFIGS = {
  'gpt-4o': { provider: 'openai', endpoint: 'https://api.openai.com/v1/chat/completions', modelName: 'gpt-4o', maxTokens: 2000, apiKeyEnv: 'OPENAI_API_KEY', costPer1kTokens: { input: 0.005, output: 0.015 } },
  'gpt-4o-mini': { provider: 'openai', endpoint: 'https://api.openai.com/v1/chat/completions', modelName: 'gpt-4o-mini', maxTokens: 2000, apiKeyEnv: 'OPENAI_API_KEY', costPer1kTokens: { input: 0.00015, output: 0.0006 } },
  'claude-3-5-sonnet-20241022': { provider: 'anthropic', endpoint: 'https://api.anthropic.com/v1/messages', modelName: 'claude-3-5-sonnet-20241022', maxTokens: 2000, apiKeyEnv: 'ANTHROPIC_API_KEY', costPer1kTokens: { input: 0.003, output: 0.015 } },
  'deepseek-r1': { provider: 'deepseek', endpoint: 'https://api.deepseek.com/v1/chat/completions', modelName: 'deepseek-reasoner', maxTokens: 2000, apiKeyEnv: 'DEEPSEEK_API_KEY', costPer1kTokens: { input: 0.0014, output: 0.0028 } },
  'deepseek-v3': { provider: 'deepseek', endpoint: 'https://api.deepseek.com/v1/chat/completions', modelName: 'deepseek-chat', maxTokens: 2000, apiKeyEnv: 'DEEPSEEK_API_KEY', costPer1kTokens: { input: 0.00014, output: 0.00028 } },
  'gemini-2.5-flash-preview-05-06': { provider: 'google', endpoint: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-06:generateContent', modelName: 'gemini-2.5-flash-preview-05-06', maxTokens: 2000, apiKeyEnv: 'GOOGLE_AI_API_KEY', costPer1kTokens: { input: 0.00015, output: 0.0006 } },
  'gemini-2.5-pro-preview-05-06': { provider: 'google', endpoint: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro-preview-05-06:generateContent', modelName: 'gemini-2.5-pro-preview-05-06', maxTokens: 2000, apiKeyEnv: 'GOOGLE_AI_API_KEY', costPer1kTokens: { input: 0.00125, output: 0.005 } }
} as const;

type SupportedModel = keyof typeof MODEL_CONFIGS;

function getModelKey(model: string): SupportedModel {
  const normalized = model.toUpperCase().trim();
  const modelKeys = Object.keys(MODEL_CONFIGS) as SupportedModel[];
  
  const mapping: { [key: string]: SupportedModel } = {
    'GPT': 'gpt-4o', 'GPT-4': 'gpt-4o', 'OPENAI': 'gpt-4o',
    'GPT-4-MINI': 'gpt-4o-mini', 'GPT4MINI': 'gpt-4o-mini', 'MINI': 'gpt-4o-mini',
    'CLAUDE': 'claude-3-5-sonnet-20241022', 'ANTHROPIC': 'claude-3-5-sonnet-20241022',
    'DEEPSEEK-R1': 'deepseek-r1', 'DEEPSEEK_R1': 'deepseek-r1', 'R1': 'deepseek-r1',
    'DEEPSEEK-V3': 'deepseek-v3', 'DEEPSEEK_V3': 'deepseek-v3', 'V3': 'deepseek-v3',
    'GEMINI-2.5-FLASH': 'gemini-2.5-flash-preview-05-06', 'GEMINI_FLASH': 'gemini-2.5-flash-preview-05-06', 'FLASH': 'gemini-2.5-flash-preview-05-06',
    'GEMINI-2.5-PRO': 'gemini-2.5-pro-preview-05-06', 'GEMINI_PRO': 'gemini-2.5-pro-preview-05-06', 'PRO': 'gemini-2.5-pro-preview-05-06',
  };

  if (mapping[normalized]) {
    return mapping[normalized];
  }

  if (modelKeys.includes(normalized as SupportedModel)) {
    return normalized as SupportedModel;
  }

  console.warn(`Unknown model "${model}", defaulting to gpt-4o`);
  return 'gpt-4o';
}

function generateSystemPrompt(
  agentName: string,
  agreeabilityLevel: number = 5,
  position?: 'pro' | 'con',
  topic?: string,
  maxTurns: number = 20,
  extensivenessLevel: number = 3,
  personaId?: string,
  stance?: 'truthSeeker' | 'stubborn',
  turnNumber: number = 0
): string {
  let effectiveAgreeability = agreeabilityLevel;
  let effectiveExtensiveness = extensivenessLevel;
  let personaPromptPart = '';

  if (personaId && PERSONAS[personaId]) {
    const persona = PERSONAS[personaId];
    const baseAgreeability = 10 - persona.lockedTraits.baseStubbornness;
    effectiveAgreeability = baseAgreeability + (agreeabilityLevel - 5) * 0.3;
    const baseLength = persona.lockedTraits.responseLength;
    effectiveExtensiveness = baseLength + (extensivenessLevel - 3) * 0.5;

    effectiveAgreeability = Math.max(0, Math.min(10, effectiveAgreeability));
    effectiveExtensiveness = Math.max(1, Math.min(5, Math.round(effectiveExtensiveness)));
    
    personaPromptPart = persona.identity + '\n\n';
    if (stance && persona.stanceModifiers[stance]) {
      personaPromptPart += `Stance Guidance: ${persona.stanceModifiers[stance]}\n\n`;
    }
    personaPromptPart += `Behavioral Anchors: ${persona.turnRules}\n\n`;
  }

  const stubbornness = 1 - effectiveAgreeability / 10;
  const cooperation = effectiveAgreeability / 10;
  const minTurns = Math.ceil(maxTurns * 0.3);
  const positionText = position && topic ? `You must advocate **${position.toUpperCase()}** regarding the statement: "${topic}".` : '';

  const getExtensivenessInstructions = (level: number): string => {
    const instructions = {
      1: "• Aim for 1-2 sentences - be powerfully concise.",
      2: "• Aim for 2-3 sentences - brief but complete.",
      3: "• Aim for 3-4 sentences - balanced length.",
      4: "• Aim for 4-6 sentences - detailed analysis.",
      5: "• Aim for 5-8 sentences - academic depth.",
    };
    return instructions[level] || instructions[3];
  };

  const getBehavioralInstructions = (level: number): string => {
    if (level <= 2) return "• Defend your position with unwavering conviction.";
    if (level <= 4) return "• Be highly committed to your position, require overwhelming evidence to change stance.";
    if (level <= 6) return "• Weigh evidence objectively while maintaining your assigned position.";
    if (level <= 8) return "• Actively seek to understand the deeper truth behind disagreements.";
    return "• Prioritize finding truth over defending your initial position.";
  };

  return `${personaPromptPart}You are ${agentName} participating in a structured debate.

• Stubbornness level S = ${stubbornness.toFixed(1)}
• Cooperation level C = ${cooperation.toFixed(1)}
${positionText}

Your Core Instructions:
• The debate will last no more than ${maxTurns} turns. You must argue your position until at least turn ${minTurns}.
• After turn ${minTurns}, if evidence overwhelmingly refutes your position, you may concede.

1. Behavioral Parameters:
${getBehavioralInstructions(effectiveAgreeability)}

2. Response Length (Extensiveness: ${Math.round(effectiveExtensiveness)}/5):
${getExtensivenessInstructions(effectiveExtensiveness)}

Engage substantively with the previous speaker's points. Be specific and address their core arguments directly.`;
}

async function callApi(
  provider: 'openai' | 'anthropic' | 'deepseek' | 'google', 
  endpoint: string, 
  apiKey: string, 
  body: object, 
  modelName: string
): Promise<RunTurnResponse> {
  const headers = {
    'Content-Type': 'application/json',
    ...(provider === 'openai' && { 'Authorization': `Bearer ${apiKey}` }),
    ...(provider === 'anthropic' && { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' }),
    ...(provider === 'deepseek' && { 'Authorization': `Bearer ${apiKey}` }),
  };

  const finalEndpoint = provider === 'google' ? `${endpoint}?key=${apiKey}` : endpoint;
  
  const response = await fetch(finalEndpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`${modelName} API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  let reply = 'No response generated';
  let tokenUsage: RunTurnResponse['tokenUsage'];

  const config = MODEL_CONFIGS[getModelKey(modelName)];
  
  if (provider === 'openai' || provider === 'deepseek') {
    reply = data.choices[0]?.message?.content;
    const usage = data.usage;
    tokenUsage = usage ? {
      inputTokens: usage.prompt_tokens || 0,
      outputTokens: usage.completion_tokens || 0,
      totalTokens: usage.total_tokens || 0,
      estimatedCost: ((usage.prompt_tokens || 0) * config.costPer1kTokens.input + (usage.completion_tokens || 0) * config.costPer1kTokens.output) / 1000
    } : undefined;
  } else if (provider === 'anthropic') {
    reply = data.content[0]?.text;
    const usage = data.usage;
    tokenUsage = usage ? {
      inputTokens: usage.input_tokens || 0,
      outputTokens: usage.output_tokens || 0,
      totalTokens: (usage.input_tokens || 0) + (usage.output_tokens || 0),
      estimatedCost: ((usage.input_tokens || 0) * config.costPer1kTokens.input + (usage.output_tokens || 0) * config.costPer1kTokens.output) / 1000
    } : undefined;
  } else if (provider === 'google') {
    reply = data.candidates?.[0]?.content?.parts?.[0]?.text;
    const usage = data.usageMetadata;
    tokenUsage = usage ? {
      inputTokens: usage.promptTokenCount || 0,
      outputTokens: usage.candidatesTokenCount || 0,
      totalTokens: usage.totalTokenCount || 0,
      estimatedCost: ((usage.promptTokenCount || 0) * config.costPer1kTokens.input + (usage.candidatesTokenCount || 0) * config.costPer1kTokens.output) / 1000
    } : undefined;
  }

  return { reply, model: modelName, timestamp: new Date().toISOString(), tokenUsage };
}

export async function processDebateTurn(params: {
  conversationHistory: Message[];
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
  const {
    conversationHistory,
    model,
    agreeabilityLevel = 5,
    position,
    extensivenessLevel = 3,
    topic = 'the matter at hand',
    maxTurns = 20,
    personaId,
    stance,
    turnNumber = 0,
  } = params;

  const modelKey = getModelKey(model);
  const modelConfig = MODEL_CONFIGS[modelKey];
  const agentName = getModelDisplayName(modelKey);

  const systemPrompt = generateSystemPrompt(
    agentName, agreeabilityLevel, position, topic, maxTurns, extensivenessLevel, personaId, stance, turnNumber
  );

  const messages = conversationHistory.map(m => ({
    role: m.sender.toLowerCase() === 'user' ? 'user' : 'assistant', 
    content: m.text 
  }));

  let apiBody;

  if (modelConfig.provider === 'google') {
      const history = messages.map(m => ({ role: m.role, parts: [{ text: m.content }]}));
      apiBody = {
          contents: [{ role: 'system', parts: [{ text: systemPrompt }]}, ...history],
          generationConfig: { maxOutputTokens: modelConfig.maxTokens, temperature: 0.7 }
      };
  } else if (modelConfig.provider === 'anthropic') {
      apiBody = {
          model: modelConfig.modelName,
          system: systemPrompt,
          messages: messages,
          max_tokens: modelConfig.maxTokens,
          temperature: 0.7,
      };
  } else { // OpenAI and DeepSeek
      apiBody = {
          model: modelConfig.modelName,
          messages: [{ role: 'system', content: systemPrompt }, ...messages],
          max_tokens: modelConfig.maxTokens,
          temperature: 0.7,
      };
  }

  try {
      if (MOCK_MODE) {
        await new Promise(resolve => setTimeout(resolve, 500));
        return { reply: `[MOCK] ${agentName} response.`, model: agentName, timestamp: new Date().toISOString() };
      }
      
      const apiKey = process.env[modelConfig.apiKeyEnv];
      if (!apiKey || apiKey.includes('PLACEHOLDER')) throw new Error(`${modelConfig.apiKeyEnv} not set.`);

      return await callApi(modelConfig.provider, modelConfig.endpoint, apiKey, apiBody, agentName);

  } catch (error) {
    console.error(`Orchestrator error for ${agentName}:`, error);
    return {
      reply: `[ERROR] ${agentName}: ${(error as Error).message}. Check API keys.`,
      model: agentName,
      timestamp: new Date().toISOString(),
    };
  }
}
```

---

### 2. File: `src/components/DualPersonalitySlider.tsx`

```typescript
'use client';

import { motion } from 'framer-motion';
import { useCallback } from 'react';
import type { ModelPosition, ModelConfiguration } from '@/types';
import { getModelColor, getModelDisplayName } from '@/lib/modelConfigs';
import { PERSONAS } from '@/lib/personas';

interface DualPersonalitySliderProps {
  modelA: ModelConfiguration;
  modelB: ModelConfiguration;
  onModelAChange: (config: ModelConfiguration) => void;
  onModelBChange: (config: ModelConfiguration) => void;
  disabled?: boolean;
}

const getPersonalityType = (level: number): string => {
  if (level <= 1) return 'BLUE PILL WARRIOR';
  if (level <= 3) return 'LOYAL ADVOCATE';
  if (level <= 5) return 'MATRIX BALANCED';
  if (level <= 7) return 'TRUTH EXPLORER';
  return 'RED PILL AWAKENED';
};

const sliderColors = ['#0047FF', '#1A40ED', '#3339DA', '#4D32C8', '#662BB5', '#8024A3', '#991C91', '#B3157E', '#CC0E6C', '#E60759', '#FF0047'];
const getSliderColor = (level: number): string => sliderColors[level] || sliderColors[5];

const getBackgroundGradient = (level: number): string => {
  const stops = sliderColors.map((color, index) => {
    const distance = Math.abs(index - level);
    const opacity = Math.max(0.15, 1 - distance / 10);
    const [r, g, b] = [parseInt(color.slice(1, 3), 16), parseInt(color.slice(3, 5), 16), parseInt(color.slice(5, 7), 16)];
    return `rgba(${r},${g},${b},${opacity}) ${index * 10}%`;
  }).join(', ');
  return `linear-gradient(to right, ${stops})`;
};

const getEffectiveRange = (
  personaId: string | null | undefined,
  sliderType: 'agreeability' | 'length'
): string | null => {
  if (!personaId || !PERSONAS[personaId]) return null;

  const persona = PERSONAS[personaId];
  let base: number, min: number, max: number, variation: number, center: number;
  
  if (sliderType === 'agreeability') {
    base = 10 - persona.lockedTraits.baseStubbornness;
    variation = 0.3; center = 5;
    min = Math.max(0, Math.min(10, base + (0 - center) * variation));
    max = Math.max(0, Math.min(10, base + (10 - center) * variation));
    return `(${min.toFixed(1)}–${max.toFixed(1)})`;
  } else { // 'length'
    base = persona.lockedTraits.responseLength;
    variation = 0.5; center = 3;
    min = Math.max(1, Math.min(5, Math.round(base + (1 - center) * variation)));
    max = Math.max(1, Math.min(5, Math.round(base + (5 - center) * variation)));
    return `(Effective: ${min}–${max})`;
  }
};

export default function DualPersonalitySlider({
  modelA, modelB, onModelAChange, onModelBChange, disabled = false
}: DualPersonalitySliderProps) {

  const createHandler = (
    modelConfig: ModelConfiguration,
    onChange: (config: ModelConfiguration) => void,
    key: 'agreeabilityLevel' | 'extensivenessLevel'
  ) => useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onChange({ ...modelConfig, [key]: parseInt(e.target.value) });
  }, [modelConfig, onChange]);

  const renderSlider = (
    modelConfig: ModelConfiguration,
    onChange: (config: ModelConfiguration) => void,
    label: 'A' | 'B'
  ) => {
    const modelColor = getModelColor(modelConfig.name);
    const agreeabilityRange = getEffectiveRange(modelConfig.personaId, 'agreeability');
    const lengthRange = getEffectiveRange(modelConfig.personaId, 'length');

    return (
      <div className={`flex-1 transition-opacity ${disabled ? 'opacity-50' : ''}`}>
        <h3 className="text-xl font-bold text-center mb-4" style={{ color: modelColor }}>
          {getModelDisplayName(modelConfig.name)}
        </h3>

        {/* Stance Slider */}
        <div className="mb-8">
          <div className="flex justify-between items-baseline mb-2">
            <label className="block text-sm font-semibold uppercase text-gray-400">STANCE</label>
            {agreeabilityRange && <span className="text-xs font-mono text-cyan-400">{agreeabilityRange}</span>}
          </div>
          <input
            type="range"
            min="0" max="10"
            value={modelConfig.agreeabilityLevel}
            onChange={createHandler(modelConfig, onChange, 'agreeabilityLevel')}
            disabled={disabled}
            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
            style={{ backgroundImage: getBackgroundGradient(modelConfig.agreeabilityLevel) }}
          />
          <div className="flex justify-between text-xs mt-2 font-mono">
            <span style={{ color: sliderColors[0] }}>Defender</span>
            <span style={{ color: getSliderColor(modelConfig.agreeabilityLevel) }}>{getPersonalityType(modelConfig.agreeabilityLevel)}</span>
            <span style={{ color: sliderColors[10] }}>Truth-Seeker</span>
          </div>
        </div>

        {/* Scope Slider */}
        <div>
          <div className="flex justify-between items-baseline mb-2">
            <label className="block text-sm font-semibold uppercase text-gray-400">SCOPE</label>
            {lengthRange && <span className="text-xs font-mono text-cyan-400">{lengthRange}</span>}
          </div>
          <input
            type="range"
            min="1" max="5"
            value={modelConfig.extensivenessLevel}
            onChange={createHandler(modelConfig, onChange, 'extensivenessLevel')}
            disabled={disabled}
            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
            style={{ backgroundImage: getBackgroundGradient((modelConfig.extensivenessLevel - 1) * 2.5) }} // Map 1-5 to 0-10
          />
          <div className="flex justify-between text-xs mt-2 font-mono">
            <span>Concise</span>
            <span>Balanced</span>
            <span>Academic</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="p-6 bg-gray-800 rounded-lg">
      <div className="flex items-start justify-center gap-12">
        {renderSlider(modelA, onModelAChange, 'A')}
        <div className="h-48 border-l-2 border-gray-600 self-center"></div>
        {renderSlider(modelB, onModelBChange, 'B')}
      </div>
    </div>
  );
}
```

</rewritten_file> 