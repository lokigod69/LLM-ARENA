// Oracle Type Definitions - Phase 1.1 Implementation
// Configurable insight extraction system for debate analysis
// ARCHITECTURAL REFACTOR: Separated verdict from format, enhanced bias detection
// PHASE B: Added Oracle model selection for flexible analysis engines
// QWEN 3-TIER UPDATE: Removed qwen3-30b-a3b from ORACLE_CAPABLE_MODELS, added qwen-flash and qwen-plus

import type { AvailableModel } from './index';

export type OracleLens = 'scientific' | 'philosophical' | 'logical' | 'practical' | 'factual' | 'meta';

export type OracleOutputFormat = 
  | 'narrative' 
  | 'bullets' 
  | 'main_argument' 
  | 'puzzle_pieces' 
  | 'gap_analysis'; // RENAMED: was critical_lens, now focuses on what's missing

export type VerdictScope = 'lens' | 'meta' | 'disabled';

export interface VerdictConfig {
  enabled: boolean;
  scope: VerdictScope;
}

export interface BiasDetection {
  enabled: boolean;
  analyzeDebaterBias: boolean;    // Check if GPT/Claude showed political bias
  analyzeCensorship: boolean;      // Check if topics were avoided due to safety filters
  culturalBiasCheck: boolean;      // Check for Western-centric assumptions
  politicalBiasCheck: boolean;     // Check for political leaning in responses
}

export interface OracleConfig {
  // PHASE B: Oracle model selection - which AI analyzes the debate
  oracleModel: AvailableModel;
  
  primaryLens: OracleLens;
  depthLevel: number; // 1-5 scale
  outputFormat: OracleOutputFormat;
  
  // NEW: Separate verdict system
  verdict: VerdictConfig;
  
  // ENHANCED: Comprehensive bias detection
  biasDetection: BiasDetection;
}

export interface OracleVerdict {
  winner: 'GPT' | 'Claude' | 'Aligned';
  confidence: number; // 0-100 percentage
  reasoning: string;
  scope: VerdictScope; // Which type of verdict this is
}

export interface OracleBiasAnalysis {
  debaterBias?: string;      // Political/ideological bias in responses
  censorship?: string;       // Topics avoided or sanitized
  culturalBias?: string;     // Western-centric assumptions
  politicalBias?: string;    // Left/right political leaning
}

export interface OracleResult {
  id: string;
  timestamp: Date;
  config: OracleConfig;
  analysis: string;
  verdict?: OracleVerdict;
  biasAnalysis?: OracleBiasAnalysis; // NEW: Bias detection results
  processingTime: number; // milliseconds
}

export interface OracleAnalysisRequest {
  topic: string;
  gptMessages: any[]; // Will use Message type from main types
  claudeMessages: any[];
  gptPersonality: any; // Will use ModelPersonality type
  claudePersonality: any;
  totalTurns: number;
  config: OracleConfig;
}

// Lens descriptions for UI
export const LENS_DESCRIPTIONS: Record<OracleLens, string> = {
  scientific: "Examine evidence, methodology, and empirical claims",
  philosophical: "Explore deeper meanings and fundamental assumptions", 
  logical: "Analyze reasoning structure and identify fallacies",
  practical: "Focus on real-world applications and actionable insights",
  factual: "Extract verifiable claims and supporting evidence",
  meta: "Analyze the debate process and discussion dynamics"
};

// Output format descriptions - UPDATED: Lens-neutral presentation styles
export const FORMAT_DESCRIPTIONS: Record<OracleOutputFormat, string> = {
  narrative: "Flowing summary integrating insights from selected lens",
  bullets: "Key discoveries from lens analysis in organized bullet points",
  main_argument: "Single most important conclusion from lens perspective",
  puzzle_pieces: "Standalone insights that can be combined with other analyses",
  gap_analysis: "Problems, gaps, and missing elements identified through lens examination"
};

// Verdict scope descriptions
export const VERDICT_DESCRIPTIONS: Record<VerdictScope, string> = {
  lens: "Winner determination based solely on selected lens criteria",
  meta: "Winner determination synthesized across all analytical perspectives", 
  disabled: "No winner determination - analysis only"
};

// Depth level descriptions
export const DEPTH_DESCRIPTIONS = {
  1: "Surface - Quick overview of main points",
  2: "Light - Key takeaways with minimal detail", 
  3: "Standard - Thorough analysis with context",
  4: "Deep - Comprehensive with nuances explored",
  5: "Exhaustive - Leave no stone unturned"
};

// PHASE B: Oracle Model Capabilities - Which models are recommended for Oracle analysis
// Updated to match the debate model selector order
export const ORACLE_CAPABLE_MODELS: AvailableModel[] = [
  'gpt-5',                          // OpenAI GPT-5
  'gpt-5-mini',                     // OpenAI GPT-5 Mini
  'gpt-5-nano',                     // OpenAI GPT-5 Nano
  'gpt-4o-mini',                    // OpenAI GPT-4o Mini  
  'claude-3-5-sonnet-20241022',     // Anthropic Claude
  'claude-haiku-4-5-20251001',      // Anthropic Claude Haiku
  'deepseek-r1',                    // DeepSeek R1
  'deepseek-v3',                    // DeepSeek V3
  'gemini-2.5-flash',               // Gemini Flash
  'gemini-2.5-pro-preview-05-06',   // Gemini Pro
  'gemini-2.5-flash-lite',          // Gemini Flash-Lite
  'grok-4-fast-reasoning',          // Grok Fast Reasoning
  'grok-4-fast',                    // Grok Fast
  'qwen-flash',                     // Qwen Flash (Economy)
  'qwen-plus',                      // Qwen Plus (Recommended)
  'qwen3-max',                      // Qwen 3 Max (Premium)
  'moonshot-v1-128k',               // Moonshot Kimi 128K
];

// Oracle Model Strengths - What each model excels at for analysis
export const ORACLE_MODEL_STRENGTHS: Record<AvailableModel, string> = {
  'gpt-5': 'Superior reasoning, advanced writing quality, comprehensive analysis',
  'gpt-5-mini': 'Efficient reasoning, balanced quality and cost',
  'gpt-5-nano': 'Fast insights, ultra-cost-effective analysis',
  'gpt-4o-mini': 'Quick insights, cost-effective analysis',
  'claude-3-5-sonnet-20241022': 'Nuanced reasoning, philosophical depth',
  'claude-haiku-4-5-20251001': 'Fast reasoning, efficient analysis',
  'deepseek-r1': 'Chain of thought, step-by-step reasoning',
  'deepseek-v3': 'Fast logical analysis, efficient insights',
  'gemini-2.5-flash': 'Rapid analysis, quick patterns',
  'gemini-2.5-pro-preview-05-06': 'Large context, comprehensive synthesis',
  'gemini-2.5-flash-lite': 'Quick insights, cost-effective judgments',
  'grok-4-fast-reasoning': 'Real-time data access, transparent reasoning chains',
  'grok-4-fast': 'Ultra-fast analysis, conversational insights',
  'qwen-flash': 'Ultra-fast analysis, cost-effective insights',
  'qwen-plus': 'Balanced analysis quality, excellent cost-performance ratio',
  'qwen3-max': 'Exceptional multilingual analysis, 1T parameter depth - Premium quality',
  'moonshot-v1-8k': 'Fast bilingual assistant with short context',
  'moonshot-v1-32k': 'Extended context bilingual reasoning',
  'moonshot-v1-128k': 'Long-context bilingual analysis, excels at evidence aggregation'
};

// Default Oracle model preference (best reasoning capabilities)
export const DEFAULT_ORACLE_MODEL: AvailableModel = 'deepseek-r1';

// PHASE 2: UI Color Schemes using model colors for variety and visual appeal
export const LENS_COLORS: Record<OracleLens, string> = {
  scientific: '#10B981',    // emerald-500 (OpenAI GPT-5 green)
  philosophical: '#F59E0B', // amber-500 (Claude orange)  
  logical: '#8B5CF6',       // violet-500 (DeepSeek R1 purple)
  practical: '#7C3AED',     // violet-600 (DeepSeek V3 purple)
  factual: '#3B82F6',       // blue-500 (Gemini Flash blue)
  meta: '#1D4ED8'           // blue-700 (Gemini Pro blue)
};

export const FORMAT_COLORS: Record<OracleOutputFormat, string> = {
  narrative: '#10B981',     // emerald-500 (OpenAI GPT-5 green)
  bullets: '#F59E0B',       // amber-500 (Claude orange)
  main_argument: '#8B5CF6', // violet-500 (DeepSeek R1 purple)
  puzzle_pieces: '#3B82F6', // blue-500 (Gemini Flash blue)
  gap_analysis: '#059669'   // emerald-600 (GPT-4o Mini green)
};

export const VERDICT_COLORS: Record<VerdictScope, string> = {
  lens: '#F59E0B',      // amber-500 (Claude orange)
  meta: '#8B5CF6',      // violet-500 (DeepSeek R1 purple)
  disabled: '#6B7280'   // gray-500 (neutral)
}; 