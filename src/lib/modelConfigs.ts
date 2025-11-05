// PHASE B: Model Display Configuration for UI Components - Updated with exact API names
// Defines visual properties and metadata for all available models
// Updated to use exact API model names for proper API calls

import type { AvailableModel, ModelDisplayConfig } from '@/types';

export const MODEL_DISPLAY_CONFIGS: Record<AvailableModel, ModelDisplayConfig> = {
  'gpt-4o': {
    name: 'gpt-4o',
    displayName: 'GPT-4o',
    shortName: 'GPT-4o',
    color: '#10B981', // emerald-500 - Matrix green style
    description: 'OpenAI GPT-4o - Advanced reasoning and analysis'
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
  'gemini-2.5-flash-preview-05-06': {
    name: 'gemini-2.5-flash-preview-05-06',
    displayName: 'Gemini 2.5 Flash',
    shortName: 'Flash',
    color: '#3B82F6', // blue-500 - Google blue
    description: 'Google Gemini 2.5 Flash - Lightning fast responses'
  },
  'gemini-2.5-pro-preview-05-06': {
    name: 'gemini-2.5-pro-preview-05-06',
    displayName: 'Gemini 2.5 Pro',
    shortName: 'Pro',
    color: '#1D4ED8', // blue-700 - Darker blue for Pro
    description: 'Google Gemini 2.5 Pro - Advanced thinking model'
  },
  'gemini-2.5-flash-lite': {
    name: 'gemini-2.5-flash-lite',
    displayName: 'Gemini 2.5 Flash-Lite',
    shortName: 'Flash-Lite',
    color: '#4285f4', // Google blue
    description: 'Google\'s ultra-efficient model - excellent for high-volume debates at minimal cost'
  }
};

// Helper function to get model display config
export function getModelDisplayConfig(model: AvailableModel): ModelDisplayConfig {
  return MODEL_DISPLAY_CONFIGS[model];
}

// Get all available models for dropdown selection
export function getAvailableModels(): AvailableModel[] {
  return Object.keys(MODEL_DISPLAY_CONFIGS) as AvailableModel[];
}

// Get model color for styling
export function getModelColor(model: AvailableModel): string {
  return MODEL_DISPLAY_CONFIGS[model].color;
}

// Get model display name
export function getModelDisplayName(model: AvailableModel): string {
  return MODEL_DISPLAY_CONFIGS[model].displayName;
}

// Get model short name for compact displays
export function getModelShortName(model: AvailableModel): string {
  return MODEL_DISPLAY_CONFIGS[model].shortName;
} 