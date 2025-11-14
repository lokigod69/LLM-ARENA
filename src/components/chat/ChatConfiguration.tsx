// Chat Configuration Panel Component
// Collapsible panel for adjusting chat settings

'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { ChatConfiguration } from '@/types/chat';
import type { AvailableModel } from '@/types';
import { getAvailableModels, getModelDisplayName, getModelColor } from '@/lib/modelConfigs';
import { PERSONAS, getPersonaPortraitPaths } from '@/lib/personas';

interface ChatConfigurationProps {
  configuration: ChatConfiguration;
  onConfigurationChange: (config: Partial<ChatConfiguration>) => void;
}

export default function ChatConfiguration({
  configuration,
  onConfigurationChange,
}: ChatConfigurationProps) {
  const [isOpen, setIsOpen] = useState(false);
  const persona = PERSONAS[configuration.personaId];
  const portraitPaths = getPersonaPortraitPaths(configuration.personaId);
  const portraitSrc = portraitPaths?.primary || persona?.portrait;
  const availableModels = getAvailableModels();

  return (
    <div className="border-b border-matrix-green/30 bg-matrix-dark">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-4 flex items-center justify-between hover:bg-matrix-darker transition-colors"
      >
        <span className="text-matrix-green font-matrix font-bold tracking-wider">
          CONFIGURATION
        </span>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.3 }}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-matrix-green"
          >
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
        </motion.div>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="p-4 space-y-4">
              {/* Persona Display */}
              <div className="flex items-center gap-4 p-3 bg-matrix-darker rounded-lg">
                <img
                  src={portraitSrc}
                  alt={persona.name}
                  className="w-12 h-12 rounded-full border-2 border-matrix-green"
                />
                <div>
                  <h3 className="text-lg font-matrix font-bold text-matrix-green">
                    {persona.name.toUpperCase()}
                  </h3>
                </div>
              </div>

              {/* Model Selector */}
              <div>
                <label className="block text-sm text-matrix-green font-matrix mb-2">
                  MODEL
                </label>
                <select
                  value={configuration.modelName}
                  onChange={(e) =>
                    onConfigurationChange({ modelName: e.target.value as AvailableModel })
                  }
                  className="w-full p-2 rounded-lg bg-matrix-darker border-2 border-matrix-green/40 text-matrix-green font-matrix focus:border-matrix-green focus:outline-none"
                  style={{
                    color: getModelColor(configuration.modelName),
                    borderColor: `${getModelColor(configuration.modelName)}60`,
                  }}
                >
                  {availableModels.map((model) => (
                    <option key={model} value={model} style={{ backgroundColor: '#0D0D0D' }}>
                      {getModelDisplayName(model)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Stance Slider */}
              <div>
                <label className="block text-sm text-matrix-green font-matrix mb-2">
                  OPINION STRENGTH: {configuration.stance}/10
                </label>
                <input
                  type="range"
                  min="0"
                  max="10"
                  value={configuration.stance}
                  onChange={(e) =>
                    onConfigurationChange({ stance: Number(e.target.value) })
                  }
                  className="w-full h-2 bg-matrix-darker rounded-lg appearance-none cursor-pointer"
                  style={{
                    background: `linear-gradient(to right, #3b82f6 0%, #8b5cf6 50%, #ef4444 100%)`,
                  }}
                />
              </div>

              {/* Default Extensiveness */}
              <div>
                <label className="block text-sm text-matrix-green font-matrix mb-2">
                  DEFAULT RESPONSE DETAIL: {configuration.defaultExtensiveness}/5
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
                  className="w-full h-2 bg-matrix-darker rounded-lg appearance-none cursor-pointer accent-matrix-green"
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

