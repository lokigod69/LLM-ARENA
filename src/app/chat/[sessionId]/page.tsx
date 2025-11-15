// Active Chat Session Page
// Main chat interface for conversations

'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import ChatHeader from '@/components/chat/ChatHeader';
import ChatConfiguration from '@/components/chat/ChatConfiguration';
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
    saveSession,
  } = useChatSession();

  const [queriesRemaining, setQueriesRemaining] = useState<number | string>('...');
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [appIsLoading, setAppIsLoading] = useState(true);

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

  const handleBack = () => {
    router.push('/chat');
  };

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

      {/* Header with Persona Display */}
      <div className="sticky top-0 z-50 border-b border-matrix-green-dark bg-gradient-to-r from-matrix-black via-matrix-dark to-matrix-black backdrop-blur-sm">
        <div className="flex items-center justify-between p-4">
          {/* Left: Persona Info */}
          <div className="flex items-center gap-4">
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
                  className="w-16 h-16 rounded-full border-2 border-matrix-green flex-shrink-0"
                />
                <div>
                  <h2 className="text-xl font-matrix font-bold text-matrix-green">
                    {persona.name.toUpperCase()}
                  </h2>
                  <p className="text-sm text-matrix-green-dim">
                    {getModelDisplayName(configuration.modelName)}
                  </p>
                </div>
              </>
            )}
            <button
              onClick={handleBack}
              className="text-matrix-green hover:text-matrix-green-dim transition-colors text-xl ml-4 cursor-pointer"
            >
              ←
            </button>
          </div>

          {/* Right: Queries Remaining */}
          <div className="text-right">
            <p className="text-xs text-matrix-green-dim">QUERIES REMAINING</p>
            <p className="text-sm text-matrix-text font-matrix">{queriesRemaining}</p>
          </div>
        </div>
      </div>

      {/* Main Chat Container - Centered and Constrained */}
      <div className="relative z-10 flex-1 flex flex-col max-w-5xl mx-auto w-full">
        {/* Configuration Panel */}
        <div className="relative z-10">
          <ChatConfiguration
            configuration={configuration}
            onConfigurationChange={updateConfiguration}
          />
          {/* Save Session Button */}
          {messages.length > 0 && (
            <div className="border-b border-matrix-green/30 bg-matrix-dark p-2">
              <motion.button
                onClick={saveSession}
                disabled={isLoading}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="w-full py-2 px-4 rounded-lg bg-matrix-green/20 hover:bg-matrix-green/30 border border-matrix-green/50 text-matrix-green font-matrix text-sm transition-colors disabled:opacity-50 cursor-pointer"
              >
                💾 SAVE SESSION
              </motion.button>
            </div>
          )}
        </div>

        {/* Message List */}
        <div className="flex-1 overflow-hidden relative z-10">
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
        <div className="relative z-10">
          <ChatInput
            onSendMessage={handleSendMessage}
            extensiveness={nextMessageExtensiveness}
            onExtensivenessChange={setNextMessageExtensiveness}
            isLoading={isLoading}
          />
        </div>
      </div>
    </div>
  );
}

