// Chat Message List Component
// Displays all messages in the conversation

'use client';

import { useEffect, useRef } from 'react';
import ChatMessage from './ChatMessage';
import ChatError from './ChatError';
import type { ChatMessage as ChatMessageType, ChatError as ChatErrorType } from '@/types/chat';
import type { AvailableModel } from '@/types';

interface ChatMessageListProps {
  messages: ChatMessageType[];
  isLoading: boolean;
  error: ChatErrorType | null;
  modelName?: AvailableModel;
  personaId?: string;
  onRetry?: () => void;
  onDismissError: () => void;
}

export default function ChatMessageList({
  messages,
  isLoading,
  error,
  modelName,
  personaId,
  onRetry,
  onDismissError,
}: ChatMessageListProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  return (
    <div
      ref={scrollRef}
      className="flex-1 overflow-y-auto p-4 space-y-4"
      style={{
        scrollbarWidth: 'thin',
        scrollbarColor: '#00ff41 transparent',
      }}
    >
      {messages.map((message) => (
        <ChatMessage
          key={message.id}
          message={message}
          modelName={modelName}
          personaId={personaId}
        />
      ))}

      {isLoading && (
        <div className="flex items-center gap-2 text-matrix-green-dim">
          <div className="animate-pulse">●</div>
          <span className="text-sm font-matrix">Character is thinking...</span>
        </div>
      )}

      {error && (
        <ChatError error={error} onRetry={onRetry} onDismiss={onDismissError} />
      )}
    </div>
  );
}

