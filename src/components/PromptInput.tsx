// Task 3.2 Complete + Matrix UI: Matrix-styled prompt input with cyberpunk aesthetics
// Updated with neon effects, Matrix colors, and futuristic design
// UI REFINEMENT: Dynamic center-growing input with character-by-character expansion
// PHASE 1: Added query exhaustion check and disable inputs when queries = 0
'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';

interface PromptInputProps {
  onSubmitTopic: (topic: string) => void;
  onStop: () => void;
  isLoading: boolean;
  isDebateActive: boolean;
  queriesRemaining?: number | string; // PHASE 1: Added for query check
  isAdmin?: boolean; // PHASE 1: Added for admin bypass
}

const PromptInput = ({ onSubmitTopic, onStop, isLoading, isDebateActive, queriesRemaining, isAdmin }: PromptInputProps) => {
  // PHASE 1: Check if queries are exhausted
  const isQueriesExhausted = typeof queriesRemaining === 'number' && queriesRemaining <= 0 && !isAdmin;
  const [topic, setTopic] = useState<string>('');
  const [isFocused, setIsFocused] = useState<boolean>(false);
  const [inputWidth, setInputWidth] = useState<number>(150); // Start at 150px
  const measureRef = useRef<HTMLSpanElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Measure text width in real-time with debouncing for smoother performance
  const updateWidth = useCallback(() => {
    if (measureRef.current && containerRef.current) {
      const measured = measureRef.current.offsetWidth;
      const containerWidth = containerRef.current.offsetWidth;
      
      // More generous spacing - align with debate protocol box edges
      const buttonSpace = 64 + 64 + 12; // Just buttons + gap, minimal padding
      const maxWidth = containerWidth - buttonSpace - 48; // Match protocol box width
      const minWidth = 150;
      
      // Add padding to measured width and ensure it's within bounds
      const targetWidth = Math.max(minWidth, Math.min(maxWidth, measured + 60));
      
      // Only update if there's a meaningful change (reduces unnecessary re-renders)
      if (Math.abs(targetWidth - inputWidth) > 2) {
        setInputWidth(targetWidth);
      }
    }
  }, [inputWidth]);

  useEffect(() => {
    // Reset to minimum width when input is cleared
    if (!topic.trim()) {
      setInputWidth(150);
    } else {
      updateWidth();
    }
  }, [topic, updateWidth]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (topic.trim() && !isLoading && !isDebateActive && !isQueriesExhausted) {
      onSubmitTopic(topic.trim());
      setTopic(''); // Clear the input after submission
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleFocus = () => {
    setIsFocused(true);
  };

  const handleBlur = () => {
    setIsFocused(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setTopic(e.target.value);
    
    // Auto-resize height - no max height, no scrolling
    const target = e.target;
    target.style.height = 'auto';
    target.style.height = target.scrollHeight + 'px';
  };

  return (
    <motion.form 
      onSubmit={handleSubmit} 
      className="relative"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
    >
      {/* Hidden text measurement element - matching exact styles */}
      <span
        ref={measureRef}
        className="absolute -top-1000 left-0 text-lg py-4 px-6 font-matrix whitespace-pre-wrap opacity-0 pointer-events-none matrix-input"
        style={{ 
          fontFamily: 'inherit',
          fontSize: '1.125rem',
          lineHeight: '1.75rem',
          fontWeight: 'inherit'
        }}
      >
        {topic || '...'}
      </span>

      {/* Dynamic flex container */}
      <div 
        ref={containerRef}
        className="flex items-center justify-center gap-3"
      >
        {/* PLAY Button */}
        <motion.button
          type="submit"
          disabled={!topic.trim() || isLoading || isDebateActive || isQueriesExhausted}
          className="flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed w-16 h-16 bg-green-600 hover:bg-green-700 text-white rounded-xl flex items-center justify-center transition-all duration-150 shadow-lg hover:shadow-green-500/50 border-2 border-green-500"
          whileHover={{ 
            scale: (!topic.trim() || isLoading || isDebateActive || isQueriesExhausted) ? 1 : 1.05,
            boxShadow: (!topic.trim() || isLoading || isDebateActive || isQueriesExhausted) ? undefined : '0 0 30px rgba(16, 185, 129, 0.6)'
          }}
          whileTap={{ scale: (!topic.trim() || isLoading || isDebateActive || isQueriesExhausted) ? 1 : 0.95 }}
          transition={{ duration: 0.2 }}
        >
          {isLoading ? (
            <motion.div
              className="w-6 h-6 border-2 border-white border-t-transparent rounded-full"
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            />
          ) : (
            <svg 
              width="24" 
              height="24" 
              viewBox="0 0 24 24" 
              fill="currentColor"
              className="ml-1"
            >
              <path d="M8 5v14l11-7z"/>
            </svg>
          )}
        </motion.button>

        {/* Dynamic growing textarea */}
        <motion.div
          className="relative flex-shrink-0"
          animate={{ 
            width: inputWidth 
          }}
          transition={{ 
            duration: 0.15,
            ease: [0.23, 1, 0.320, 1]
          }}
        >
          <motion.textarea
            ref={textareaRef}
            value={topic}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onFocus={handleFocus}
            onBlur={handleBlur}
            placeholder={''}
            className={`w-full matrix-input rounded-lg text-lg py-4 px-6 focus:ring-2 focus:ring-matrix-green transition-all duration-150 resize-none min-h-[64px] text-center ${isFocused && !topic ? 'animate-pulse' : ''} ${isQueriesExhausted ? 'opacity-50 cursor-not-allowed' : ''}`}
            disabled={isLoading || isDebateActive || isQueriesExhausted}
            rows={1}
            style={{
              height: '64px',
              overflow: 'hidden'
            }}
          />
          
          {/* Blinking cursor when focused and empty */}
          {isFocused && !topic && (
            <motion.div
              className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 w-0.5 h-6 bg-matrix-green"
              animate={{ opacity: [1, 0, 1] }}
              transition={{ duration: 1, repeat: Infinity, ease: "easeInOut" }}
            />
          )}
        </motion.div>

        {/* STOP Button */}
        <motion.button
          type="button"
          onClick={onStop}
          disabled={!isDebateActive}
          className="flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed w-16 h-16 bg-red-600 hover:bg-red-700 text-white rounded-xl flex items-center justify-center transition-all duration-150 shadow-lg hover:shadow-red-500/50 border-2 border-red-500"
          whileHover={{ 
            scale: !isDebateActive ? 1 : 1.05,
            boxShadow: !isDebateActive ? undefined : '0 0 30px rgba(239, 68, 68, 0.6)'
          }}
          whileTap={{ scale: !isDebateActive ? 1 : 0.95 }}
          transition={{ duration: 0.2 }}
        >
          <svg 
            width="24" 
            height="24" 
            viewBox="0 0 24 24" 
            fill="currentColor"
          >
            <path d="M6 6h12v12H6z"/>
          </svg>
        </motion.button>
      </div>

      {/* PHASE 1: Query exhaustion message */}
      {isQueriesExhausted && (
        <motion.div
          className="mt-4 relative"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="bg-red-900/20 border border-red-500/50 rounded-lg p-4">
            <p className="text-red-400 text-sm text-center font-matrix">
              ⚠️ No queries remaining. Please contact administrator for more access.
            </p>
          </div>
        </motion.div>
      )}

      {/* Matrix-style progress bar when loading */}
      {isLoading && (
        <motion.div
          className="mt-4 relative"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="h-1 bg-matrix-gray rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-matrix-green to-matrix-blue"
              initial={{ width: "0%" }}
              animate={{ width: "100%" }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            />
          </div>
          <p className="text-xs text-matrix-green-dim mt-2 text-center">
            Initializing neural network protocols...
          </p>
        </motion.div>
      )}
    </motion.form>
  );
};

export default PromptInput; 