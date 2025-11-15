// Chat Configuration Modal
// Modal for initial chat setup with all configuration options

'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { AvailableModel } from '@/types';
import type { ChatConfiguration } from '@/types/chat';
import { PERSONAS, getPersonaPortraitPaths } from '@/lib/personas';
import { getAvailableModels, getModelDisplayName, getModelColor } from '@/lib/modelConfigs';

interface ChatConfigurationModalProps {
  personaId: string;
  onClose: () => void;
  onStartChat: (config: ChatConfiguration) => void;
}

export default function ChatConfigurationModal({
  personaId,
  onClose,
  onStartChat,
}: ChatConfigurationModalProps) {
  const persona = PERSONAS[personaId];
  const portraitPaths = getPersonaPortraitPaths(personaId);
  const portraitSrc = portraitPaths.primary || persona.portrait;

  const [modelName, setModelName] = useState<AvailableModel>('gpt-5');
  const [stance, setStance] = useState(5);
  const [extensiveness, setExtensiveness] = useState(3);

  const availableModels = getAvailableModels();

  const handleStartChat = () => {
    const config: ChatConfiguration = {
      modelName,
      personaId,
      stance,
      defaultExtensiveness: extensiveness,
    };
    onStartChat(config);
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="matrix-panel p-8 rounded-lg border-2 border-matrix-green max-w-2xl w-full mx-4"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-matrix font-bold text-matrix-green tracking-wider">
              CONFIGURE CHAT
            </h2>
            <button
              onClick={onClose}
              className="text-matrix-green-dim hover:text-matrix-green transition-colors text-2xl cursor-pointer"
            >
              ×
            </button>
          </div>

          {/* Persona Display - Option A (Simple Identity) + Option B (Famous Quote) */}
          <div className="flex items-start gap-4 mb-6 p-4 bg-matrix-dark rounded-lg border border-matrix-green/30">
            <img
              src={portraitSrc}
              alt={persona.name}
              onError={(e) => {
                const fallbackSrc = portraitPaths.fallback || persona.portrait;
                if (e.currentTarget.src !== fallbackSrc) {
                  e.currentTarget.src = fallbackSrc;
                } else {
                  e.currentTarget.src = '/personas/A1.jpeg';
                  e.currentTarget.onerror = null;
                }
              }}
              className="w-16 h-16 rounded-full border-2 border-matrix-green flex-shrink-0"
            />
            <div className="flex-1">
              {/* Option A: Simple Identity */}
              <h3 className="text-xl font-matrix font-bold text-matrix-green mb-1">
                {persona.name.toUpperCase()}
              </h3>
              {persona.era && (
                <p className="text-xs text-matrix-green-dim mb-2">{persona.era}</p>
              )}
              {/* Option B: Famous Quote */}
              {persona.quote ? (
                <p className="text-sm text-matrix-green-dim italic">
                  "{persona.quote}"
                </p>
              ) : (
                <p className="text-sm text-matrix-green-dim">{persona.identity.substring(0, 100)}...</p>
              )}
            </div>
          </div>

          {/* Model Selector */}
          <div className="mb-6">
            <label className="block text-matrix-green font-matrix mb-2 tracking-wider">
              MODEL
            </label>
            <select
              value={modelName}
              onChange={(e) => setModelName(e.target.value as AvailableModel)}
              className="w-full p-3 rounded-lg bg-matrix-darker border-2 border-matrix-green/40 text-matrix-green font-matrix focus:border-matrix-green focus:outline-none cursor-pointer"
              style={{
                color: getModelColor(modelName),
                borderColor: `${getModelColor(modelName)}60`,
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

          {/* Stance Slider */}
          <div className="mb-6">
            <label className="block text-matrix-green font-matrix mb-2 tracking-wider">
              OPINION STRENGTH: {stance}/10
            </label>
            <input
              type="range"
              min="0"
              max="10"
              value={stance}
              onChange={(e) => setStance(Number(e.target.value))}
              className="w-full h-2 bg-matrix-dark rounded-lg appearance-none cursor-pointer"
              style={{
                background: `linear-gradient(to right, #3b82f6 0%, #8b5cf6 50%, #ef4444 100%)`,
              }}
            />
            <div className="flex justify-between text-xs text-matrix-green-dim mt-1">
              <span>Open-minded</span>
              <span>Firm</span>
            </div>
          </div>

          {/* Extensiveness Slider */}
          <div className="mb-6">
            <label className="block text-matrix-green font-matrix mb-2 tracking-wider">
              RESPONSE DETAIL: {extensiveness}/5
            </label>
            <input
              type="range"
              min="1"
              max="5"
              value={extensiveness}
              onChange={(e) => setExtensiveness(Number(e.target.value))}
              className="w-full h-2 bg-matrix-dark rounded-lg appearance-none cursor-pointer"
              style={{
                background: `linear-gradient(to right, #3b82f6 0%, #8b5cf6 25%, #a855f7 50%, #c084fc 75%, #ef4444 100%)`,
              }}
            />
            <div className="flex justify-between text-xs text-matrix-green-dim mt-1">
              <span>Terse</span>
              <span>Comprehensive</span>
            </div>
          </div>

          {/* Start Chat Button */}
          <button
            onClick={handleStartChat}
            className="w-full py-3 rounded-lg bg-matrix-green/20 hover:bg-matrix-green/30 border-2 border-matrix-green text-matrix-green font-matrix font-bold tracking-wider transition-colors cursor-pointer"
          >
            START CHAT
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

