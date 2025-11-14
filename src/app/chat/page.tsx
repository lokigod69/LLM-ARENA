// Character Chat Landing Page
// Displays persona grid for selection

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import ChatHeader from '@/components/chat/ChatHeader';
import ChatConfigurationModal from '@/components/chat/ChatConfigurationModal';
import MatrixRain from '@/components/MatrixRain';
import { PERSONAS, getPersonaPortraitPaths } from '@/lib/personas';
import type { ChatConfiguration } from '@/types/chat';
import { useChatSession } from '@/hooks/useChatSession';

export default function ChatPage() {
  const router = useRouter();
  const [selectedPersonaId, setSelectedPersonaId] = useState<string | null>(null);
  const [queriesRemaining, setQueriesRemaining] = useState<number | string>('...');
  const { initializeSession } = useChatSession();

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

  const handleStartChat = (config: ChatConfiguration) => {
    // Initialize session first
    initializeSession(config);
    // Generate sessionId and navigate
    const sessionId = `session-${Date.now()}`;
    router.push(`/chat/${sessionId}`);
  };

  return (
    <div className="min-h-screen bg-matrix-black text-matrix-text font-matrix-mono relative">
      {/* Matrix Rain Background */}
      <div className="fixed inset-0 z-0 overflow-hidden">
        <MatrixRain />
      </div>

      {/* Header */}
      <ChatHeader queriesRemaining={queriesRemaining} />

      {/* Main Content */}
      <div className="relative z-10 p-8">
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.8 }}
          className="max-w-6xl mx-auto"
        >
          <h2 className="text-4xl font-matrix font-black text-matrix-green text-center mb-8 tracking-wider">
            SELECT CHARACTER
          </h2>

          {/* Persona Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {Object.values(PERSONAS).map((persona) => {
              const portraitPaths = getPersonaPortraitPaths(persona.id);
              const portraitSrc = portraitPaths.primary || persona.portrait;

              return (
                <motion.button
                  key={persona.id}
                  onClick={() => setSelectedPersonaId(persona.id)}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="p-4 rounded-lg border-2 border-matrix-green/30 bg-matrix-dark/50 hover:border-matrix-green hover:bg-matrix-dark transition-all cursor-pointer"
                >
                  <img
                    src={portraitSrc}
                    alt={persona.name}
                    className="w-full aspect-square object-cover rounded mb-2 border-2 border-matrix-green/50"
                  />
                  <h3 className="text-sm font-matrix font-bold text-matrix-green text-center">
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

