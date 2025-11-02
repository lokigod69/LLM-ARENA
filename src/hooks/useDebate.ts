'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { Message } from '@/types';
import { v4 as uuidv4 } from 'uuid';
import type { 
  ModelPosition, 
  AvailableModel, 
  ModelConfiguration,
  FlexibleDebateState 
} from '@/types';
import type { OracleConfig, OracleResult } from '@/types/oracle';
import { getModelDisplayName } from '@/lib/modelConfigs';
import { PERSONAS } from '@/lib/personas';
import { addItem as addLibraryItem, MarkedItem } from '@/lib/libraryStorage';

// PHASE 1: New data structures for individual model personality control
export interface ModelPersonality {
  agreeabilityLevel: number; // 0-10 (position defending to truth seeking)
  position: ModelPosition;   // 'pro' | 'con'
}

export interface PersonalityConfig {
  gpt: ModelPersonality;
  claude: ModelPersonality;
}

// Legacy interface for backward compatibility
interface PositionAssignment {
  gpt: ModelPosition;
  claude: ModelPosition;
}

// PHASE B: New flexible debate state structure
interface EnhancedDebateState {
  isActive: boolean;
  isPaused: boolean;
  currentTurn: number;
  maxTurns: number;
  topic: string;
  
  // NEW: Flexible model system
  modelA: ModelConfiguration;
  modelB: ModelConfiguration;
  modelAMessages: Message[];
  modelBMessages: Message[];
  isModelALoading: boolean;
  isModelBLoading: boolean;
  lastActiveModel: 'A' | 'B' | null;
  
  // THE ORACLE PHASE 1.1: Oracle analysis results
  oracleResults: OracleResult[];
  isOracleAnalyzing: boolean;
  
  // --- CHANGE 1: ADD NEW STATE PROPERTIES ---
  accessCode: string | null;
  queriesRemaining: number | string;

  // BACKWARD COMPATIBILITY: Legacy fields (deprecated - remove in Phase 4)
  /** @deprecated Use modelA/modelB instead */
  gptMessages: Message[];
  /** @deprecated Use modelA/modelB instead */
  claudeMessages: Message[];
  /** @deprecated Use isModelALoading/isModelBLoading instead */
  isGptLoading: boolean;
  /** @deprecated Use isModelALoading/isModelBLoading instead */
  isClaudeLoading: boolean;
  /** @deprecated Use lastActiveModel instead */
  lastActiveModel_legacy: 'GPT' | 'Claude' | null;
  /** @deprecated Use modelA/modelB.agreeabilityLevel instead */
  agreeabilityLevel: number;
  /** @deprecated Use modelA/modelB.position instead */
  positionAssignment: { gpt: ModelPosition; claude: ModelPosition };
  /** @deprecated Use modelA/modelB instead */
  personalityConfig: {
    gpt: { agreeabilityLevel: number; position: ModelPosition };
    claude: { agreeabilityLevel: number; position: ModelPosition };
  };
}

interface EnhancedDebateActions {
  // --- CHANGE 2: MODIFY/ADD ACTIONS ---
  startDebate: (topic: string) => Promise<void>; // <-- MODIFIED
  stopDebate: () => void;
  setMaxTurns: (turns: number) => void;
  
  setAccessCode: (code: string | null) => void; // <-- ADDED
  setQueriesRemaining: (count: number | string) => void; // <-- ADDED
  
  // NEW: Flexible model configuration actions
  setModelA: (config: ModelConfiguration) => void;
  setModelB: (config: ModelConfiguration) => void;
  setModelConfiguration: (modelA: ModelConfiguration, modelB: ModelConfiguration) => void;
  swapModels: () => void;
  randomizePersonalities: () => void;
  setModelPersona: (model: 'A' | 'B', personaId: string | null) => void;
  
  // THE ORACLE PHASE 1: Configurable analysis actions
  requestOracleAnalysis: (config: OracleConfig) => Promise<void>;
  clearOracleResults: () => void;
  exportDebateData: () => void;
  
  // BACKWARD COMPATIBILITY: Legacy actions (deprecated - remove in Phase 4)
  /** @deprecated Use setModelA/setModelB instead */
  setPersonalityConfig: (config: any) => void;
  /** @deprecated Use setModelA/setModelB instead */
  setModelPersonality: (model: 'gpt' | 'claude', personality: any) => void;
  /** @deprecated Use setModelA/setModelB instead */
  setAgreeabilityLevel: (level: number) => void;
  /** @deprecated Use setModelA/setModelB instead */
  setPositionAssignment: (assignment: any) => void;
}

export const useDebate = (): EnhancedDebateState & EnhancedDebateActions => {
  const [state, setState] = useState<EnhancedDebateState>({
    isActive: false,
    isPaused: false,
    currentTurn: 0,
    maxTurns: 5,
    topic: '',
    
    // --- CHANGE 3: ADD INITIAL STATE VALUES ---
    accessCode: null,
    queriesRemaining: '...',
    
    // NEW: Default flexible model configuration - Updated with exact API names
    modelA: { 
      name: 'gpt-4o' as AvailableModel, 
      position: 'pro' as ModelPosition, 
      agreeabilityLevel: 7,
      extensivenessLevel: 3 // Default: Balanced response
    },
    modelB: { 
      name: 'claude-3-5-sonnet-20241022' as AvailableModel, 
      position: 'con' as ModelPosition, 
      agreeabilityLevel: 3,
      extensivenessLevel: 3 // Default: Balanced response
    },
    modelAMessages: [],
    modelBMessages: [],
    isModelALoading: false,
    isModelBLoading: false,
    lastActiveModel: null,
    
    oracleResults: [],
    isOracleAnalyzing: false,
    
    // BACKWARD COMPATIBILITY: Initialize legacy fields
    gptMessages: [],
    claudeMessages: [],
    isGptLoading: false,
    isClaudeLoading: false,
    lastActiveModel_legacy: null,
    agreeabilityLevel: 5,
    positionAssignment: { gpt: 'pro', claude: 'con' },
    personalityConfig: {
      gpt: { agreeabilityLevel: 7, position: 'pro' },
      claude: { agreeabilityLevel: 3, position: 'con' },
    },
  });

  // --- CHANGE 4: IMPLEMENT SETTERS AND REF ---
  const debateStateRef = useRef(state);
  useEffect(() => {
    debateStateRef.current = state;
  }, [state]);

  const setAccessCode = (code: string | null) => {
    setState(prev => ({ ...prev, accessCode: code }));
  };

  const setQueriesRemaining = (count: number | string) => {
    setState(prev => ({ ...prev, queriesRemaining: count }));
  };

  const autoStepTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const waitingForTypingRef = useRef<boolean>(false);
  const processNextTurnRef = useRef<(() => void) | null>(null);
  const watchdogTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Helper function to sync legacy state with new flexible state
  const syncLegacyState = useCallback(() => {
    setState(prev => {
      // Determine which model is GPT and which is Claude for legacy compatibility
      const gptIsModelA = prev.modelA.name === 'gpt-4o' || prev.modelA.name === 'gpt-4o-mini';
      const claudeIsModelA = prev.modelA.name === 'claude-3-5-sonnet-20241022';
      const gptIsModelB = prev.modelB.name === 'gpt-4o' || prev.modelB.name === 'gpt-4o-mini';
      const claudeIsModelB = prev.modelB.name === 'claude-3-5-sonnet-20241022';
      
      let gptMessages = prev.gptMessages;
      let claudeMessages = prev.claudeMessages;
      let isGptLoading = prev.isGptLoading;
      let isClaudeLoading = prev.isClaudeLoading;
      let lastActiveModel_legacy = prev.lastActiveModel_legacy;
      
      // Map messages based on current model assignments
      if (gptIsModelA) {
        gptMessages = prev.modelAMessages;
        isGptLoading = prev.isModelALoading;
      } else if (gptIsModelB) {
        gptMessages = prev.modelBMessages;
        isGptLoading = prev.isModelBLoading;
      }
      
      if (claudeIsModelA) {
        claudeMessages = prev.modelAMessages;
        isClaudeLoading = prev.isModelALoading;
      } else if (claudeIsModelB) {
        claudeMessages = prev.modelBMessages;
        isClaudeLoading = prev.isModelBLoading;
      }
      
      // Map last active model
      if (prev.lastActiveModel === 'A') {
        if (gptIsModelA) lastActiveModel_legacy = 'GPT';
        else if (claudeIsModelA) lastActiveModel_legacy = 'Claude';
      } else if (prev.lastActiveModel === 'B') {
        if (gptIsModelB) lastActiveModel_legacy = 'GPT';
        else if (claudeIsModelB) lastActiveModel_legacy = 'Claude';
      }
      
      return {
        ...prev,
        gptMessages,
        claudeMessages,
        isGptLoading,
        isClaudeLoading,
        lastActiveModel_legacy,
        personalityConfig: {
          gpt: gptIsModelA 
            ? { agreeabilityLevel: prev.modelA.agreeabilityLevel, position: prev.modelA.position }
            : gptIsModelB 
              ? { agreeabilityLevel: prev.modelB.agreeabilityLevel, position: prev.modelB.position }
              : prev.personalityConfig.gpt,
          claude: claudeIsModelA 
            ? { agreeabilityLevel: prev.modelA.agreeabilityLevel, position: prev.modelA.position }
            : claudeIsModelB 
              ? { agreeabilityLevel: prev.modelB.agreeabilityLevel, position: prev.modelB.position }
              : prev.personalityConfig.claude,
        },
        positionAssignment: {
          gpt: gptIsModelA ? prev.modelA.position : gptIsModelB ? prev.modelB.position : prev.positionAssignment.gpt,
          claude: claudeIsModelA ? prev.modelA.position : claudeIsModelB ? prev.modelB.position : prev.positionAssignment.claude,
        },
        agreeabilityLevel: gptIsModelA ? prev.modelA.agreeabilityLevel : prev.agreeabilityLevel,
      };
    });
  }, []);

  // Sync legacy state whenever flexible state changes
  useEffect(() => {
    syncLegacyState();
  }, [state.modelA, state.modelB, state.modelAMessages, state.modelBMessages, state.isModelALoading, state.isModelBLoading, state.lastActiveModel, syncLegacyState]);

  // Event handler for when the typewriter effect completes
  useEffect(() => {
    const handleTypingComplete = (event: Event) => {
      const detail = (event as CustomEvent).detail;
      console.log('✅ Typing complete event received:', detail);

      if (waitingForTypingRef.current) {
        console.log('▶️ Typing finished for the current turn, proceeding...');
        waitingForTypingRef.current = false;
        if (watchdogTimerRef.current) {
          clearTimeout(watchdogTimerRef.current);
          watchdogTimerRef.current = null;
        }
        // INCREASE DELAY - Wait 2 seconds instead of 1 second
        // This gives time for animation to fully complete and prevents overlap
        autoStepTimeoutRef.current = setTimeout(() => {
          processNextTurnRef.current?.();
        }, 2000);  // ← Changed from 1000 to 2000
      }
    };

    window.addEventListener('typingComplete', handleTypingComplete);
    return () => {
      window.removeEventListener('typingComplete', handleTypingComplete);
    };
  }, []);

  // Clear any existing auto-step timeout
  const clearAutoStep = useCallback(() => {
    console.log('🧹 Clearing all timeouts...');
    if (autoStepTimeoutRef.current) {
      clearTimeout(autoStepTimeoutRef.current);
      autoStepTimeoutRef.current = null;
    }
    if (watchdogTimerRef.current) {
      clearTimeout(watchdogTimerRef.current);
      watchdogTimerRef.current = null;
    }
  }, []);

  // PHASE B: Enhanced API call for flexible model system
  const getLLMResponse = useCallback(async (
    prevMessage: string, 
    targetModelConfig: ModelConfiguration,
    topic: string,
    maxTurns: number,
    conversationHistory: Message[]
  ): Promise<Message> => {
    const { 
      name: targetModel, 
      agreeabilityLevel, 
      position, 
      extensivenessLevel, 
      personaId 
    } = targetModelConfig;

    console.log('🔥🔥🔥 getLLMResponse CALLED (FLEXIBLE) 🔥🔥🔥');
    console.log('🔥 Parameters:', { targetModel, agreeabilityLevel, position, topic, maxTurns, extensivenessLevel, personaId });
    
    console.log('🌐 FRONTEND API CALL (FLEXIBLE):');
    console.log(`   ├── Target Model: ${targetModel}`);
    console.log(`   ├── Personality Level: ${agreeabilityLevel}/10 (${agreeabilityLevel <= 3 ? 'Position Defender' : agreeabilityLevel >= 7 ? 'Truth Seeker' : 'Balanced'})`);
    console.log(`   ├── Extensiveness: ${extensivenessLevel}/5 (${extensivenessLevel <= 2 ? 'Brief' : extensivenessLevel >= 4 ? 'Detailed' : 'Balanced'})`);
    console.log(`   ├── Position: ${position}`);
    console.log(`   ├── Persona ID: ${personaId || 'None'}`);
    console.log(`   ├── Message: "${prevMessage.substring(0, 50)}${prevMessage.length > 50 ? '...' : ''}"`);
    console.log(`   └── Topic: "${topic.substring(0, 40)}${topic.length > 40 ? '...' : ''}"`);
    
    console.log('🔥 About to enter try block...');
    
    try {
      console.log('🔥 Inside try block - creating request body...');
      
      // PHASE B: Map flexible model names to API-compatible format - Updated for exact API names
      let apiModel: string;
      switch (targetModel) {
        case 'gpt-4o':
        case 'gpt-4o-mini':
          apiModel = targetModel; // Use exact API model name
          break;
        case 'claude-3-5-sonnet-20241022':
          apiModel = targetModel; // Use exact API model name
          break;
        case 'deepseek-r1':
        case 'deepseek-v3':
        case 'gemini-2.5-flash-preview-05-06':
        case 'gemini-2.5-pro-preview-05-06':
          apiModel = targetModel; // Use exact API model name
          break;
        default:
          apiModel = 'gpt-4o'; // Default fallback to gpt-4o
      }
      
      // --- CHANGE 5 PART A: ADD ACCESS CODE TO REQUEST BODY ---
      const requestBody = { 
        prevMessage, 
        model: apiModel, // Use mapped model for API compatibility
        // Enhanced parameters
        agreeabilityLevel,
        position,
        topic,
        maxTurns,
        extensivenessLevel, // NEW: Response length control
        personaId, // NEW: Persona ID
        conversationHistory,
        turnNumber: conversationHistory.length, // NEW: Turn number for turn-specific prompts
        accessCode: debateStateRef.current.accessCode, // <-- ADDED
        // NEW: Include original model name for future API expansion
        originalModel: targetModel
      };

      console.log('💰 DEBUG: About to call /api/debate/step...');
      console.log('📤 Sending request body:', {
        ...requestBody,
        prevMessage: requestBody.prevMessage.substring(0, 50) + '...'
      });

      // Get current state to determine which model is calling
      const currentState = debateStateRef.current;
      const isModelATurn = currentState.lastActiveModel === 'B' || currentState.lastActiveModel === null;
      
      console.log('🎯 API CALL DEBUG:', {
        turn: conversationHistory.length + 1,
        isModelATurn,
        callingModel: targetModel,
        positionSent: position,
        conversationHistoryLength: conversationHistory.length,
        historyPreview: conversationHistory.map(m => ({
          sender: m.sender,
          text: m.text.slice(0, 50)
        }))
      });
      
      // CRITICAL: Verify what's actually being sent to API
      console.error('🔴 CRITICAL POSITION DEBUG:', {
        turn: conversationHistory.length + 1,
        targetModel,
        positionBeingSent: position,
        topicStatement: topic,
        agreeabilityLevel,
        fullRequestBody: {
          model: requestBody.model,
          position: requestBody.position,
          topic: requestBody.topic,
          prevMessagePreview: requestBody.prevMessage.slice(0, 80)
        }
      });

      console.log('🔥 About to make fetch call...');
      
      const response = await fetch('/api/debate/step', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      console.log('🔥 Fetch completed! Response status:', response.status);
      console.log('💰 DEBUG: API response received, status:', response.status);
      
      // Enhanced response parsing with better error handling
      let responseData;
      try {
        // Read the response text once
        const responseText = await response.text();
        
        // Try to parse as JSON
        responseData = JSON.parse(responseText);
        console.log('💰 DEBUG: API response parsed successfully');
      } catch (error) {
        console.error('❌ Failed to parse successful response:', error);
        throw new Error(`${targetModel} returned invalid response format`);
      }

      // --- CHANGE 5 PART A: UPDATE QUERIES REMAINING ---
      if (responseData.queriesRemaining !== undefined) {
        setQueriesRemaining(responseData.queriesRemaining);
      }

      if (!response.ok) {
        // Enhanced error handling to prevent JSON parsing errors
        let errorMessage = `Failed to get response from ${targetModel}`;
        
        try {
            console.error('❌ API Response Error:', responseData);
            errorMessage = responseData.error || errorMessage;
            
            // PHASE 1: Handle queries exhausted error specifically
            if (response.status === 403 && (errorMessage.includes('queries remaining') || errorMessage.includes('No queries'))) {
              setQueriesRemaining(0);
              errorMessage = 'No queries remaining. Please contact administrator for more access.';
            }
        } catch (e) {
            errorMessage = `${targetModel} API Error: Could not parse error response`;
        }
        
        throw new Error(errorMessage);
      }

      console.log('📥 API Response received:', {
        model: responseData.model,
        replyLength: responseData.reply?.length || 0,
        timestamp: responseData.timestamp
      });
      
      // CRITICAL: Check for duplicate responses
      const hashCode = (str: string): number => {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
          hash = ((hash << 5) - hash) + str.charCodeAt(i);
          hash = hash & hash;
        }
        return hash;
      };
      
      console.error('🔴 API RESPONSE DEBUG:', {
        turn: conversationHistory.length + 1,
        model: responseData.model,
        replyPreview: responseData.reply?.slice(0, 100),
        replyHash: hashCode(responseData.reply || ''),
        replyLength: responseData.reply?.length || 0,
        targetModelExpected: targetModel,
        positionExpected: position
      });
      
      // Map the orchestrator response to Message format
      console.log('📨 MESSAGE CREATION:', {
        responseDataModel: responseData.model,
        expectedModel: targetModel,
        displayNameFromResponse: getModelDisplayName(responseData.model),
        displayNameFromExpected: getModelDisplayName(targetModel)
      });
      
      const newMessage: Message = {
        id: uuidv4(),
        text: responseData.reply || responseData.text || 'No response received',
        // FIX: Use the model from state (targetModel), not from response
        sender: getModelDisplayName(targetModel),
        timestamp: responseData.timestamp || new Date().toISOString(),
        personaId: personaId,
      };
      
      console.log('✅ FRONTEND SUCCESS:', {
        messageId: newMessage.id,
        sender: newMessage.sender,
        textLength: newMessage.text.length,
        personalityUsed: `Level ${agreeabilityLevel} ${position}`,
        correctModel: targetModel
      });
      
      return newMessage;
    } catch (error) {
      console.error(`💥 FRONTEND ERROR for ${targetModel}:`, error);
      console.error('💥 Error context:', {
        targetModel,
        agreeabilityLevel,
        position,
        messageLength: prevMessage?.length || 0,
        topic: topic?.substring(0, 50) || 'undefined',
        errorMessage: (error as Error).message,
        errorStack: (error as Error).stack
      });
      return {
        id: uuidv4(),
        text: `Error: ${(error as Error).message || 'Could not get response.'}`,
        sender: getModelDisplayName(targetModelConfig.name),
        timestamp: new Date().toISOString(),
        personaId: targetModelConfig.personaId,
      };
    }
  }, [setQueriesRemaining]); // Added setQueriesRemaining to dependency array

  // Save debate to Supabase database (optional - only if configured)
  // Defined here so it can be called from processNextTurn
  const saveDebateToSupabase = useCallback(async (debateState: EnhancedDebateState) => {
    // Only save if Supabase is configured
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
      console.log('⏭️ Skipping database save (Supabase not configured)');
      return;
    }

    // Only save if debate has content
    if (!debateState.topic || debateState.currentTurn === 0) {
      console.log('⏭️ Skipping database save (no debate content)');
      return;
    }

    try {
      // Prepare all messages in chronological order
      const allMessages = [...debateState.modelAMessages, ...debateState.modelBMessages].sort(
        (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );

      const debateData = {
        topic: debateState.topic,
        maxTurns: debateState.maxTurns,
        actualTurns: debateState.currentTurn,
        modelAName: debateState.modelA.name,
        modelBName: debateState.modelB.name,
        modelADisplayName: getModelDisplayName(debateState.modelA.name),
        modelBDisplayName: getModelDisplayName(debateState.modelB.name),
        agreeabilityLevel: debateState.modelA.agreeabilityLevel || null, // Use modelA's agreeability (or could average both)
        extensivenessLevel: debateState.modelA.extensivenessLevel || null, // Use modelA's extensiveness (or could average both)
        messages: allMessages, // Full conversation history
        oracleAnalysis: debateState.oracleResults.length > 0 ? debateState.oracleResults : null,
        accessToken: debateState.accessCode || null,
        debateDurationSeconds: null, // Can add timer if needed
        totalTokensUsed: null // Can track if needed
      };

      const response = await fetch('/api/debates/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(debateData)
      });

      if (response.ok) {
        const result = await response.json();
        console.log('✅ Debate saved to Supabase:', result.id);
      } else {
        // Don't throw - saving is optional
        const errorText = await response.text();
        console.error('❌ Failed to save debate to Supabase:', errorText);
      }
    } catch (error) {
      // Don't throw - saving is optional, don't break user flow
      console.error('❌ Error saving debate to Supabase:', error);
    }
  }, []);

  // This function is now defined outside and wrapped in useCallback
  const processNextTurn = useCallback(async () => {
    // Get FRESH state from ref - this includes the most recently added message
    const currentState = debateStateRef.current;

    // Check if we should continue
    if (!currentState.isActive) {
      console.log('🏁 Auto-step process ended: debate stopped');
      return;
    }
    
    if (currentState.currentTurn >= currentState.maxTurns) {
      console.log('🏁 Max turns reached, debate complete');
      
      // Auto-save debate to library
      try {
        console.log('💾 Auto-saving debate to library...');
        const debateItem: MarkedItem = {
          id: uuidv4(),
          type: ['star'], // Auto-saved debates are marked as 'star' (important/saved)
          content: {
            topic: currentState.topic,
            modelA: {
              name: currentState.modelA.name,
              displayName: getModelDisplayName(currentState.modelA.name),
              config: currentState.modelA
            },
            modelB: {
              name: currentState.modelB.name,
              displayName: getModelDisplayName(currentState.modelB.name),
              config: currentState.modelB
            },
            messages: [...currentState.modelAMessages, ...currentState.modelBMessages].sort(
              (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
            ),
            totalTurns: currentState.currentTurn,
            maxTurns: currentState.maxTurns
          },
          timestamp: new Date().toISOString(),
          folders: [],
          annotation: `Auto-saved debate: ${currentState.topic.slice(0, 50)}${currentState.topic.length > 50 ? '...' : ''}`
        };
        
        addLibraryItem(debateItem);
        console.log('✅ Debate auto-saved to library');
      } catch (error) {
        console.error('❌ Failed to auto-save debate:', error);
      }
      
      // Auto-save debate to Supabase (if configured)
      saveDebateToSupabase(currentState).catch(err => {
        // Don't throw - saving is optional, don't break user flow
        console.error('❌ Failed to save debate to Supabase:', err);
      });
      
      // Automatically stop the debate
      setState(prev => ({
        ...prev,
        isActive: false,
        isModelALoading: false,
        isModelBLoading: false
      }));
      
      console.log('✅ Debate ended - Oracle now available for analysis');
      
      // Note: Oracle auto-trigger removed - user should manually trigger when ready
      // This gives them time to review the debate before analyzing
      
      return;
    }
    
    // Determine next model
    const nextModelSide: 'A' | 'B' = currentState.lastActiveModel === 'A' ? 'B' : 'A';
    const nextModelConfig = nextModelSide === 'A' ? currentState.modelA : currentState.modelB;
    const isModelATurn = nextModelSide === 'A';
    
    console.log(`🔄 Auto-step turn ${currentState.currentTurn + 1}: ${currentState.lastActiveModel} -> ${nextModelSide} (${nextModelConfig.name})`);
    
    console.log('🎯 TURN DETAILS:', {
      turn: currentState.currentTurn + 1,
      nextModelSide,
      modelA: {
        name: currentState.modelA.name,
        displayName: getModelDisplayName(currentState.modelA.name),
        position: currentState.modelA.position
      },
      modelB: {
        name: currentState.modelB.name,
        displayName: getModelDisplayName(currentState.modelB.name),
        position: currentState.modelB.position
      },
      callingModel: isModelATurn ? currentState.modelA.name : currentState.modelB.name,
      callingPosition: nextModelConfig.position
    });
    
    console.log('🎯 API CALL POSITION:', {
      turn: currentState.currentTurn + 1,
      isModelATurn,
      modelACalling: isModelATurn ? currentState.modelA.name : 'waiting',
      modelBCalling: !isModelATurn ? currentState.modelB.name : 'waiting',
      positionBeingSent: nextModelConfig.position,
      expectedModelAPosition: currentState.modelA.position,
      expectedModelBPosition: currentState.modelB.position
    });
    
    // Set loading state
    setState(prev => ({
      ...prev,
      isModelALoading: isModelATurn,
      isModelBLoading: !isModelATurn,
    }));
    
    // Get previous message for context
    let prevMessage: string;
    if (currentState.currentTurn > 0) {
      const oppositeMessages = isModelATurn ? currentState.modelBMessages : currentState.modelAMessages;
      const lastMessage = oppositeMessages[oppositeMessages.length - 1]?.text;
      prevMessage = String(lastMessage || '') || currentState.topic || '';
    } else {
      prevMessage = currentState.topic || '';
    }
    console.log('🎯 prevMessage calculation:', {
      turn: currentState.currentTurn + 1,
      nextModelSide,
      modelACount: currentState.modelAMessages.length,
      modelBCount: currentState.modelBMessages.length,
      prevMessage: (prevMessage || '').slice(0, 60),
      topic: (currentState.topic || '').slice(0, 60)
    });
    
    // Build history from FRESH state (includes all messages up to this point)
    const conversationHistory = [
      ...currentState.modelAMessages,
      ...currentState.modelBMessages
    ].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    
    console.log('📚 CONVERSATION HISTORY CHECK:', {
      turn: currentState.currentTurn + 1,
      historyLength: conversationHistory.length,
      modelACount: currentState.modelAMessages.length,
      modelBCount: currentState.modelBMessages.length,
      historyContent: conversationHistory.map(m => ({
        sender: m.sender,
        textPreview: m.text.slice(0, 50)
      }))
    });
    
    console.log('📜 Conversation history being sent:', {
      turn: currentState.currentTurn + 1,
      count: conversationHistory.length,
      modelACount: currentState.modelAMessages.length,
      modelBCount: currentState.modelBMessages.length,
      history: conversationHistory.map(m => ({
        sender: m.sender,
        ts: m.timestamp,
        text: m.text.slice(0, 60)
      }))
    });

    try {
      // Make API call
      const response = await getLLMResponse(
        prevMessage,
        nextModelConfig,
        currentState.topic || '',
        currentState.maxTurns,
        conversationHistory
      );
      
      // Update state with response
      setState(prev => {
        if (!prev.isActive) {
          console.log('⏸️ Debate stopped during API call, discarding result');
          return {
            ...prev,
            isModelALoading: false,
            isModelBLoading: false,
          };
        }
        
        const newTurn = prev.currentTurn + 1;
        const newModelAMessages = isModelATurn ? [...prev.modelAMessages, response] : prev.modelAMessages;
        const newModelBMessages = !isModelATurn ? [...prev.modelBMessages, response] : prev.modelBMessages;
        
        // THIS IS CRITICAL - log the NEW state we just created
        console.log('📊 After adding message:', {
          turn: newTurn,
          modelACount: newModelAMessages.length,
          modelBCount: newModelBMessages.length,
          totalMessages: newModelAMessages.length + newModelBMessages.length
        });
        
        console.log(`✅ Auto-step turn ${newTurn} completed, waiting for typing animation...`);
        waitingForTypingRef.current = true; // Set the flag to wait for typing
        // Watchdog: auto-advance if typingComplete doesn't fire within 30s
        if (watchdogTimerRef.current) {
          clearTimeout(watchdogTimerRef.current);
          watchdogTimerRef.current = null;
        }
        watchdogTimerRef.current = setTimeout(() => {
          if (waitingForTypingRef.current) {
            console.warn('⚠️ Watchdog: typingComplete event did not fire within 30s, auto-advancing...');
            waitingForTypingRef.current = false;
            autoStepTimeoutRef.current = setTimeout(() => {
              processNextTurnRef.current?.();
            }, 1000);
          }
        }, 30000);
        
        const newState = {
          ...prev,
          currentTurn: newTurn,
          lastActiveModel: nextModelSide,
          modelAMessages: newModelAMessages,
          modelBMessages: newModelBMessages,
          isModelALoading: false,
          isModelBLoading: false,
        };
        
        // Update ref immediately so next turn sees the latest state
        debateStateRef.current = newState;
        
        return newState;
      });
      
    } catch (error) {
      console.error('💥 Error in auto-step:', error);
      setState(prev => ({
        ...prev,
        isModelALoading: false,
        isModelBLoading: false,
      }));
    }
  }, [getLLMResponse, setState]);

  // Keep a ref to the latest processNextTurn function
  useEffect(() => {
    processNextTurnRef.current = processNextTurn;
  });

  // SIMPLIFIED: Auto-stepping function that runs the debate to completion
  const runAutoStep = useCallback(async (initialTopic: string) => {
    console.log('🔄 Auto-step process started');
    processNextTurnRef.current?.();
  }, []);

  // REMOVED: stepTurn functionality - using simplified PLAY/STOP flow only

  // Start a new debate with a topic - SIMPLIFIED: Auto-runs until stopped or max turns
  // --- CHANGE 5 PART B: MODIFY STARTDEBATE SIGNATURE AND ADD SETTER ---
  const startDebate = useCallback(async (topic: string) => {
    console.log('🎬 STARTING DEBATE (SIMPLIFIED):', topic);
    clearAutoStep();
    
    setState(prev => ({
      ...prev,
      isActive: true,
      isPaused: false,
      currentTurn: 0,
      topic,
      modelAMessages: [],
      modelBMessages: [],
      lastActiveModel: null,
    }));

    // Start the auto-stepping process
    setTimeout(() => {
      console.log('🚀 Starting auto-stepping process...');
      runAutoStep(topic);
    }, 500);
  }, [clearAutoStep, runAutoStep]);

  // SIMPLIFIED: Stop debate - enables sliders and Oracle, ready for fresh start
  const stopDebate = useCallback(() => {
    console.log('🛑 STOP: Stopping debate - sliders and Oracle now available...');
    clearAutoStep();
    
    setState(prev => ({
      ...prev,
      isActive: false, // Mark as inactive - sliders become enabled
      isPaused: false, // No pause state - just stopped
      isModelALoading: false,
      isModelBLoading: false,
    }));
    
    console.log('✅ Debate stopped - adjust sliders and press PLAY for fresh start');
  }, [clearAutoStep]);

  // Set max turns
  const setMaxTurns = useCallback((turns: number) => {
    setState(prev => ({
      ...prev,
      maxTurns: turns,
    }));
  }, []);

  // PHASE B: New flexible model configuration actions
  const setModelA = useCallback((config: ModelConfiguration) => {
    setState(prev => ({
      ...prev,
      modelA: config,
    }));
  }, []);

  const setModelB = useCallback((config: ModelConfiguration) => {
    setState(prev => ({ ...prev, modelB: { ...prev.modelB, ...config } }));
  }, []);

  const setModelConfiguration = useCallback((modelA: ModelConfiguration, modelB: ModelConfiguration) => {
    setState(prev => ({
      ...prev,
      modelA,
      modelB,
    }));
  }, []);

  const swapModels = useCallback(() => {
    setState(prev => ({
      ...prev,
      modelA: prev.modelB,
      modelB: prev.modelA,
      // Optionally swap messages too
      modelAMessages: prev.modelBMessages,
      modelBMessages: prev.modelAMessages,
      // Flip last active model
      lastActiveModel: prev.lastActiveModel === 'A' ? 'B' : prev.lastActiveModel === 'B' ? 'A' : null,
    }));
  }, []);

  const randomizePersonalities = useCallback(() => {
    const generateRandomPersonalities = (): { modelA: ModelConfiguration; modelB: ModelConfiguration } => {
      const modelALevel = Math.floor(Math.random() * 11); // 0-10
      let modelBLevel;
      
      // 70% chance of asymmetric (difference >= 3)
      if (Math.random() < 0.7) {
        const minDiff = 3;
        const maxDiff = 10;
        const diff = minDiff + Math.floor(Math.random() * (maxDiff - minDiff + 1));
        
        modelBLevel = Math.random() < 0.5 
          ? Math.max(0, modelALevel - diff)  // Model B lower
          : Math.min(10, modelALevel + diff); // Model B higher
      } else {
        // 30% chance of similar levels for variety
        modelBLevel = Math.floor(Math.random() * 11);
      }
      
      // Randomly assign positions
      const positions = Math.random() < 0.5 
        ? { modelA: 'pro' as ModelPosition, modelB: 'con' as ModelPosition }
        : { modelA: 'con' as ModelPosition, modelB: 'pro' as ModelPosition };
        
      // Randomly assign extensiveness levels (1-5)
      const modelAExtensiveness = Math.floor(Math.random() * 5) + 1;
      const modelBExtensiveness = Math.floor(Math.random() * 5) + 1;
      
      return {
        modelA: { 
          ...state.modelA, // Keep existing model name
          agreeabilityLevel: modelALevel, 
          position: positions.modelA,
          extensivenessLevel: modelAExtensiveness
        },
        modelB: { 
          ...state.modelB, // Keep existing model name
          agreeabilityLevel: modelBLevel, 
          position: positions.modelB,
          extensivenessLevel: modelBExtensiveness
        }
      };
    };

    const newConfigs = generateRandomPersonalities();
    setModelConfiguration(newConfigs.modelA, newConfigs.modelB);
  }, [state.modelA, state.modelB, setModelConfiguration]);

  const setModelPersona = useCallback((model: 'A' | 'B', personaId: string | null) => {
    setState(prev => {
      const targetModelKey = model === 'A' ? 'modelA' : 'modelB';
      const currentModelConfig = prev[targetModelKey];

      if (!personaId) {
        // Clear persona AND reset sliders to neutral
        return {
          ...prev,
          [targetModelKey]: {
            ...currentModelConfig,
            personaId: undefined,
            stance: undefined, // Also clear deprecated stance
            agreeabilityLevel: 5,      // ← RESET TO NEUTRAL
            extensivenessLevel: 3       // ← RESET TO NEUTRAL
          }
        };
      }

      const persona = PERSONAS[personaId];
      if (!persona) return prev; // Persona not found, do nothing

      // Set persona AND update slider values to persona's fixed values
      return {
        ...prev,
        [targetModelKey]: {
          ...currentModelConfig,
          personaId,
          stance: undefined, // Ensure deprecated stance is cleared
          agreeabilityLevel: 10 - persona.lockedTraits.baseStubbornness,  // ← UPDATE
          extensivenessLevel: persona.lockedTraits.responseLength          // ← UPDATE
        }
      };
    });
  }, []);

  // THE ORACLE PHASE 1: Configurable analysis actions (adapted for flexible models)
  const requestOracleAnalysis = useCallback(async (config: OracleConfig) => {
    console.log('🔮 ORACLE: Starting analysis with config (FLEXIBLE):', config);
    
    setState(prev => ({
      ...prev,
      isOracleAnalyzing: true,
    }));

    try {
      const requestData = {
        topic: state.topic,
        // PHASE B: Use flexible model messages
        modelAMessages: state.modelAMessages,
        modelBMessages: state.modelBMessages,
        modelAName: state.modelA.name,
        modelBName: state.modelB.name,
        modelAPersonality: state.modelA,
        modelBPersonality: state.modelB,
        totalTurns: state.currentTurn,
        config,
        // LEGACY: Also include GPT/Claude for backward compatibility
        gptMessages: state.gptMessages,
        claudeMessages: state.claudeMessages,
        gptPersonality: state.personalityConfig.gpt,
        claudePersonality: state.personalityConfig.claude,
        accessCode: state.accessCode || undefined,
      };

      const response = await fetch('/api/debate/oracle', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });

      if (!response.ok) {
        throw new Error(`Oracle analysis failed: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.success && data.result) {
        console.log('✅ ORACLE: Analysis complete:', data.result);
        setState(prev => ({
          ...prev,
          oracleResults: [...prev.oracleResults, data.result],
          isOracleAnalyzing: false,
          queriesRemaining: data.queriesRemaining ?? prev.queriesRemaining,
        }));
      } else {
        throw new Error(data.error || 'Oracle analysis failed');
      }
    } catch (error) {
      console.error('❌ ORACLE ERROR:', error);
      setState(prev => ({
        ...prev,
        isOracleAnalyzing: false,
      }));
      throw error;
    }
  }, [state.topic, state.modelAMessages, state.modelBMessages, state.modelA, state.modelB, state.currentTurn, state.gptMessages, state.claudeMessages, state.personalityConfig]);

  const clearOracleResults = useCallback(() => {
    setState(prev => ({
      ...prev,
      oracleResults: [],
    }));
  }, []);

  // Export debate and Oracle analysis data
  const exportDebateData = useCallback(() => {
    const exportData = {
      metadata: {
        exportedAt: new Date().toISOString(),
        topic: state.topic,
        totalTurns: state.currentTurn,
        maxTurns: state.maxTurns,
        isActive: state.isActive,
        isPaused: state.isPaused
      },
      models: {
        modelA: {
          name: state.modelA.name,
          displayName: getModelDisplayName(state.modelA.name),
          configuration: state.modelA,
          messages: state.modelAMessages
        },
        modelB: {
          name: state.modelB.name,
          displayName: getModelDisplayName(state.modelB.name),
          configuration: state.modelB,
          messages: state.modelBMessages
        }
      },
      oracle: {
        totalAnalyses: state.oracleResults.length,
        results: state.oracleResults
      }
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const filename = `llm-arena-debate-${timestamp}.json`;
    
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    console.log(`📁 Debate exported as ${filename}`);
  }, [state]);

  // BACKWARD COMPATIBILITY: Legacy actions (deprecated)
  const setPersonalityConfig = useCallback((config: any) => {
    console.warn('⚠️ setPersonalityConfig is deprecated. Use setModelA/setModelB instead.');
    // Map legacy config to new flexible system
    if (config.gpt && config.claude) {
      setState(prev => ({
        ...prev,
        modelA: {
          ...prev.modelA,
          agreeabilityLevel: config.gpt.agreeabilityLevel,
          position: config.gpt.position,
        },
        modelB: {
          ...prev.modelB,
          agreeabilityLevel: config.claude.agreeabilityLevel,
          position: config.claude.position,
        },
      }));
    }
  }, []);

  const setModelPersonality = useCallback((model: 'gpt' | 'claude', personality: any) => {
    console.warn('⚠️ setModelPersonality is deprecated. Use setModelA/setModelB instead.');
    // Map legacy calls to new flexible system with updated model names
    setState(prev => {
      if (model === 'gpt' && (prev.modelA.name === 'gpt-4o' || prev.modelA.name === 'gpt-4o-mini')) {
        return {
          ...prev,
          modelA: {
            ...prev.modelA,
            agreeabilityLevel: personality.agreeabilityLevel,
            position: personality.position,
          },
        };
      } else if (model === 'claude' && prev.modelB.name === 'claude-3-5-sonnet-20241022') {
        return {
          ...prev,
          modelB: {
            ...prev.modelB,
            agreeabilityLevel: personality.agreeabilityLevel,
            position: personality.position,
          },
        };
      }
      return prev;
    });
  }, []);

  const setAgreeabilityLevel = useCallback((level: number) => {
    console.warn('⚠️ setAgreeabilityLevel is deprecated. Use setModelA/setModelB instead.');
    // Update both models for backward compatibility
    setState(prev => ({
      ...prev,
      modelA: { ...prev.modelA, agreeabilityLevel: level },
      modelB: { ...prev.modelB, agreeabilityLevel: level },
    }));
  }, []);

  const setPositionAssignment = useCallback((assignment: any) => {
    console.warn('⚠️ setPositionAssignment is deprecated. Use setModelA/setModelB instead.');
    // Map legacy assignment to new flexible system
    setState(prev => ({
      ...prev,
      modelA: {
        ...prev.modelA,
        position: assignment.gpt || prev.modelA.position,
      },
      modelB: {
        ...prev.modelB,
        position: assignment.claude || prev.modelB.position,
      },
    }));
  }, []);

  // 🐛 DEBUG: Log current state periodically
  useEffect(() => {
    const interval = setInterval(() => {
      console.log('💰 useDebate current state:', {
        isActive: state.isActive,
        currentTurn: state.currentTurn,
        topic: state.topic?.substring(0, 20) + '...'
      });
    }, 5000); // Log every 5 seconds

    return () => clearInterval(interval);
  }, [state.isActive, state.currentTurn]);

  return {
    // --- CHANGE 6: ADD NEW FUNCTIONS TO RETURN OBJECT ---
    ...state, // This already includes the new state variables
    // NEW: Flexible model actions
    startDebate,
    stopDebate,
    setMaxTurns,
    setModelA,
    setModelB,
    setModelConfiguration,
    swapModels,
    randomizePersonalities,
    setModelPersona,
    requestOracleAnalysis,
    clearOracleResults,
    exportDebateData,
    
    // BACKWARD COMPATIBILITY: Legacy actions
    setPersonalityConfig,
    setModelPersonality,
    setAgreeabilityLevel,
    setPositionAssignment,

    // Add the new functions
    setAccessCode,
    setQueriesRemaining,
  };
};