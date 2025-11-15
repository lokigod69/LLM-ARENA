// Character Chat System Types
// Defines all types specific to the chat system (isolated from debate system)

import type { AvailableModel } from '@/types';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  tokenUsage?: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    estimatedCost: number;
  };
}

export interface ChatConfiguration {
  modelName: AvailableModel;
  personaId: string;
  stance?: number;              // DEPRECATED: Now uses persona's hardcoded baseStubbornness (kept for backward compatibility with saved sessions)
  defaultExtensiveness: number; // 1-5 (default response length)
}

export interface ChatSession {
  id: string;
  userId?: string;             // Optional for future auth
  accessCode?: string;         // For tracking
  createdAt: Date;
  updatedAt: Date;
  configuration: ChatConfiguration;
  messages: ChatMessage[];
  metadata?: {
    totalTokens: number;
    totalCost: number;
  };
}

export interface ChatError {
  type: 'api' | 'auth' | 'rate_limit' | 'network' | 'cost';
  message: string;
  retryable: boolean;
  timestamp: Date;
}

export interface ChatState {
  sessionId: string | null;
  isLoading: boolean;
  configuration: ChatConfiguration;
  messages: ChatMessage[];
  nextMessageExtensiveness: number; // User-controlled for next message
  error: ChatError | null;
}

