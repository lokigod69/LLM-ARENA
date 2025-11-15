// Configuration Modal Component
// Centered modal for adjusting chat settings (Phase 2)
//
// Phase 2 Changes:
// - Extracted from ChatConfiguration collapsible panel
// - Implemented as centered modal overlay with backdrop
// - Added queries remaining display
// - Added ESC key handler for closing
// - Framer Motion animations for smooth open/close

'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import type { ChatConfiguration } from '@/types/chat';
import type { AvailableModel } from '@/types';
import { getAvailableModels, getModelDisplayName, getModelColor } from '@/lib/modelConfigs';
import { PERSONAS, getPersonaPortraitPaths } from '@/lib/personas';

interface ConfigurationModalProps {
  isOpen: boolean;
  onClose: () => void;
  configuration: ChatConfiguration;
  onConfigurationChange: (config: Partial<ChatConfiguration>) => void;
  personaId: string;
  queriesRemaining: number | string;
}

export default function ConfigurationModal({
  isOpen,
  onClose,
  configuration,
  onConfigurationChange,
  personaId,
  queriesRemaining,
}: ConfigurationModalProps) {
  const router = useRouter();
  const persona = PERSONAS[personaId];
  const portraitPaths = getPersonaPortraitPaths(personaId);
  const portraitSrc = portraitPaths?.primary || persona?.portrait;
  const fallbackSrc = portraitPaths?.fallback || persona?.portrait;
  const availableModels = getAvailableModels();

  // Handle ESC key to close modal
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEsc);
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';
      
      return () => {
        document.removeEventListener('keydown', handleEsc);
        document.body.style.overflow = 'unset';
      };
    }
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[200]"
            aria-hidden="true"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 
                       w-[90%] max-w-md bg-matrix-dark border-2 border-matrix-green 
                       rounded-lg shadow-2xl shadow-matrix-green/30 z-[250] p-6 
                       max-h-[80vh] overflow-y-auto"
            role="dialog"
            aria-modal="true"
            aria-labelledby="config-modal-title"
          >
            {/* Close Button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-matrix-green/70 hover:text-matrix-green 
                         transition-colors text-2xl w-8 h-8 flex items-center justify-center 
                         cursor-pointer rounded-full hover:bg-matrix-green/10"
              aria-label="Close configuration"
            >
              ✕
            </button>

            {/* Header */}
            <h2 
              id="config-modal-title"
              className="text-xl font-matrix font-bold text-matrix-green mb-6 
                         tracking-wider border-b border-matrix-green/30 pb-3 pr-8"
            >
              CONFIGURATION
            </h2>

            {/* Persona Display */}
            <div className="mb-6 p-4 bg-matrix-darker rounded-lg border border-matrix-green/20">
              <div className="flex items-center gap-4">
                <img
                  src={portraitSrc}
                  alt={persona?.name || 'Unknown'}
                  onError={(e) => {
                    if (e.currentTarget.src !== fallbackSrc) {
                      e.currentTarget.src = fallbackSrc || '/personas/A1.jpeg';
                    } else {
                      e.currentTarget.src = '/personas/A1.jpeg';
                      e.currentTarget.onerror = null;
                    }
                  }}
                  className="w-16 h-16 rounded-full border-2 border-matrix-green flex-shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-matrix font-bold text-matrix-green truncate">
                    {persona?.name.toUpperCase() || 'UNKNOWN'}
                  </h3>
                  <p className="text-xs text-matrix-green-dim">CHARACTER</p>
                </div>
                <button
                  onClick={() => {
                    onClose();
                    router.push('/chat');
                  }}
                  className="text-xs text-matrix-green/70 hover:text-matrix-green transition-colors 
                             cursor-pointer px-3 py-1 border border-matrix-green/30 rounded 
                             hover:border-matrix-green/50 whitespace-nowrap"
                >
                  Change →
                </button>
              </div>
            </div>

            {/* Model Selector */}
            <div className="mb-6">
              <label className="block text-sm text-matrix-green font-matrix mb-2 tracking-wide">
                MODEL
              </label>
              <select
                value={configuration.modelName}
                onChange={(e) =>
                  onConfigurationChange({ modelName: e.target.value as AvailableModel })
                }
                className="w-full p-3 rounded-lg bg-matrix-darker border-2 border-matrix-green/40 
                           text-matrix-green font-matrix focus:border-matrix-green 
                           focus:outline-none cursor-pointer transition-colors"
                style={{
                  color: getModelColor(configuration.modelName),
                  borderColor: `${getModelColor(configuration.modelName)}60`,
                }}
              >
                {availableModels.map((model) => (
                  <option
                    key={model}
                    value={model}
                    style={{
                      backgroundColor: '#0D0D0D',
                      color: getModelColor(model),
                    }}
                  >
                    {getModelDisplayName(model)}
                  </option>
                ))}
              </select>
            </div>

            {/* Response Depth Slider */}
            <div className="mb-6">
              <label className="block text-sm text-matrix-green font-matrix mb-2 tracking-wide">
                DEFAULT RESPONSE DEPTH: {configuration.defaultExtensiveness}/5
              </label>
              <input
                type="range"
                min="1"
                max="5"
                value={configuration.defaultExtensiveness}
                onChange={(e) =>
                  onConfigurationChange({
                    defaultExtensiveness: Number(e.target.value),
                  })
                }
                className="w-full h-2 bg-matrix-darker rounded-lg appearance-none cursor-pointer"
                style={{
                  background: `linear-gradient(to right, #3b82f6 0%, #8b5cf6 25%, #a855f7 50%, #c084fc 75%, #ef4444 100%)`,
                }}
              />
              <div className="flex justify-between text-xs text-matrix-green-dim mt-1">
                <span>Concise</span>
                <span>Extensive</span>
              </div>
            </div>

            {/* Queries Remaining */}
            <div className="p-4 bg-matrix-darker rounded-lg border border-matrix-green/20">
              <p className="text-xs text-matrix-green-dim uppercase tracking-wider mb-1">
                Queries Remaining
              </p>
              <p className="text-lg text-matrix-green font-matrix font-bold">
                {queriesRemaining}
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

