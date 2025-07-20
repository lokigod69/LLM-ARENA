// Enhanced Typewriter Text Component - Optimized for debate reading experience
// WORD-BY-WORD TYPING: More readable than character-by-character for debate content
// CONFIGURABLE SPEEDS: Supports different typing modes for user preference
// SKIP FUNCTIONALITY: Click to complete immediately
// SMART PUNCTUATION: Natural pauses at sentence boundaries

'use client';

import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

interface TypewriterTextProps {
  text: string;
  speed?: number; // words per second (default: 3)
  mode?: 'character' | 'word'; // typing mode
  className?: string;
  onComplete?: () => void;
  startDelay?: number;
  allowSkip?: boolean; // click to complete
  pauseOnPunctuation?: boolean; // natural reading rhythm
}

const TypewriterText = ({ 
  text, 
  speed = 3, // words per second for better reading
  mode = 'word', // word-by-word by default
  className = '', 
  onComplete,
  startDelay = 0,
  allowSkip = true,
  pauseOnPunctuation = true
}: TypewriterTextProps) => {
  const [displayText, setDisplayText] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [isSkipped, setIsSkipped] = useState(false);
  const containerRef = useRef<HTMLSpanElement>(null);
  
  // STRING SAFETY: Ensure text is always a string before splitting
  const safeText = text || '';
  
  // Split text into words or characters based on mode
  const textUnits = mode === 'word' ? safeText.split(/(\s+)/) : safeText.split('');
  
  // Calculate delay between units (convert words/second to ms per unit)
  const baseDelay = mode === 'word' ? (1000 / speed) : speed;

  useEffect(() => {
    console.log(`🔄 TypewriterText [${mode}]: Resetting for text: "${safeText.substring(0, 50)}..."`);
    setDisplayText('');
    setCurrentIndex(startDelay > 0 ? -1 : 0);
    setIsComplete(false);
    setIsSkipped(false);
  }, [safeText, startDelay, mode]);

  useEffect(() => {
    if (startDelay > 0 && currentIndex === -1) {
      console.log(`⏰ TypewriterText: Starting delay ${startDelay}ms`);
      const delayTimer = setTimeout(() => {
        setCurrentIndex(0);
      }, startDelay);
      return () => clearTimeout(delayTimer);
    }
  }, [startDelay, currentIndex]);

  useEffect(() => {
    if (isSkipped || isComplete) return;
    
    if (currentIndex >= 0 && currentIndex < textUnits.length) {
      const currentUnit = textUnits[currentIndex];
      
      // Calculate dynamic delay for punctuation pauses
      let dynamicDelay = baseDelay;
      if (mode === 'word' && pauseOnPunctuation) {
        if (/[.!?]/.test(currentUnit)) {
          dynamicDelay = baseDelay * 2; // Longer pause for sentences
        } else if (/[,;:]/.test(currentUnit)) {
          dynamicDelay = baseDelay * 1.5; // Medium pause for clauses
        }
      }
      
      const timer = setTimeout(() => {
        if (mode === 'word') {
          console.log(`⌨️ TypewriterText: Adding word ${currentIndex}: "${currentUnit}"`);
        }
        setDisplayText(prev => prev + currentUnit);
        setCurrentIndex(prev => prev + 1);
      }, dynamicDelay);

      return () => clearTimeout(timer);
    } else if (currentIndex === textUnits.length && !isComplete) {
      console.log(`✅ TypewriterText: Completed typing`);
      setIsComplete(true);
      onComplete?.();
      // NEW: Dispatch global event for useDebate hook
      window.dispatchEvent(new CustomEvent('typingComplete', { detail: { text: safeText } }));
    }
  }, [currentIndex, textUnits, baseDelay, mode, pauseOnPunctuation, onComplete, isComplete, isSkipped]);

  const handleSkip = () => {
    if (allowSkip && !isComplete) {
      console.log(`⚡ TypewriterText: Skipping to end`);
      setIsSkipped(true);
      setDisplayText(safeText);
      setIsComplete(true);
      onComplete?.();
      // NEW: Dispatch global event for useDebate hook
      window.dispatchEvent(new CustomEvent('typingComplete', { detail: { text: safeText } }));
    }
  };

  return (
    <motion.span
      ref={containerRef}
      className={`${className} inline-block ${allowSkip ? 'cursor-pointer' : ''}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      onClick={handleSkip}
      title={allowSkip ? "Click to complete instantly" : undefined}
    >
      {displayText}
      {!isComplete && !isSkipped && (
        <motion.span
          className="inline-block w-2 h-5 bg-matrix-green ml-1"
          animate={{ opacity: [1, 0] }}
          transition={{ duration: 0.8, repeat: Infinity, repeatType: 'reverse' }}
        />
      )}
    </motion.span>
  );
};

export default TypewriterText; 