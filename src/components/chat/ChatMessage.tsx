// Individual Chat Message Component
// Displays a single message bubble (user or assistant)

'use client';

import { motion } from 'framer-motion';
import type { ChatMessage as ChatMessageType } from '@/types/chat';
import { PERSONAS, getPersonaPortraitPaths } from '@/lib/personas';
import { getModelDisplayName, getModelColor } from '@/lib/modelConfigs';
import type { AvailableModel } from '@/types';

interface ChatMessageProps {
  message: ChatMessageType;
  modelName?: AvailableModel;
  personaId?: string;
}

export default function ChatMessage({ message, modelName, personaId }: ChatMessageProps) {
  const isUser = message.role === 'user';
  const persona = personaId ? PERSONAS[personaId] : null;
  const portraitPaths = personaId ? getPersonaPortraitPaths(personaId) : null;
  const portraitSrc = portraitPaths?.primary || persona?.portrait;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex gap-3 mb-4 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
    >
      {/* Avatar - Increased to 48px */}
      {!isUser && persona && (
        <div className="flex-shrink-0">
          <img
            src={portraitSrc}
            alt={persona.name}
            onError={(e) => {
              const fallbackPaths = getPersonaPortraitPaths(personaId || '');
              if (e.currentTarget.src !== fallbackPaths.fallback) {
                e.currentTarget.src = fallbackPaths.fallback || '/personas/A1.jpeg';
              } else {
                e.currentTarget.src = '/personas/A1.jpeg';
                e.currentTarget.onerror = null;
              }
            }}
            className="w-12 h-12 rounded-full border-2 flex-shrink-0"
            style={{ borderColor: modelName ? getModelColor(modelName) : '#00ff41' }}
          />
        </div>
      )}

      {/* Message Bubble */}
      <div
        className={`flex flex-col max-w-[70%] ${
          isUser ? 'items-end' : 'items-start'
        }`}
      >
        {/* Sender Name */}
        {!isUser && (
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-matrix font-bold text-matrix-green">
              {persona?.name || 'Assistant'}
            </span>
            {modelName && (
              <span
                className="text-xs px-2 py-0.5 rounded"
                style={{
                  backgroundColor: `${getModelColor(modelName)}20`,
                  color: getModelColor(modelName),
                }}
              >
                {getModelDisplayName(modelName)}
              </span>
            )}
          </div>
        )}

        {/* Message Content */}
        <div
          className={`p-4 rounded-lg ${
            isUser
              ? 'bg-blue-500/20 border-2 border-blue-500/50 text-blue-100'
              : 'bg-matrix-dark border-2 border-matrix-green/50 text-matrix-text'
          }`}
        >
          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
        </div>

        {/* Timestamp */}
        <span className="text-xs text-matrix-green-dim mt-1">
          {new Date(message.timestamp).toLocaleTimeString()}
        </span>
      </div>
    </motion.div>
  );
}

