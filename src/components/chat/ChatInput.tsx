// Chat Input Component
// Message input with extensiveness control

'use client';

import { useState, KeyboardEvent } from 'react';

interface ChatInputProps {
  onSendMessage: (content: string, extensiveness: number) => void;
  extensiveness: number;
  onExtensivenessChange: (level: number) => void;
  isLoading: boolean;
  hideExtensiveness?: boolean; // Fix 2: Hide slider in empty state
  placeholder?: string; // Fix 1: Customizable placeholder
  autoFocus?: boolean; // Fix 1: Auto-focus input
}

export default function ChatInput({
  onSendMessage,
  extensiveness,
  onExtensivenessChange,
  isLoading,
  hideExtensiveness = false,
  placeholder = "Type your message... (Enter to send, Shift+Enter for new line)",
  autoFocus = false,
}: ChatInputProps) {
  const [input, setInput] = useState('');

  const handleSend = () => {
    if (input.trim() && !isLoading) {
      onSendMessage(input.trim(), extensiveness);
      setInput('');
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="border-t border-matrix-green/30 p-4 bg-matrix-dark">
      {/* Extensiveness Control - Fix 2: Hide in empty state */}
      {!hideExtensiveness && (
        <div className="mb-3">
          <label className="block text-xs text-matrix-green-dim font-matrix mb-1">
            RESPONSE DETAIL: {extensiveness}/5
          </label>
          <input
            type="range"
            min="1"
            max="5"
            value={extensiveness}
            onChange={(e) => onExtensivenessChange(Number(e.target.value))}
            disabled={isLoading}
            className="w-full h-1.5 bg-matrix-darker rounded-lg appearance-none cursor-pointer disabled:cursor-not-allowed"
            style={{
              background: isLoading 
                ? '#1a1a1a' 
                : `linear-gradient(to right, #3b82f6 0%, #8b5cf6 25%, #a855f7 50%, #c084fc 75%, #ef4444 100%)`,
            }}
          />
          <div className="flex justify-between text-xs text-matrix-green-dim mt-1">
            <span>Brief</span>
            <span>Detailed</span>
          </div>
        </div>
      )}

      {/* Input Area */}
      <div className="flex gap-2">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isLoading}
          placeholder={placeholder}
          autoFocus={autoFocus}
          className="flex-1 p-3 rounded-lg bg-matrix-darker border-2 border-matrix-green/30 text-matrix-text font-matrix focus:border-matrix-green focus:outline-none resize-none disabled:opacity-50"
          rows={2}
        />
        <button
          onClick={handleSend}
          disabled={!input.trim() || isLoading}
          className="px-6 py-3 rounded-lg bg-matrix-green/20 hover:bg-matrix-green/30 border-2 border-matrix-green text-matrix-green font-matrix font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          SEND
        </button>
      </div>
    </div>
  );
}

