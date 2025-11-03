// PHASE B: Main page component for LLM Arena debate platform - FLEXIBLE MODEL SUPPORT
// Enhanced with Model A vs Model B selection with exact API model names
// Uses exact API names: gpt-4o, gpt-4o-mini, claude-3-5-sonnet-20241022, deepseek-r1, deepseek-v3,
// gemini-2.5-flash-preview-05-06, gemini-2.5-pro-preview-05-06
// Maintains Matrix cyberpunk theme while adding complete model flexibility
// Backward compatibility maintained for existing functionality
// Enhanced UI with new model selector and personality controls
// UI/UX FIXES: Added cursor-pointer class to Oracle Analysis button

'use client'; // Required for useAuth and useState

import { useState } from 'react';
import PromptInput from '@/components/PromptInput';
import ChatColumn from '@/components/ChatColumn';
import ControlPanel from '@/components/ControlPanel';
import MatrixRain from '@/components/MatrixRain';
import TypewriterText from '@/components/TypewriterText';
import InitialPrompt from '@/components/InitialPrompt';
import DualPersonalitySlider from '../components/DualPersonalitySlider';
import EnhancedModelSelector from '@/components/EnhancedModelSelector';
import OraclePanel from '@/components/OraclePanel';
import { useDebate } from '@/hooks/useDebate';
import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getModelDisplayName, getModelColor } from '@/lib/modelConfigs';
import type { OracleConfig } from '../types/oracle';
import MarkButton from '@/components/MarkButton';
import PersonaSelector from '@/components/PersonaSelector';
import AgreeabilitySlider from '@/components/AgreeabilitySlider';
import PositionSelector from '@/components/PositionSelector';
import AccessCodeModal from '@/components/AccessCodeModal';
import { AdminPanel } from '@/components/AdminPanel';
import Link from 'next/link';

export default function Home() {
  
  // NEW: State for access control
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [queriesRemaining, setQueriesRemaining] = useState<number | string>('...');
  const [appIsLoading, setAppIsLoading] = useState(true);

  // Oracle collapsible state
  const [isOracleVisible, setIsOracleVisible] = useState(false);
  const [isPersonaSelectionOpen, setPersonaSelectionOpen] = useState(false);
  
  // Use the centralized debate hook with NEW FLEXIBLE SYSTEM
  const {
    // NEW: Flexible model state
    isActive: isDebateActive,
    isPaused,
    currentTurn,
    maxTurns,
    topic,
    modelA,
    modelB,
    modelAMessages,
    modelBMessages,
    isModelALoading,
    isModelBLoading,
    startDebate,
    stopDebate,
    setMaxTurns,
    setModelA,
    setModelB,
    setModelConfiguration,
    swapModels,
    randomizePersonalities,
    // Oracle functionality
    oracleResults,
    isOracleAnalyzing,
    requestOracleAnalysis,
    clearOracleResults,
    exportDebateData,
    // BACKWARD COMPATIBILITY: Legacy state for existing components
    gptMessages,
    claudeMessages,
    isGptLoading,
    isClaudeLoading,
    positionAssignment,
    setPositionAssignment,
    personalityConfig,
    setModelPersonality,
    setModelPersona,
  } = useDebate();
  
  // DIAGNOSTIC: Log current model configuration
  console.log('🎯 PAGE.TSX MODEL CONFIG:', {
    modelA: {
      name: modelA.name,
      displayName: getModelDisplayName(modelA.name),
      position: modelA.position
    },
    modelB: {
      name: modelB.name,
      displayName: getModelDisplayName(modelB.name),
      position: modelB.position
    }
  });

  const modelAChatScrollRef = useRef<HTMLDivElement>(null);
  const modelBChatScrollRef = useRef<HTMLDivElement>(null);

  // PHASE 1 FIX: On initial load, check for existing auth cookies
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/auth/verify', {
          method: 'POST',
          credentials: 'include', // Include cookies
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.mode === 'admin') {
            setIsAdmin(true);
            handleCodeVerified({ mode: 'admin' });
            return;
          } else if (data.mode === 'token' && data.remaining !== undefined) {
            setIsAdmin(false);
            handleCodeVerified({
              mode: 'token',
              remaining: data.remaining,
              allowed: data.allowed
            });
            return;
          }
        }
      } catch (error) {
        console.error('Failed to verify auth:', error);
      }
      
      // No valid auth found - show login modal
      setAppIsLoading(false);
    };
    
    checkAuth();
  }, []);

  // PHASE 1: Periodic query verification - poll every 30 seconds
  useEffect(() => {
    if (!isUnlocked || queriesRemaining === 'Unlimited') return;
    
    const verifyQueries = async () => {
      try {
        const response = await fetch('/api/auth/verify', {
          method: 'POST',
          credentials: 'include'
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.mode === 'token' && data.remaining !== undefined) {
            setIsAdmin(false);
            setQueriesRemaining(data.remaining);
          } else if (data.mode === 'admin') {
            setIsAdmin(true);
            setQueriesRemaining('Unlimited');
          }
        }
      } catch (error) {
        console.error('Failed to verify queries:', error);
      }
    };
    
    // Verify immediately, then every 30 seconds
    verifyQueries();
    const interval = setInterval(verifyQueries, 30000); // Every 30 seconds
    
    return () => clearInterval(interval);
  }, [isUnlocked, queriesRemaining]);

  const handleCodeVerified = (authState: { mode: 'admin' | 'token'; remaining?: number; allowed?: number }) => {
    setIsUnlocked(true);
    if (authState.mode === 'admin') {
      setIsAdmin(true);
      setQueriesRemaining('Unlimited');
    } else if (authState.mode === 'token' && authState.remaining !== undefined) {
      setIsAdmin(false);
      setQueriesRemaining(authState.remaining);
    }
    setAppIsLoading(false);
  };

  // Enable Mock Mode explicitly on component mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('MOCK_MODE', 'false');
      console.log('🔗 REAL API MODE ENABLED: Using actual API calls');
      console.log('💰 DEBUG: Real API mode activated for live token tracking');
    }
  }, []);

  const scrollToBottom = (ref: React.RefObject<HTMLDivElement | null>) => {
    if (ref.current) {
      ref.current.scrollTop = ref.current.scrollHeight;
    }
  };

  // PHASE B: Updated scroll effects for flexible model messages
  useEffect(() => {
    scrollToBottom(modelAChatScrollRef);
  }, [modelAMessages]);

  useEffect(() => {
    scrollToBottom(modelBChatScrollRef);
  }, [modelBMessages]);

  const handleStartDebate = async (newTopic: string) => {
    if (!isUnlocked) {
      alert("Access not verified. Please enter a valid access code.");
      return;
    }
    
    // PHASE 1: Pre-flight check - verify queries before starting debate
    const isAdmin = typeof queriesRemaining === 'string' && queriesRemaining === 'Unlimited';
    if (!isAdmin && typeof queriesRemaining === 'number' && queriesRemaining <= 0) {
      alert("No queries remaining. Please contact administrator for more access.");
      return;
    }
    
    console.log("New debate topic submitted:", newTopic);
    await startDebate(newTopic);
  };

  const enableMockMode = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('MOCK_MODE', 'true');
      console.log('🎭 Mock mode enabled for Oracle testing');
      alert('Mock mode enabled! Oracle will now work without API keys.');
    }
  };

  const handleExportData = async () => {
    await exportDebateData();
  };

  if (appIsLoading && !isUnlocked) {
    return (
      <div className="min-h-screen bg-matrix-black text-matrix-text font-matrix-mono flex items-center justify-center">
        <p>Loading Interface...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-matrix-black text-matrix-text font-matrix-mono relative overflow-hidden">
      <AnimatePresence>
        {!isUnlocked && <AccessCodeModal onVerified={handleCodeVerified} setAppIsLoading={setAppIsLoading} />}
      </AnimatePresence>

      {/* Admin Panel - Only visible when logged in as admin */}
      {isUnlocked && isAdmin && <AdminPanel />}

      {/* Matrix Rain Background */}
      <div className="absolute inset-0 z-0">
        <MatrixRain />
      </div>
      
      {/* Main Container */}
      <div className="relative z-10 flex flex-col min-h-screen">
        {/* Header - Matrix Style */}
        <motion.header 
          className="sticky top-0 z-50 relative border-b border-matrix-green-dark bg-gradient-to-r from-matrix-black via-matrix-dark to-matrix-black backdrop-blur-sm"
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-matrix-green to-transparent opacity-10"></div>
          <div className="relative flex justify-between items-center p-6">
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3, duration: 0.8 }}
              className="flex items-center gap-3"
            >
              {/* Logo image */}
              <img src="/assets/logo.png" alt="LLM Arena Logo" className="h-10 w-10 rounded-full shadow-lg border-2 border-matrix-green bg-matrix-black" style={{ objectFit: 'cover' }} />
              <div>
                <h1 className="text-3xl font-matrix font-black matrix-title">
                  <TypewriterText 
                    text="LLM ARENA" 
                    speed={100}
                    className="text-matrix-green drop-shadow-lg"
                  />
                </h1>
                <p className="text-sm text-matrix-green-dim mt-1 font-matrix">
                  <TypewriterText 
                    text="Neural Network Debate Platform" 
                    speed={50}
                    startDelay={1200}
                    className="opacity-80"
                  />
                </p>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5, duration: 0.8 }}
              className="text-right flex items-center gap-6"
            >
              <div>
                <p className="text-xs text-matrix-green-dim">QUERIES REMAINING</p>
                <p className="text-sm text-matrix-text font-matrix">{queriesRemaining}</p>
              </div>
              <Link href="/library" className="inline-flex items-center justify-center rounded-full bg-matrix-green/10 hover:bg-matrix-green/30 transition-colors p-2 ml-2" title="Open Library" style={{ fontSize: 28 }}>
                <span role="img" aria-label="Library">📚</span>
              </Link>
            </motion.div>
          </div>
        </motion.header>

        {/* PHASE B: Enhanced Model Selection & Configuration Section */}
        <motion.section 
          className="relative p-8"
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.8 }}
        >
          <div className="max-w-5xl mx-auto">
            {/* Unified Model Selection Matrix */}
            <EnhancedModelSelector
              modelA={modelA}
              modelB={modelB}
              onModelAChange={setModelA}
              onModelBChange={setModelB}
              disabled={isDebateActive}
            />

            {/* Persona Selectors */}
            <div className="mt-8">
              <motion.div 
                className="relative flex justify-center items-center cursor-pointer p-4 rounded-lg border border-matrix-green/30 bg-matrix-dark/50"
                onClick={() => setPersonaSelectionOpen(!isPersonaSelectionOpen)}
              >
                <h3 className="text-2xl font-matrix text-matrix-green tracking-wider">
                  Personas
                </h3>
                <motion.div
                  className="absolute right-4"
                  animate={{ rotate: isPersonaSelectionOpen ? 180 : 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-matrix-green">
                    <polyline points="6 9 12 15 18 9"></polyline>
                  </svg>
                </motion.div>
              </motion.div>

              <AnimatePresence>
                {isPersonaSelectionOpen && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3 }}
                    className="overflow-hidden"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                      <PersonaSelector
                        title="Persona A"
                        selectedPersonaId={modelA.personaId || null}
                        onSelectPersona={(id: string | null) => setModelA({ ...modelA, personaId: id ?? undefined })}
                      />
                      <PersonaSelector
                        title="Persona B"
                        selectedPersonaId={modelB.personaId || null}
                        onSelectPersona={(id: string | null) => setModelB({ ...modelB, personaId: id ?? undefined })}
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Integrated Sliders - No longer disabled by persona selection */}
            <div className='mt-8'>
              <DualPersonalitySlider
                modelA={modelA}
                modelB={modelB}
                onModelAChange={setModelA}
                onModelBChange={setModelB}
                disabled={isDebateActive}
              />
            </div>
          </div>
        </motion.section>

        {/* Debate Control Panel - MOVED HERE (was after topic input) */}
        <motion.section 
          className="relative p-8"
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.0, duration: 0.8 }}
        >
          <div className="max-w-5xl mx-auto">
            <ControlPanel
              isDebateActive={isDebateActive}
              maxTurns={maxTurns}
              onMaxTurnsChange={setMaxTurns}
            />
          </div>
        </motion.section>

        {/* Topic Input Section - MOVED HERE (was before control panel) */}
        <motion.section 
          className="relative p-8"
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.2, duration: 0.8 }}
        >
          <div className="max-w-5xl mx-auto">
            <div className="matrix-panel p-6 rounded-lg">
              <div className="text-center mb-6">
                <span className="text-2xl font-matrix font-bold text-matrix-green mb-3 block tracking-widest">
                  Input
                </span>
              </div>
              
              <PromptInput 
                onSubmitTopic={handleStartDebate}
                onStop={stopDebate}
                isLoading={isModelALoading || isModelBLoading}
                isDebateActive={isDebateActive}
                queriesRemaining={queriesRemaining}
                isAdmin={typeof queriesRemaining === 'string' && queriesRemaining === 'Unlimited'}
              />
            </div>
          </div>
        </motion.section>

        {/* REDESIGN: Initial Prompt Display - Elegant white/silver section */}
        <InitialPrompt
          topic={topic}
          isActive={isDebateActive}
        />

        {/* Main Arena - Split Screen */}
        <motion.main 
          className="flex-grow flex flex-col lg:flex-row gap-6 p-6 relative border-y border-matrix-green-dark"
          style={{
            maskImage: 'linear-gradient(to right, transparent 0px, black 40px, black calc(100% - 40px), transparent 100%)',
            WebkitMaskImage: 'linear-gradient(to right, transparent 0px, black 40px, black calc(100% - 40px), transparent 100%)',
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2, duration: 1 }}
        >
          {/* Model A Arena */}
          <motion.div 
            className="flex-1 relative"
            initial={{ x: -100, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 1.5, duration: 0.8 }}
          >
            <div className="matrix-panel h-full rounded-lg overflow-hidden bg-matrix-black">
              <div className="relative">
                <div 
                  className="absolute inset-0 opacity-20 animate-pulse"
                  style={{ background: `linear-gradient(to right, ${getModelColor(modelA.name)}, transparent)` }}
                ></div>
                <ChatColumn 
                  ref={modelAChatScrollRef} 
                  messages={modelAMessages} 
                  modelName={getModelDisplayName(modelA.name)} 
                  isLoading={isModelALoading}
                  actualModelName={modelA.name}
                  modelColor={getModelColor(modelA.name)}
                  personaId={modelA.personaId}
                />
              </div>
            </div>
          </motion.div>

          {/* ARENA Battle Zone - RESTRUCTURED for new layout */}
          <motion.div 
            className="flex flex-col items-center justify-center lg:w-48 relative space-y-4"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 2, duration: 0.5 }}
          >
            {/* 1. ARENA Title (Top, Largest) */}
            <motion.div
              className="relative text-center"
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 2.2, duration: 0.6 }}
            >
              <div className="text-4xl font-matrix font-black text-matrix-green tracking-widest relative">
                ARENA
                <div className="absolute inset-0 text-4xl font-matrix font-black text-matrix-green blur-sm animate-matrix-pulse opacity-60">
                  ARENA
                </div>
              </div>
            </motion.div>

            {/* 2. Controls Group (Mark & Analyze) */}
            <AnimatePresence>
              {(!isDebateActive && (modelAMessages.length > 0 || modelBMessages.length > 0)) && (
                <motion.div
                  className="w-full space-y-3"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                  transition={{ duration: 0.5 }}
                >
                  {/* Mark Box */}
                  <div className="flex flex-col items-center p-2 border border-white/20 rounded-lg">
                    <MarkButton item={{
                      topic,
                      modelA,
                      modelB,
                      modelAMessages,
                      modelBMessages,
                      oracleResults
                    }} />
                    <div className="text-xs text-matrix-green-dim font-matrix mt-1">
                      Mark Debate
                    </div>
                  </div>
                  
                  {/* Analysis Box */}
                  <button
                    onClick={() => setIsOracleVisible(!isOracleVisible)}
                    className="w-full flex flex-col items-center gap-2 p-3 border border-purple-500/50 rounded-lg bg-purple-900/20 hover:bg-purple-900/40 transition-colors cursor-pointer"
                  >
                    <span role="img" aria-label="analyze" className="text-2xl">🔮</span>
                    <span className="font-matrix text-purple-300">Analysis</span>
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* 3. VS (Floating, smaller) */}
            <motion.div 
              className="relative py-2" // Added padding for spacing
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 2.6, duration: 0.7 }}
            >
              <div className="text-3xl font-matrix font-black text-matrix-green animate-matrix-glow relative">
                VS
              </div>
            </motion.div>
            
            {/* 4. Audio Player (Framed) */}
            <div className="w-full p-3 border border-matrix-green/50 rounded-lg bg-matrix-dark/30">
              {/* Audio player removed */}
            </div>
          </motion.div>

          {/* Model B Arena */}
          <motion.div 
            className="flex-1 relative"
            initial={{ x: 100, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 1.5, duration: 0.8 }}
          >
            <div className="matrix-panel h-full rounded-lg overflow-hidden bg-matrix-black">
              <div className="relative">
                <div 
                  className="absolute inset-0 opacity-20 animate-matrix-scan"
                  style={{ background: `linear-gradient(to left, ${getModelColor(modelB.name)}, transparent)` }}
                ></div>
                <ChatColumn 
                  ref={modelBChatScrollRef} 
                  messages={modelBMessages} 
                  modelName={getModelDisplayName(modelB.name)} 
                  isLoading={isModelBLoading}
                  actualModelName={modelB.name}
                  modelColor={getModelColor(modelB.name)}
                  personaId={modelB.personaId}
                />
              </div>
            </div>
          </motion.div>
        </motion.main>

        {/* Oracle Matrix Panel - Now conditionally rendered based on state */}
        <AnimatePresence>
          {isOracleVisible && (
            <motion.section 
              className="relative p-8"
              initial={{ opacity: 0, y: -50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -50 }}
              transition={{ duration: 0.5 }}
            >
              <div className="max-w-5xl mx-auto">
                <OraclePanel
                  isDebateActive={isDebateActive}
                  isAnalyzing={isOracleAnalyzing}
                  results={oracleResults}
                  onAnalyze={requestOracleAnalysis}
                  onClearResults={clearOracleResults}
                  onExportData={exportDebateData}
                  hasMessages={modelAMessages.length > 0 || modelBMessages.length > 0}
                  isPaused={isPaused}
                />
              </div>
            </motion.section>
          )}
        </AnimatePresence>

        {/* Footer */}
        <motion.footer 
          className="border-t border-matrix-green-dark bg-matrix-black p-4 text-center"
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 2.5, duration: 0.8 }}
        >
          <p className="text-xs text-matrix-green-dim font-matrix">
            <TypewriterText 
              text="NEURAL NETWORK ARENA v1.0 - POWERED BY MATRIX PROTOCOL" 
              speed={30}
              startDelay={3000}
            />
          </p>
        </motion.footer>
      </div>
    </div>
  );
}
