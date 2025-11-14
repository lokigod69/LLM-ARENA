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
import { useChatSession } from '@/hooks/useChatSession';
import { motion } from 'framer-motion';

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

  // Load auth state
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/auth/verify', {
          method: 'POST',
          credentials: 'include',
        });

        if (response.ok) {
          const data = await response.json();
          if (data.mode === 'admin') {
            setQueriesRemaining('Unlimited');
          } else if (data.mode === 'token' && data.remaining !== undefined) {
            setQueriesRemaining(data.remaining);
          }
        }
      } catch (error) {
        console.error('Failed to verify auth:', error);
      }
    };

    checkAuth();
  }, []);

  const handleBack = () => {
    router.push('/chat');
  };

  const handleSendMessage = async (content: string, extensiveness: number) => {
    await sendMessage(content, extensiveness);
  };

  return (
    <div className="min-h-screen bg-matrix-black text-matrix-text font-matrix-mono relative flex flex-col">
      {/* Matrix Rain Background */}
      <div className="fixed inset-0 z-0 overflow-hidden">
        <MatrixRain />
      </div>

      {/* Header */}
      <ChatHeader queriesRemaining={queriesRemaining} onBack={handleBack} />

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
              className="w-full py-2 px-4 rounded-lg bg-matrix-green/20 hover:bg-matrix-green/30 border border-matrix-green/50 text-matrix-green font-matrix text-sm transition-colors disabled:opacity-50"
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
  );
}

