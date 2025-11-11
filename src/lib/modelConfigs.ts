// PHASE B: Model Display Configuration for UI Components - Updated with exact API names
// Defines visual properties and metadata for all available models
// Updated to use exact API model names for proper API calls
// MODEL UPDATE: Swapped Gemini Flash model to gemini-2.0-flash-exp
// MIGRATION SUPPORT: Added legacy model name migrations for backward compatibility

import type { AvailableModel, ModelDisplayConfig } from '@/types';

const DEFAULT_MODEL_KEY: AvailableModel = 'gpt-5';

// Model migration map - handles renamed/deprecated models
export const MODEL_MIGRATIONS: Record<string, AvailableModel> = {
  'gemini-2.5-flash-preview-05-06': 'gemini-2.0-flash-exp',
};

// Helper function to get current model name
export function getMigratedModelName(oldName: string): AvailableModel {
  const migrated = MODEL_MIGRATIONS[oldName] || oldName;
  if (migrated in MODEL_DISPLAY_CONFIGS) {
    return migrated as AvailableModel;
  }

  console.error('❌ Unknown model during migration - falling back to default:', {
    requested: oldName,
    migrated,
  });
  return DEFAULT_MODEL_KEY;
}

export const MODEL_DISPLAY_CONFIGS: Record<AvailableModel, ModelDisplayConfig> = {
  'gpt-5': {
    name: 'gpt-5',
    displayName: 'GPT-5',
    shortName: 'GPT-5',
    color: '#10a37f', // OpenAI green
    description: 'OpenAI\'s flagship model with superior reasoning and writing quality'
  },
  'gpt-5-mini': {
    name: 'gpt-5-mini',
    displayName: 'GPT-5 Mini',
    shortName: 'GPT-5 Mini',
    color: '#10a37f', // OpenAI green
    description: 'Cost-efficient GPT-5 with reasoning support for quality debates'
  },
  'gpt-5-nano': {
    name: 'gpt-5-nano',
    displayName: 'GPT-5 Nano',
    shortName: 'GPT-5 Nano',
    color: '#10a37f', // OpenAI green
    description: 'Ultra-efficient GPT-5 for high-volume debates at minimal cost'
  },
  'gpt-4o-mini': {
    name: 'gpt-4o-mini',
    displayName: 'GPT-4o Mini',
    shortName: 'GPT-4o Mini',
    color: '#059669', // emerald-600 - Darker green variant
    description: 'OpenAI GPT-4o Mini - Fast and efficient'
  },
  'claude-3-5-sonnet-20241022': {  // ← KEY UNCHANGED
    name: 'claude-3-5-sonnet-20241022',
    displayName: 'Claude Sonnet 4.5',  // ← Updated display name
    shortName: 'Sonnet 4.5',
    color: '#F59E0B', // amber-500 - Matrix orange
    description: 'Anthropic\'s latest flagship model with best-in-class coding and natural dialogue'
  },
  'claude-haiku-4-5-20251001': {
    name: 'claude-haiku-4-5-20251001',
    displayName: 'Claude Haiku 4.5',
    shortName: 'Haiku 4.5',
    color: '#F59E0B', // amber-500 - Same Claude orange
    description: 'Anthropic\'s fastest model with near-frontier intelligence - 90% of Sonnet quality at 4-5x speed'
  },
  'deepseek-r1': {
    name: 'deepseek-r1',
    displayName: 'DeepSeek R1',
    shortName: 'R1',
    color: '#8B5CF6', // violet-500 - Purple for reasoning
    description: 'DeepSeek R1 - Chain of thought reasoning model'
  },
  'deepseek-v3': {
    name: 'deepseek-v3',
    displayName: 'DeepSeek V3',
    shortName: 'V3',
    color: '#7C3AED', // violet-600 - Darker purple variant
    description: 'DeepSeek V3 - Fast chat model'
  },
  'gemini-2.0-flash-exp': {
    name: 'gemini-1.5-flash' as AvailableModel,
    displayName: 'Gemini 2.0 Flash',
    shortName: 'Flash',
    color: '#0B57D0', // Google dark blue - distinct from Grok light blue
    description: 'Google Gemini 2.5 Flash - Lightning fast responses'
  },
  'gemini-2.5-pro-preview-05-06': {
    name: 'gemini-2.5-pro-preview-05-06',
    displayName: 'Gemini 2.5 Pro',
    shortName: 'Pro',
    color: '#0B57D0', // Google dark blue - distinct from Grok light blue
    description: 'Google Gemini 2.5 Pro - Advanced thinking model'
  },
  'gemini-2.5-flash-lite': {
    name: 'gemini-2.5-flash-lite',
    displayName: 'Gemini 2.5 Flash-Lite',
    shortName: 'Flash-Lite',
    color: '#0B57D0', // Google dark blue - distinct from Grok light blue
    description: 'Google\'s ultra-efficient model - excellent for high-volume debates at minimal cost'
  },
  'grok-4-fast-reasoning': {
    name: 'grok-4-fast-reasoning',
    displayName: 'Grok 4 Reasoning',
    shortName: 'Grok 4 Reasoning',
    color: '#FFFFFF', // White - matches official Grok branding
    description: 'xAI\'s fastest model with transparent reasoning and real-time data access'
  },
  'grok-4-fast': {
    name: 'grok-4-fast',
    displayName: 'Grok 4',
    shortName: 'Grok 4',
    color: '#FFFFFF', // White - matches official Grok branding
    description: 'xAI\'s ultra-fast conversational model for rapid debates'
  },
  'qwen3-max': {
    name: 'qwen3-max',
    displayName: 'Qwen 3 Max',
    shortName: 'Qwen Max',
    color: '#E8420A', // Alibaba red-orange - distinct from Claude orange
    description: 'Alibaba\'s 1T parameter flagship with exceptional multilingual and reasoning capabilities'
  },
  'qwen3-30b-a3b': {
    name: 'qwen3-30b-a3b',
    displayName: 'Qwen 3 30B',
    shortName: 'Qwen 30B',
    color: '#E8420A', // Alibaba red-orange - distinct from Claude orange
    description: 'Cost-effective MoE model with optional reasoning - excellent for scaled debates'
  },
  'moonshot-v1-8k': {
    name: 'moonshot-v1-8k',
    displayName: 'Kimi 8K',
    shortName: 'Kimi 8K',
    color: '#FF6B35', // Moonshot brand orange
    description: 'Moonshot AI\'s Kimi 8K model – fast bilingual assistant with short context'
  },
  'moonshot-v1-32k': {
    name: 'moonshot-v1-32k',
    displayName: 'Kimi 32K',
    shortName: 'Kimi 32K',
    color: '#FF6B35',
    description: 'Kimi 32K – extended reasoning with 32K context window for richer debates'
  },
  'moonshot-v1-128k': {
    name: 'moonshot-v1-128k',
    displayName: 'Kimi 128K',
    shortName: 'Kimi 128K',
    color: '#FF6B35',
    description: 'Moonshot AI\'s flagship Kimi 128K – ultra-long context and multilingual reasoning'
  }
};

function resolveModelConfig(model: AvailableModel): ModelDisplayConfig {
  const migratedName = getMigratedModelName(model);
  const config = MODEL_DISPLAY_CONFIGS[migratedName];
  if (config) {
    return config;
  }

  console.error('❌ Model config not found - using default configuration:', {
    requested: model,
    migratedName,
  });
  return MODEL_DISPLAY_CONFIGS[DEFAULT_MODEL_KEY];
}

// Helper function to get model display config
export function getModelDisplayConfig(model: AvailableModel): ModelDisplayConfig {
  return resolveModelConfig(model);
}

// Get all available models for dropdown selection
export function getAvailableModels(): AvailableModel[] {
  return Object.keys(MODEL_DISPLAY_CONFIGS) as AvailableModel[];
}

// Get model color for styling
export function getModelColor(model: AvailableModel): string {
  return resolveModelConfig(model).color;
}

// Get model display name
export function getModelDisplayName(model: AvailableModel): string {
  return resolveModelConfig(model).displayName;
}

// Get model short name for compact displays
export function getModelShortName(model: AvailableModel): string {
  return resolveModelConfig(model).shortName;
}