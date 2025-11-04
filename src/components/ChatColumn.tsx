// Task 3.3 Complete + Matrix UI: Matrix-styled chat column with cyberpunk aesthetics
// Updated with dynamic model colors for consistent UI experience
// MarkButton integration: Added MarkButton after each message for marking (heart/star) debate messages
'use client';

import { forwardRef } from 'react';
import { Message } from '@/types';
import { motion, AnimatePresence } from 'framer-motion';
import TypewriterText from './TypewriterText';
import { getModelColor } from '@/lib/modelConfigs';
import type { AvailableModel } from '@/types';
import AudioPlayer from './AudioPlayer';
import { usePlayback } from '@/contexts/PlaybackContext';

import { PERSONAS } from '@/lib/personas';

interface ChatColumnProps {
  messages: Message[];
  modelName: string;
  isLoading: boolean;
  modelColor?: string; // Optional color override
  actualModelName?: AvailableModel; // The actual model being used
  personaId?: string; // ← ADD THIS
}

const ChatColumn = forwardRef<HTMLDivElement, ChatColumnProps>(
  ({ messages, modelName, isLoading, modelColor, actualModelName, personaId }, ref) => {
    const { playingMessageId } = usePlayback();
    
    console.log('🎨 ChatColumn render:', {
      propModelName: modelName,
      messages: messages.length,
      firstMessageSender: messages[0]?.sender,
      actualModelName,
      isLoading
    });

    // DEBUG: Log loading state changes
    console.log(`🔄 [${modelName}] Loading state: ${isLoading ? '●●● PROCESSING' : '○ IDLE'}`);

    // Convert hex color to CSS classes - Dynamic color system
    const getDynamicColors = (hexColor: string) => {
      // If we have the actual model name, use its color from the config
      let color = hexColor;
      if (actualModelName) {
        color = getModelColor(actualModelName);
      }
      
      // Convert hex to RGB for various uses
      const r = parseInt(color.slice(1, 3), 16);
      const g = parseInt(color.slice(3, 5), 16);
      const b = parseInt(color.slice(5, 7), 16);
      
      return {
        primary: `rgb(${r}, ${g}, ${b})`,
        secondary: `rgba(${r}, ${g}, ${b}, 0.7)`,
        dim: `rgba(${r}, ${g}, ${b}, 0.5)`,
        glow: `0 0 20px rgba(${r}, ${g}, ${b}, 0.3)`,
        bg: `rgba(${r}, ${g}, ${b}, 0.1)`,
        border: `rgba(${r}, ${g}, ${b}, 0.4)`,
        accent: `linear-gradient(to right, rgba(${r}, ${g}, ${b}, 0.3), transparent)`
      };
    };

    // Use the new dynamic color system
    const dynamicColor = modelColor || (actualModelName ? getModelColor(actualModelName) : '#10B981');
    const colors = getDynamicColors(dynamicColor);

    return (
      <div className="flex flex-col h-full">
        {/* Header */}
        <motion.div 
          className="p-4 border-b bg-gradient-to-r from-matrix-black to-matrix-dark relative overflow-hidden"
          style={{ borderColor: colors.border }}
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Animated background effect */}
          <div 
            className="absolute inset-0 opacity-10 animate-matrix-scan"
            style={{ background: colors.accent }}
          ></div>
          
          <div className="relative z-10">
            {/* Persona-aware header */}
            {(() => {
              const persona = personaId ? PERSONAS[personaId] : null;
              const displayName = persona ? persona.name.toUpperCase() : modelName.toUpperCase();
              const displayText = persona 
                ? `${displayName} (${modelName.toUpperCase()})`  // "NIETZSCHE (GPT-4O)"
                : modelName.toUpperCase();  // Just "GPT-4O"
              
              return (
                <div className="flex items-center justify-center gap-3">
                  {persona && (
                    <img 
                      src={persona.portrait} 
                      alt={persona.name}
                      className="w-16 h-16 border-2 border-matrix-green shadow-[0_0_15px_rgba(0,255,0,0.6)]"
                      style={{ imageRendering: 'crisp-edges' }}
                    />
                  )}
                  <h2 
                    className="text-xl font-matrix font-bold tracking-wider drop-shadow-lg"
                    style={{ color: colors.primary }}
                  >
                    <TypewriterText 
                      text={displayText}
                      speed={80}
                      className="drop-shadow-lg"
                    />
                  </h2>
                </div>
              );
            })()}
            <div className="flex items-center gap-2 mt-1">
              {/* ENHANCED VISUAL FEEDBACK: Dynamic colors for processing dots */}
              {isLoading ? (
                // Three animated dots when processing - Now using dynamic colors
                <div className="flex gap-1">
                  {[0, 1, 2].map((i) => (
                    <motion.div
                      key={i}
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: colors.primary }}
                      animate={{ 
                        scale: [1, 1.6, 1],
                        opacity: [1, 1, 1], // Full opacity always for better visibility
                        boxShadow: [
                          `0 0 0px ${colors.primary}`, 
                          colors.glow, 
                          `0 0 0px ${colors.primary}`
                        ]
                      }}
                      transition={{ 
                        duration: 0.8, 
                        repeat: Infinity,
                        delay: i * 0.15, // Faster wave for more obvious motion
                        ease: "easeInOut"
                      }}
                    />
                  ))}
                </div>
              ) : (
                // Single pulsating dot when idle - Dynamic color
                <motion.div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: colors.dim }}
                  animate={{ 
                    opacity: [0.3, 0.7, 0.3],
                    scale: [1, 1.1, 1]
                  }}
                  transition={{ 
                    duration: 2, 
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                />
              )}
              {/* DEBUG: Add visual indicator of loading state */}
              <span 
                className="text-xs ml-2 font-matrix"
                style={{ color: colors.secondary }}
              >
                {isLoading ? 'PROC' : 'IDLE'}
              </span>
            </div>
          </div>
        </motion.div>

        {/* Messages Container */}
        <div 
          ref={ref}
          className="flex-grow overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-matrix-green-dark scrollbar-track-matrix-darker"
        >
          <AnimatePresence>
            {messages.length === 0 ? (
              <motion.div 
                className="flex items-center justify-center h-full"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5 }}
              >
                <div className="text-center">
                  <motion.div
                    className="text-6xl mb-4 opacity-30"
                    style={{ color: colors.primary }}
                    animate={{ 
                      scale: [1, 1.1, 1],
                      opacity: [0.3, 0.6, 0.3]
                    }}
                    transition={{ duration: 3, repeat: Infinity }}
                  >
                    ⚡
                  </motion.div>
                  <p 
                    className="font-matrix text-sm"
                    style={{ color: colors.secondary }}
                  >
                    Neural core awaiting initialization...
                  </p>
                </div>
              </motion.div>
            ) : (
              messages.map((message, index) => {
                const isCurrentlyPlaying = playingMessageId === message.id;
                
                return (
                <motion.div
                  key={message.id}
                  className={`matrix-message relative group ${isCurrentlyPlaying ? 'ring-2 ring-matrix-green ring-opacity-75' : ''}`}
                  initial={{ opacity: 0, x: message.sender === modelName ? -50 : 50, scale: 0.9 }}
                  animate={{ 
                    opacity: 1, 
                    x: 0, 
                    scale: isCurrentlyPlaying ? 1.02 : 1,
                    boxShadow: isCurrentlyPlaying ? '0 0 20px rgba(16, 185, 129, 0.5)' : 'none'
                  }}
                  transition={{ 
                    duration: 0.5, 
                    delay: index * 0.1,
                    type: "spring",
                    stiffness: 100
                  }}
                  whileHover={{ scale: 1.02 }}
                >
                  {/* Message Header */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span 
                        className="text-xs font-matrix font-bold tracking-wider"
                        style={{ color: colors.primary }}
                      >
                        {(message.sender || 'UNKNOWN').toUpperCase()}
                      </span>
                      <motion.div
                        className="w-1 h-1 rounded-full"
                        style={{ backgroundColor: colors.primary }}
                        animate={{ opacity: [1, 0.3, 1] }}
                        transition={{ duration: 2, repeat: Infinity }}
                      />
                    </div>
                    <span 
                      className="text-xs font-matrix"
                      style={{ color: colors.secondary }}
                    >
                      {new Date(message.timestamp).toLocaleTimeString()}
                    </span>
                  </div>

                  {/* Message Content */}
                  <div 
                    className="text-sm leading-relaxed font-matrix-mono"
                    style={{ color: colors.primary }}
                  >
                    {index === messages.length - 1 ? (
                      <TypewriterText 
                        text={message.text}
                        speed={15} // 15ms per character - faster, smoother typing
                        mode="character" // character-by-character for smoother animation
                        allowSkip={true} // click to complete instantly
                        pauseOnPunctuation={false} // disable for character mode
                        className="block"
                        onComplete={() => {
                          // Notify parent that typing is complete for this message
                          console.log(`🎯 TYPEWRITER COMPLETE: ${modelName} finished typing message:`, {
                            messageId: message.id,
                            modelName,
                            messageText: message.text.substring(0, 50) + '...',
                            isLastMessage: index === messages.length - 1,
                            senderMatches: message.sender === modelName
                          });
                          
                          // We'll use a custom event to notify the debate hook
                          const event = new CustomEvent('typingComplete', { 
                            detail: { modelName, messageId: message.id } 
                          });
                          console.log(`🎯 DISPATCHING typingComplete event:`, event.detail);
                          window.dispatchEvent(event);
                        }}
                      />
                    ) : (
                      message.text
                    )}
                  </div>

                  {/* Audio Player Integration - Shows for all messages (persona or model) */}
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <AudioPlayer 
                      text={message.text} 
                      personaId={message.personaId}
                      modelName={actualModelName}
                    />
                  </div>
                  
                  {/* Decorative Border */}
                  <div 
                    className={`absolute inset-0 rounded-lg border transition-opacity duration-300 pointer-events-none ${
                      isCurrentlyPlaying ? 'opacity-100' : 'opacity-0 group-hover:opacity-50'
                    }`}
                    style={{ borderColor: colors.border, boxShadow: colors.glow }}
                  ></div>
                </motion.div>
              );
              })
            )}
          </AnimatePresence>
        </div>
      </div>
    );
  }
);

ChatColumn.displayName = 'ChatColumn';

export default ChatColumn; 