// InitialPrompt.tsx - Elegant display component for the initial debate topic
// Features white/silver Matrix styling to contrast with the green/cyan chat themes
// Creates clear visual hierarchy and sophisticated design
// UI REDESIGN: Cleaner, more focused design
//   - Removed subtitle for cleaner appearance
//   - Changed label from "INPUT" to "OUTPUT" (matches terminology - displays output, not input)
//   - Matched OUTPUT label size to top "Input" label (text-2xl)
//   - Aligned container width with sections above (max-w-5xl)
//   - Enlarged display box with responsive padding (p-6 sm:p-8 md:p-10)
//   - Increased topic text size (text-2xl md:text-3xl for better readability)
//   - Removed status section (timestamp/status redundant)

'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import TypewriterText from './TypewriterText';

interface InitialPromptProps {
  topic: string;
  isActive: boolean;
}

const InitialPrompt: React.FC<InitialPromptProps> = ({ topic, isActive }) => {
  if (!topic) return null;

  return (
    <AnimatePresence>
      <motion.section
        className="relative border-b border-gray-600 bg-gradient-to-b from-gray-900 via-gray-800 to-black p-6"
        initial={{ opacity: 0, y: -50, height: 0 }}
        animate={{ opacity: 1, y: 0, height: 'auto' }}
        exit={{ opacity: 0, y: -50, height: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
      >
        {/* Subtle background glow effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-5"></div>
        
        <div className="relative max-w-5xl mx-auto">
          {/* Header */}
          <motion.div
            className="text-center mb-6"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3, duration: 0.6 }}
          >
            <div className="flex items-center justify-center gap-3">
              {/* Neural network icon */}
              <motion.div
                className="w-8 h-8 flex items-center justify-center"
                animate={{ 
                  rotate: [0, 360],
                  scale: [1, 1.1, 1]
                }}
                transition={{ 
                  rotate: { duration: 20, repeat: Infinity, ease: "linear" },
                  scale: { duration: 2, repeat: Infinity }
                }}
              >
                <svg 
                  className="w-6 h-6 text-gray-300" 
                  fill="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path d="M12 2L13.09 8.26L22 9L13.09 9.74L12 16L10.91 9.74L2 9L10.91 8.26L12 2M6.5 12.5L7.5 16L9.5 15L8.5 11L6.5 12.5M17.5 12.5L15.5 11L14.5 15L16.5 16L17.5 12.5M12 19.5L10.5 17.5L9 19L12 22L15 19L13.5 17.5L12 19.5Z"/>
                </svg>
              </motion.div>
              
              <h3 className="text-2xl font-matrix text-white tracking-wider font-bold">
                <TypewriterText 
                  text="OUTPUT"
                  speed={60}
                  className="drop-shadow-lg"
                  allowSkip={false}
                />
              </h3>
              
              {/* Status indicator */}
              <motion.div
                className={`w-3 h-3 rounded-full ${isActive ? 'bg-white' : 'bg-gray-500'}`}
                animate={isActive ? { 
                  scale: [1, 1.3, 1],
                  opacity: [1, 0.7, 1],
                  boxShadow: [
                    '0 0 0px rgba(255, 255, 255, 0.5)',
                    '0 0 15px rgba(255, 255, 255, 0.8)',
                    '0 0 0px rgba(255, 255, 255, 0.5)'
                  ]
                } : {}}
                transition={{ duration: 1.5, repeat: Infinity }}
              />
            </div>
            
            {/* Subtitle removed for cleaner design */}
          </motion.div>

          {/* Main Prompt Display */}
          <motion.div
            className="relative bg-gradient-to-r from-gray-900 via-black to-gray-900 rounded-lg border border-gray-600 overflow-hidden"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5, duration: 0.7 }}
            whileHover={{ scale: 1.02 }}
          >
            {/* Elegant border glow */}
            <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-transparent via-white to-transparent opacity-20 blur-sm"></div>
            <div className="absolute inset-[1px] rounded-lg bg-gradient-to-r from-gray-900 via-black to-gray-900"></div>
            
            {/* Content */}
            <div className="relative z-10 p-6 sm:p-8 md:p-10 text-center">
              <p className="text-2xl md:text-3xl text-white font-sans whitespace-pre-wrap">
                {topic}
              </p>
            </div>
          </motion.div>

          {/* Status section removed for cleaner, more focused design */}
        </div>
      </motion.section>
    </AnimatePresence>
  );
};

export default InitialPrompt; 