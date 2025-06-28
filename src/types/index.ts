// Shared types for the application
// EXTENSIVENESS FEATURE: Added extensivenessLevel to ModelConfiguration and response length presets

export interface Message {
  id: string; // Unique identifier for the message
  text: string; // Content of the message
  sender: string; // PHASE B: Support flexible models - Changed to string for display names
  timestamp: string; // ISO string timestamp
  isLoading?: boolean; // Optional: for displaying loading state for this specific message
  personaId?: string; // Optional: To link message to a persona for TTS
}

// PHASE B: Flexible Model Selection Types - Updated with exact API model names
export type AvailableModel = 
  | 'gpt-4o' 
  | 'gpt-4o-mini' 
  | 'claude-3-5-sonnet-20241022'
  | 'deepseek-r1' 
  | 'deepseek-v3' 
  | 'gemini-2.5-flash-preview-05-06' 
  | 'gemini-2.5-pro-preview-05-06';

export type ModelPosition = 'pro' | 'con';

export interface ModelConfiguration {
  name: AvailableModel;
  position: ModelPosition;
  agreeabilityLevel: number; // 0-10
  extensivenessLevel: number; // 1-5 (1=brief, 5=academic)
  personaId?: string;
  stance?: 'truthSeeker' | 'stubborn';
}

export interface TokenMetrics {
  currentTurn: number;
  totalTokensUsed: number;
  estimatedCost: number;
  compressionSavings: number;
}

// PHASE B: New flexible debate state structure
export interface FlexibleDebateState {
  isActive: boolean;
  modelA: ModelConfiguration;
  modelB: ModelConfiguration;
  modelAMessages: Message[];
  modelBMessages: Message[];
  isModelALoading: boolean;
  isModelBLoading: boolean;
  lastActiveModel: 'A' | 'B' | null;
}

// Model display configurations for UI
export interface ModelDisplayConfig {
  name: AvailableModel;
  displayName: string;
  shortName: string;
  color: string;
  description: string;
}

// RESPONSE LENGTH CONTROL: New flexible response configuration system
export type ResponseLengthStyle = 'concise' | 'balanced' | 'detailed' | 'elaborate';

export interface ResponseLengthConfig {
  style: ResponseLengthStyle;
  level: number; // 1-10 for granular control
  limits: {
    minSentences: number;
    maxSentences: number;
    minWords: number;
    maxWords: number;
    maxTokens: number;
  };
  description: string;
}

export interface ResponseLengthPresets {
  [key: number]: ResponseLengthConfig;
}

// EXTENSIVENESS PRESETS: 5 levels of response detail
export const EXTENSIVENESS_PRESETS: { [key: number]: ResponseLengthConfig } = {
  1: {
    style: 'concise',
    level: 1,
    limits: {
      minSentences: 1,
      maxSentences: 2,
      minWords: 10,
      maxWords: 50,
      maxTokens: 75
    },
    description: 'Single powerful statement - maximum impact, minimum words'
  },
  2: {
    style: 'concise',
    level: 2,
    limits: {
      minSentences: 2,
      maxSentences: 3,
      minWords: 25,
      maxWords: 75,
      maxTokens: 100
    },
    description: 'Brief but complete - essential points only'
  },
  3: {
    style: 'balanced',
    level: 3,
    limits: {
      minSentences: 3,
      maxSentences: 4,
      minWords: 50,
      maxWords: 150,
      maxTokens: 200
    },
    description: 'Balanced response - key arguments with some context'
  },
  4: {
    style: 'detailed',
    level: 4,
    limits: {
      minSentences: 4,
      maxSentences: 6,
      minWords: 100,
      maxWords: 250,
      maxTokens: 350
    },
    description: 'Detailed analysis - comprehensive reasoning and examples'
  },
  5: {
    style: 'elaborate',
    level: 5,
    limits: {
      minSentences: 5,
      maxSentences: 8,
      minWords: 200,
      maxWords: 400,
      maxTokens: 500
    },
    description: 'Academic depth - thorough exploration with nuanced analysis'
  }
}; 