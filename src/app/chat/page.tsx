// Character Chat Landing Page
// Displays persona grid for selection

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import ChatHeader from '@/components/chat/ChatHeader';
import ChatConfigurationModal from '@/components/chat/ChatConfigurationModal';
import AccessCodeModal from '@/components/AccessCodeModal';
import MatrixRain from '@/components/MatrixRain';
import { PERSONAS, getPersonaPortraitPaths } from '@/lib/personas';
import type { ChatConfiguration } from '@/types/chat';
import { useChatSession } from '@/hooks/useChatSession';

export default function ChatPage() {
  const router = useRouter();
  const [selectedPersonaId, setSelectedPersonaId] = useState<string | null>(null);
  const [queriesRemaining, setQueriesRemaining] = useState<number | string>('...');
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [appIsLoading, setAppIsLoading] = useState(true);
  const { initializeSession } = useChatSession();

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

  const handleCodeVerified = (authState: { mode: 'admin' | 'token'; remaining?: number; allowed?: number; code?: string; token?: string }) => {
    setIsUnlocked(true);
    if (authState.mode === 'admin') {
      setQueriesRemaining('Unlimited');
    } else if (authState.mode === 'token' && authState.remaining !== undefined) {
      setQueriesRemaining(authState.remaining);
    }
    setAppIsLoading(false);
  };

  const handleStartChat = (config: ChatConfiguration) => {
    // Initialize session first
    initializeSession(config);
    // Generate sessionId and navigate
    const sessionId = `session-${Date.now()}`;
    router.push(`/chat/${sessionId}`);
  };

  if (appIsLoading && !isUnlocked) {
    return (
      <div className="min-h-screen bg-matrix-black text-matrix-text font-matrix-mono flex items-center justify-center">
        <p>Loading Interface...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-matrix-black text-matrix-text font-matrix-mono relative">
      {/* Access Code Modal */}
      <AnimatePresence>
        {!isUnlocked && <AccessCodeModal onVerified={handleCodeVerified} setAppIsLoading={setAppIsLoading} />}
      </AnimatePresence>

      {/* Matrix Rain Background */}
      <div className="fixed inset-0 z-0 overflow-hidden">
        <MatrixRain />
      </div>

      {/* Header */}
      <ChatHeader queriesRemaining={queriesRemaining} />

      {/* Main Content */}
      <div className="relative z-10 p-4 md:p-8">
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.8 }}
          className="max-w-7xl mx-auto"
        >
          <h2 className="text-2xl md:text-3xl lg:text-4xl font-matrix font-black text-matrix-green text-center mb-6 md:mb-8 tracking-wider">
            SELECT CHARACTER
          </h2>

          {/* Persona Grid - Reduced size by 12% */}
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-7 gap-2 md:gap-3 lg:gap-4">
            {Object.values(PERSONAS).map((persona) => {
              const portraitPaths = getPersonaPortraitPaths(persona.id);
              const portraitSrc = portraitPaths.primary || persona.portrait;
              const fallbackSrc = portraitPaths.fallback || persona.portrait;

              return (
                <motion.button
                  key={persona.id}
                  onClick={() => setSelectedPersonaId(persona.id)}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="p-1.5 md:p-2.5 rounded-lg border-2 border-matrix-green/30 bg-matrix-dark/50 hover:border-matrix-green hover:bg-matrix-dark transition-all cursor-pointer"
                >
                  <img
                    src={portraitSrc}
                    alt={persona.name}
                    onError={(e) => {
                      if (e.currentTarget.src !== fallbackSrc) {
                        e.currentTarget.src = fallbackSrc;
                      } else {
                        // If both fail, use a placeholder
                        e.currentTarget.src = '/personas/A1.jpeg';
                        e.currentTarget.onerror = null; // Prevent infinite loop
                      }
                    }}
                    className="w-full h-[85%] object-cover rounded mb-1 md:mb-2 border-2 border-matrix-green/50"
                  />
                  <h3 className="text-xs md:text-sm font-matrix font-bold text-matrix-green text-center line-clamp-2">
                    {persona.name.toUpperCase()}
                  </h3>
                </motion.button>
              );
            })}
          </div>
        </motion.div>
      </div>

      {/* Configuration Modal */}
      {selectedPersonaId && (
        <ChatConfigurationModal
          personaId={selectedPersonaId}
          onClose={() => setSelectedPersonaId(null)}
          onStartChat={handleStartChat}
        />
      )}
    </div>
  );
}

