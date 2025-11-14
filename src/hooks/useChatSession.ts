// Character Chat Session Hook
// Complete state management for chat sessions (isolated from debate system)

'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { 
  ChatMessage, 
  ChatConfiguration, 
  ChatError, 
  ChatState 
} from '@/types/chat';

interface ChatSessionActions {
  initializeSession: (config: ChatConfiguration) => void;
  sendMessage: (content: string, extensiveness?: number) => Promise<void>;
  updateConfiguration: (config: Partial<ChatConfiguration>) => void;
  setNextMessageExtensiveness: (level: number) => void;
  clearError: () => void;
  retryLastMessage: () => Promise<void>;
  clearSession: () => void;
  saveSession: () => Promise<void>;
  loadSession: (sessionId: string) => Promise<void>;
}

export const useChatSession = (): ChatState & ChatSessionActions => {
  const [state, setState] = useState<ChatState>({
    sessionId: null,
    isLoading: false,
    configuration: {
      modelName: 'gpt-5',
      personaId: 'marcus_aurelius',
      stance: 5,
      defaultExtensiveness: 3,
    },
    messages: [],
    nextMessageExtensiveness: 3,
    error: null,
  });

  const lastUserMessageRef = useRef<string | null>(null);

  // Load session from sessionStorage on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const savedSession = sessionStorage.getItem('llm-arena-chat-session');
    if (savedSession) {
      try {
        const parsed = JSON.parse(savedSession);
        // Restore session if it has messages or was active
        if (parsed.messages?.length > 0 || parsed.sessionId) {
          setState({
            ...parsed,
            error: null,
            isLoading: false,
          });
        }
      } catch (error) {
        console.error('Failed to load chat session:', error);
      }
    }
  }, []);

  // Auto-save session to sessionStorage
  useEffect(() => {
    if (typeof window === 'undefined' || !state.sessionId) return;
    
    try {
      sessionStorage.setItem('llm-arena-chat-session', JSON.stringify({
        ...state,
        // Convert Date objects to ISO strings for storage
        messages: state.messages.map(m => ({
          ...m,
          timestamp: m.timestamp.toISOString(),
        })),
      }));
    } catch (error) {
      console.error('Failed to save chat session:', error);
    }
  }, [state]);

  const initializeSession = useCallback((config: ChatConfiguration) => {
    const sessionId = uuidv4();
    const newState = {
      sessionId,
      isLoading: false,
      configuration: config,
      messages: [],
      nextMessageExtensiveness: config.defaultExtensiveness,
      error: null,
    };
    setState(newState);
    // Save immediately
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.setItem('llm-arena-chat-session', JSON.stringify({
          ...newState,
          messages: [],
        }));
      } catch (error) {
        console.error('Failed to save chat session:', error);
      }
    }
  }, []);

  const sendMessage = useCallback(async (
    content: string, 
    extensiveness?: number
  ) => {
    if (!state.sessionId) {
      // Auto-initialize if no session exists
      initializeSession(state.configuration);
    }

    const effectiveExtensiveness = extensiveness ?? state.nextMessageExtensiveness;
    lastUserMessageRef.current = content;

    // Add user message
    const userMessage: ChatMessage = {
      id: uuidv4(),
      role: 'user',
      content,
      timestamp: new Date(),
    };

    setState(prev => ({
      ...prev,
      messages: [...prev.messages, userMessage],
      isLoading: true,
      error: null,
    }));

    try {
      // Call chat API
      const response = await fetch('/api/chat/message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          message: content,
          configuration: {
            ...state.configuration,
            defaultExtensiveness: effectiveExtensiveness,
          },
          conversationHistory: state.messages,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        // Handle error response
        const error: ChatError = {
          type: data.error.type || 'api',
          message: data.error.message || 'Failed to get response',
          retryable: data.error.retryable || false,
          timestamp: new Date(),
        };

        setState(prev => ({
          ...prev,
          isLoading: false,
          error,
        }));
        return;
      }

      // Success - add assistant message
      const assistantMessage: ChatMessage = {
        id: uuidv4(),
        role: 'assistant',
        content: data.reply,
        timestamp: new Date(),
        tokenUsage: data.tokenUsage,
      };

      setState(prev => ({
        ...prev,
        messages: [...prev.messages, assistantMessage],
        isLoading: false,
        error: null,
      }));
    } catch (error) {
      // Network or other error
      const chatError: ChatError = {
        type: 'network',
        message: error instanceof Error ? error.message : 'Network error occurred',
        retryable: true,
        timestamp: new Date(),
      };

      setState(prev => ({
        ...prev,
        isLoading: false,
        error: chatError,
      }));
    }
  }, [state.sessionId, state.nextMessageExtensiveness, state.configuration, state.messages, initializeSession]);

  const updateConfiguration = useCallback((config: Partial<ChatConfiguration>) => {
    setState(prev => ({
      ...prev,
      configuration: { ...prev.configuration, ...config },
    }));
  }, []);

  const setNextMessageExtensiveness = useCallback((level: number) => {
    setState(prev => ({
      ...prev,
      nextMessageExtensiveness: Math.max(1, Math.min(5, level)),
    }));
  }, []);

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  const retryLastMessage = useCallback(async () => {
    if (!lastUserMessageRef.current) return;
    
    // Remove last assistant message if exists
    setState(prev => {
      const newMessages = [...prev.messages];
      if (newMessages.length > 0 && newMessages[newMessages.length - 1].role === 'assistant') {
        newMessages.pop();
      }
      return { ...prev, messages: newMessages };
    });

    // Retry sending last user message
    if (lastUserMessageRef.current) {
      await sendMessage(lastUserMessageRef.current);
    }
  }, [sendMessage]);

  const clearSession = useCallback(() => {
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('llm-arena-chat-session');
    }
    setState({
      sessionId: null,
      isLoading: false,
      configuration: {
        modelName: 'gpt-5',
        personaId: 'marcus_aurelius',
        stance: 5,
        defaultExtensiveness: 3,
      },
      messages: [],
      nextMessageExtensiveness: 3,
      error: null,
    });
    lastUserMessageRef.current = null;
  }, []);

  const saveSession = useCallback(async () => {
    if (!state.sessionId) {
      console.error('No session to save');
      return;
    }

    try {
      // Calculate metadata
      const totalTokens = state.messages.reduce((sum, msg) => {
        return sum + (msg.tokenUsage?.totalTokens || 0);
      }, 0);

      const totalCost = state.messages.reduce((sum, msg) => {
        return sum + (msg.tokenUsage?.estimatedCost || 0);
      }, 0);

      const session: ChatSession = {
        id: state.sessionId,
        userId: undefined, // Future: get from auth
        accessCode: undefined, // Future: get from auth
        createdAt: new Date(),
        updatedAt: new Date(),
        configuration: state.configuration,
        messages: state.messages,
        metadata: {
          totalTokens,
          totalCost,
        },
      };

      const response = await fetch('/api/chat/sessions/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ session }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to save session');
      }

      console.log('✅ Session saved:', data.sessionId);
    } catch (error) {
      console.error('Failed to save session:', error);
      const chatError: ChatError = {
        type: 'api',
        message: error instanceof Error ? error.message : 'Failed to save session',
        retryable: true,
        timestamp: new Date(),
      };
      setState(prev => ({ ...prev, error: chatError }));
    }
  }, [state]);

  const loadSession = useCallback(async (sessionId: string) => {
    try {
      const response = await fetch(`/api/chat/sessions/load?sessionId=${sessionId}`, {
        method: 'GET',
        credentials: 'include',
      });

      const data = await response.json();

      if (!data.success || !data.session) {
        throw new Error(data.error || 'Failed to load session');
      }

      const session: ChatSession = data.session;

      setState({
        sessionId: session.id,
        isLoading: false,
        configuration: session.configuration,
        messages: session.messages,
        nextMessageExtensiveness: session.configuration.defaultExtensiveness,
        error: null,
      });

      console.log('✅ Session loaded:', session.id);
    } catch (error) {
      console.error('Failed to load session:', error);
      const chatError: ChatError = {
        type: 'api',
        message: error instanceof Error ? error.message : 'Failed to load session',
        retryable: true,
        timestamp: new Date(),
      };
      setState(prev => ({ ...prev, error: chatError }));
    }
  }, []);

  return {
    ...state,
    initializeSession,
    sendMessage,
    updateConfiguration,
    setNextMessageExtensiveness,
    clearError,
    retryLastMessage,
    clearSession,
    saveSession,
    loadSession,
  };
};

