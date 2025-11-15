// Active Chat Session Page
// Main chat interface for conversations
//
// Phase 1 Changes (Header Redesign):
// - Added "MATRIX ARENA" link (navigates to /)
// - Removed redundant back arrow button
// - Replaced "Change →" with "Change Character" button
// - Added "CONFIGURATION ▼" button (modal implementation in Phase 2)
// - Added chat badge (💬) to indicate current section
// - Reduced persona avatar size from 64px to 40px
// - Added Response Depth display next to model name (e.g., "GPT-5 Nano (3/5)")
// - Removed queries remaining from header (will move to config modal in Phase 2)
// - Improved responsive layout with max-w-7xl container
//
// Phase 2 Changes (Configuration Modal):
// - Created ConfigurationModal component (centered overlay)
// - Removed collapsible ChatConfiguration panel from main layout
// - Added backdrop with blur effect (z-200)
// - Added modal animations (Framer Motion)
// - Added ESC key handler for closing modal
// - Moved queries remaining display into modal
// - Added body scroll lock when modal is open
//
// Phase 3 Changes (Layout State Machine):
// - Defined ChatLayoutState type ('empty' | 'first-message' | 'conversation')
// - Created LayoutConfig interface for layout configuration
// - Implemented getLayoutState() function (based on message count)
// - Implemented getLayoutConfig() function (returns config for each state)
// - Added layoutState state variable
// - Added useEffect to update layout state when messages change
// - Layout configs ready for Phase 4 (empty state) and Phase 5 (input transitions)
//
// Phase 4 Changes (Empty State with Avatar):
// - Implemented conditional rendering: empty state vs conversation layout
// - Added large centered avatar (120-200px responsive)
// - Added persona name, era, and quote display
// - Added fade-out animation for avatar (AnimatePresence)
// - Added hover effect on avatar (scale 1.05)
// - Centered input in empty state
// - Added backward compatibility check (skip empty if messages exist on mount)

'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import ChatHeader from '@/components/chat/ChatHeader';
import ConfigurationModal from '@/components/chat/ConfigurationModal';
import ChatMessageList from '@/components/chat/ChatMessageList';
import ChatInput from '@/components/chat/ChatInput';
import MatrixRain from '@/components/MatrixRain';
import AccessCodeModal from '@/components/AccessCodeModal';
import { useChatSession } from '@/hooks/useChatSession';
import { motion, AnimatePresence } from 'framer-motion';
import { PERSONAS, getPersonaPortraitPaths } from '@/lib/personas';
import { getModelDisplayName } from '@/lib/modelConfigs';

export default function ChatSessionPage() {
  const router = useRouter();
  const params = useParams();
  const urlSessionId = params.sessionId as string;

  const {
    sessionId: currentSessionId,
    isLoading,
    configuration,
    messages,
    nextMessageExtensiveness,
    error,
    sendMessage,
    updateConfiguration,
    setNextMessageExtensiveness,
    clearError,
    retryLastMessage,
  } = useChatSession();

  const [queriesRemaining, setQueriesRemaining] = useState<number | string>('...');
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [appIsLoading, setAppIsLoading] = useState(true);
  // Phase 2: Configuration modal state
  const [configModalOpen, setConfigModalOpen] = useState(false);
  
  // Phase 3: Layout State Machine
  type ChatLayoutState = 'empty' | 'first-message' | 'conversation';
  
  interface LayoutConfig {
    showCenteredAvatar: boolean;
    avatarSize: 'large' | 'small' | 'none';
    inputPosition: 'centered' | 'bottom-fixed';
    inputWidth: 'narrow' | 'wide' | 'full';
    messagesContainerClass: string;
    inputContainerClass: string;
  }
  
  const getLayoutState = (messageCount: number): ChatLayoutState => {
    if (messageCount === 0) return 'empty';
    if (messageCount === 1) return 'first-message';
    return 'conversation';
  };
  
  const getLayoutConfig = (layoutState: ChatLayoutState): LayoutConfig => {
    switch (layoutState) {
      case 'empty':
        return {
          showCenteredAvatar: true,
          avatarSize: 'large',
          inputPosition: 'centered',
          inputWidth: 'narrow',
          messagesContainerClass: 'hidden',
          inputContainerClass: 'flex items-center justify-center h-full',
        };
      case 'first-message':
        return {
          showCenteredAvatar: false,
          avatarSize: 'none',
          inputPosition: 'bottom-fixed',
          inputWidth: 'wide',
          messagesContainerClass: 'flex-1 overflow-y-auto p-4',
          inputContainerClass: 'border-t border-matrix-green/30',
        };
      case 'conversation':
        return {
          showCenteredAvatar: false,
          avatarSize: 'none',
          inputPosition: 'bottom-fixed',
          inputWidth: 'full',
          messagesContainerClass: 'flex-1 overflow-y-auto p-4',
          inputContainerClass: 'border-t border-matrix-green/30',
        };
    }
  };
  
  const [layoutState, setLayoutState] = useState<ChatLayoutState>('empty');
  
  // Update layout state when messages change
  useEffect(() => {
    const newState = getLayoutState(messages.length);
    setLayoutState(newState);
  }, [messages.length]);
  
  // Phase 4: Skip empty state if messages exist on mount (backward compatibility)
  useEffect(() => {
    if (messages.length > 0 && layoutState === 'empty') {
      const newState = getLayoutState(messages.length);
      setLayoutState(newState);
    }
  }, []); // Run once on mount
  
  const layoutConfig = getLayoutConfig(layoutState);

  // Check authentication on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/auth/verify', {
          method: 'POST',
          credentials: 'include',
        });

        if (response.ok) {
          const data = await response.json();
          setIsUnlocked(true);
          if (data.mode === 'admin') {
            setQueriesRemaining('Unlimited');
          } else if (data.mode === 'token' && data.remaining !== undefined) {
            setQueriesRemaining(data.remaining);
          }
        } else {
          setIsUnlocked(false);
        }
      } catch (error) {
        console.error('Failed to verify auth:', error);
        setIsUnlocked(false);
      } finally {
        setAppIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  // Show access code modal on auth errors
  useEffect(() => {
    if (error?.type === 'auth' && !isUnlocked) {
      setIsUnlocked(false);
    }
  }, [error, isUnlocked]);

  const handleCodeVerified = (authState: { mode: 'admin' | 'token'; remaining?: number; allowed?: number; code?: string; token?: string }) => {
    setIsUnlocked(true);
    if (authState.mode === 'admin') {
      setQueriesRemaining('Unlimited');
    } else if (authState.mode === 'token' && authState.remaining !== undefined) {
      setQueriesRemaining(authState.remaining);
    }
    setAppIsLoading(false);
    clearError(); // Clear any auth errors
  };

  // Removed handleBack - no longer needed (redundant with Change Character button)

  const handleSendMessage = async (content: string, extensiveness: number) => {
    await sendMessage(content, extensiveness);
  };

  const persona = PERSONAS[configuration.personaId];
  const portraitPaths = getPersonaPortraitPaths(configuration.personaId);
  const portraitSrc = portraitPaths?.primary || persona?.portrait;

  if (appIsLoading && !isUnlocked) {
    return (
      <div className="min-h-screen bg-matrix-black text-matrix-text font-matrix-mono flex items-center justify-center">
        <p>Loading Interface...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-matrix-black text-matrix-text font-matrix-mono relative flex flex-col">
      {/* Access Code Modal */}
      <AnimatePresence>
        {!isUnlocked && <AccessCodeModal onVerified={handleCodeVerified} setAppIsLoading={setAppIsLoading} />}
      </AnimatePresence>

      {/* Matrix Rain Background */}
      <div className="fixed inset-0 z-0 overflow-hidden">
        <MatrixRain />
      </div>

      {/* Header with Persona Display - Phase 1 Redesign */}
      <div className="sticky top-0 z-50 border-b border-matrix-green-dark bg-gradient-to-r from-matrix-black via-matrix-dark to-matrix-black backdrop-blur-sm">
        <div className="flex items-center justify-between p-4 max-w-7xl mx-auto">
          {/* Left: Navigation to Matrix Arena */}
          <Link
            href="/"
            className="flex items-center gap-2 text-matrix-green hover:text-matrix-green-dim transition-colors cursor-pointer"
          >
            <span className="text-xl">🎭</span>
            <span className="font-matrix font-bold tracking-wider hidden sm:inline">
              MATRIX ARENA
            </span>
          </Link>

          {/* Center: Persona + Model + Response Depth */}
          <div className="flex items-center gap-2 sm:gap-3">
            {persona && (
              <>
                <img
                  src={portraitSrc}
                  alt={persona.name}
                  onError={(e) => {
                    const fallbackSrc = portraitPaths?.fallback || persona.portrait;
                    if (e.currentTarget.src !== fallbackSrc) {
                      e.currentTarget.src = fallbackSrc || '/personas/A1.jpeg';
                    } else {
                      e.currentTarget.src = '/personas/A1.jpeg';
                      e.currentTarget.onerror = null;
                    }
                  }}
                  className="w-8 h-8 sm:w-10 sm:h-10 rounded-full border-2 border-matrix-green flex-shrink-0"
                />
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm font-matrix font-bold text-matrix-green truncate">
                    {persona.name.toUpperCase()}
                  </p>
                  <p className="text-[10px] sm:text-xs text-matrix-green-dim truncate">
                    {getModelDisplayName(configuration.modelName)} ({configuration.defaultExtensiveness}/5)
                  </p>
                </div>
              </>
            )}
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-3">
            {/* Configuration Button (triggers modal in Phase 2) */}
            <button
              onClick={() => setConfigModalOpen(true)}
              className="text-xs font-matrix text-matrix-green/70 hover:text-matrix-green transition-colors px-3 py-1 border border-matrix-green/30 rounded hover:border-matrix-green/50 cursor-pointer"
            >
              CONFIGURATION ▼
            </button>

            {/* Chat Badge (current section indicator) */}
            <span className="text-lg" title="Character Chat">💬</span>

            {/* Change Character Button */}
            <button
              onClick={() => router.push('/chat')}
              className="text-xs font-matrix text-matrix-green/70 hover:text-matrix-green transition-colors cursor-pointer"
            >
              Change Character
            </button>
          </div>
        </div>
      </div>

      {/* Configuration Modal (Phase 2) */}
      <ConfigurationModal
        isOpen={configModalOpen}
        onClose={() => setConfigModalOpen(false)}
        configuration={configuration}
        onConfigurationChange={updateConfiguration}
        personaId={configuration.personaId}
        queriesRemaining={queriesRemaining}
      />

      {/* Main Chat Container - Centered and Constrained */}
      <div className="relative z-10 flex-1 flex flex-col max-w-5xl mx-auto w-full">
        {/* Phase 4: Empty State with Large Centered Avatar */}
        {layoutState === 'empty' ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="flex-1 flex flex-col items-center justify-center p-4 sm:p-8"
          >
            {/* Large Centered Avatar */}
            <AnimatePresence>
              {layoutConfig.showCenteredAvatar && (
                <motion.div
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.3, ease: 'easeOut' }}
                  className="flex flex-col items-center mb-8 sm:mb-12"
                >
                  <motion.img
                    src={portraitSrc}
                    alt={persona?.name || 'Unknown'}
                    onError={(e) => {
                      const fallback = portraitPaths?.fallback || '/personas/A1.jpeg';
                      if (e.currentTarget.src !== fallback) {
                        e.currentTarget.src = fallback;
                      } else {
                        e.currentTarget.src = '/personas/A1.jpeg';
                        e.currentTarget.onerror = null;
                      }
                    }}
                    className="w-32 h-32 sm:w-40 sm:h-40 lg:w-48 lg:h-48 
                               rounded-full border-4 border-matrix-green 
                               shadow-xl shadow-matrix-green/50
                               object-cover"
                    whileHover={{ scale: 1.05 }}
                    transition={{ duration: 0.2 }}
                  />
                  
                  <h2 className="text-2xl sm:text-3xl font-matrix font-bold text-matrix-green 
                                 mt-6 tracking-wider">
                    {persona?.name.toUpperCase() || 'UNKNOWN'}
                  </h2>
                  
                  {persona?.era && (
                    <p className="text-sm text-matrix-green-dim mt-2 text-center">
                      {persona.era}
                    </p>
                  )}
                  
                  {persona?.quote && (
                    <p className="text-sm text-matrix-green/70 mt-4 italic text-center 
                                  max-w-md px-4">
                      &ldquo;{persona.quote}&rdquo;
                    </p>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Centered Input */}
            <motion.div
              layout
              className="w-full max-w-[90%] sm:max-w-md"
            >
              <ChatInput
                onSendMessage={handleSendMessage}
                extensiveness={nextMessageExtensiveness}
                onExtensivenessChange={setNextMessageExtensiveness}
                isLoading={isLoading}
              />
            </motion.div>
          </motion.div>
        ) : (
          <>
            {/* Conversation Layout (first-message or conversation state) */}
            {/* Message List */}
            <div className={`${layoutConfig.messagesContainerClass} relative z-10`}>
              <ChatMessageList
                messages={messages}
                isLoading={isLoading}
                error={error}
                modelName={configuration.modelName}
                personaId={configuration.personaId}
                onRetry={retryLastMessage}
                onDismissError={clearError}
              />
            </div>

            {/* Input Area */}
            <div className={`${layoutConfig.inputContainerClass} relative z-10`}>
              <ChatInput
                onSendMessage={handleSendMessage}
                extensiveness={nextMessageExtensiveness}
                onExtensivenessChange={setNextMessageExtensiveness}
                isLoading={isLoading}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

