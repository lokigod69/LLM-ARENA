// Chat Error Display Component
// Shows error messages with retry functionality

'use client';

import { motion } from 'framer-motion';
import type { ChatError } from '@/types/chat';

interface ChatErrorProps {
  error: ChatError;
  onRetry?: () => void;
  onDismiss: () => void;
}

export default function ChatError({ error, onRetry, onDismiss }: ChatErrorProps) {
  const getErrorColor = () => {
    switch (error.type) {
      case 'api':
        return 'border-red-500 bg-red-900/20';
      case 'auth':
        return 'border-yellow-500 bg-yellow-900/20';
      case 'rate_limit':
        return 'border-orange-500 bg-orange-900/20';
      case 'network':
        return 'border-blue-500 bg-blue-900/20';
      case 'cost':
        return 'border-purple-500 bg-purple-900/20';
      default:
        return 'border-red-500 bg-red-900/20';
    }
  };

  const getErrorIcon = () => {
    switch (error.type) {
      case 'api':
        return '⚠️';
      case 'auth':
        return '🔐';
      case 'rate_limit':
        return '⏱️';
      case 'network':
        return '🌐';
      case 'cost':
        return '💰';
      default:
        return '❌';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className={`p-4 rounded-lg border-2 ${getErrorColor()} mb-4`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 flex-1">
          <span className="text-2xl">{getErrorIcon()}</span>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-matrix font-bold text-matrix-green uppercase tracking-wider">
                {error.type.replace('_', ' ')}
              </span>
              <span className="text-xs text-matrix-green-dim">
                {new Date(error.timestamp).toLocaleTimeString()}
              </span>
            </div>
            <p className="text-matrix-text text-sm">{error.message}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {error.retryable && onRetry && (
            <button
              onClick={onRetry}
              className="px-3 py-1 rounded bg-matrix-green/20 hover:bg-matrix-green/30 text-matrix-green font-matrix text-sm transition-colors"
            >
              Retry
            </button>
          )}
          <button
            onClick={onDismiss}
            className="px-3 py-1 rounded bg-matrix-dark hover:bg-matrix-darker text-matrix-text font-matrix text-sm transition-colors"
          >
            Dismiss
          </button>
        </div>
      </div>
    </motion.div>
  );
}

