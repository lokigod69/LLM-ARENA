// Matrix Pill Implementation: CSS Grid-based slider for perfect alignment
// Uses 11-column grid system where track, numbers, and thumb share same coordinate system
// Updated with Matrix philosophy, refined personality descriptions, and pill aesthetics

'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { calculatePersonalityParams } from '@/lib/orchestrator';

interface AgreeabilitySliderProps {
  value: number; // 0-10
  onChange: (value: number) => void;
  disabled?: boolean;
}

const AgreeabilitySlider: React.FC<AgreeabilitySliderProps> = ({
  value,
  onChange,
  disabled = false
}) => {
  const personality = calculatePersonalityParams(value);
  
  // Matrix Pill color scheme: Blue (low) to Red (high)
  const getSliderColor = (level: number) => {
    const ratio = level / 10;
    if (ratio <= 0.2) return 'from-blue-600 to-blue-500'; // Deep Blue Pill
    if (ratio <= 0.4) return 'from-blue-500 to-purple-500'; // Blue to Purple
    if (ratio <= 0.6) return 'from-purple-500 to-purple-400'; // Purple transition
    if (ratio <= 0.8) return 'from-purple-400 to-red-500'; // Purple to Red
    return 'from-red-500 to-red-600'; // Deep Red Pill
  };

  const getPillIcon = (level: number) => {
    if (level <= 2) return '⚔️'; // Combative - sword for warriors
    if (level <= 4) return '🥊'; // Argumentative - boxing glove for fighters  
    if (level <= 6) return '⚖️'; // Balanced - scales for justice
    if (level <= 8) return '🤝'; // Diplomatic - handshake for cooperation
    return '🕊️'; // Peaceful - dove for harmony
  };

  const getPillGlow = (level: number) => {
    if (level <= 3) return '0 0 20px rgba(59, 130, 246, 0.5)'; // Blue glow
    if (level <= 6) return '0 0 20px rgba(147, 51, 234, 0.5)'; // Purple glow  
    return '0 0 20px rgba(239, 68, 68, 0.5)'; // Red glow
  };

  const getThumbColor = (level: number) => {
    if (level <= 3) return 'bg-blue-500';
    if (level <= 6) return 'bg-purple-500'; 
    return 'bg-red-500';
  };

  return (
    <div className="matrix-panel p-4 rounded-lg">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-matrix text-matrix-green tracking-wider">
          MATRIX PROTOCOL
        </h3>
        <div className="flex items-center gap-2">
          <motion.span 
            className="text-2xl"
            animate={{ 
              filter: `drop-shadow(${getPillGlow(value)})`,
              scale: [1, 1.1, 1]
            }}
            transition={{ 
              filter: { duration: 0.3 },
              scale: { duration: 2, repeat: Infinity }
            }}
          >
            {getPillIcon(value)}
          </motion.span>
          <span className="text-sm text-matrix-green-dim">
            Level {value}
          </span>
        </div>
      </div>

      {/* Pill Icons on Sides */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-2xl">💙</span>
          <span className="text-xs text-blue-400 font-matrix">BLUE PILL</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-red-400 font-matrix">RED PILL</span>
          <span className="text-2xl">❤️</span>
        </div>
      </div>

      {/* Main Slider - CSS GRID APPROACH */}
      <div className="relative mb-6">
        <div className="flex justify-between text-xs text-matrix-green-dim mb-2">
          <span>POSITION DEFENDER</span>
          <span>TRUTH SEEKER</span>
        </div>
        
        {/* CSS Grid Container - 11 columns for perfect alignment */}
        <div className="relative">
          {/* Background Track */}
          <div className="w-full h-4 bg-gradient-to-r from-blue-600 via-purple-500 to-red-600 rounded-full opacity-30 mb-4"></div>
          
          {/* Active Track */}
          <div className="absolute top-0 left-0 w-full h-4 bg-matrix-gray rounded-full overflow-hidden mb-4">
            <motion.div
              className={`h-full bg-gradient-to-r ${getSliderColor(value)} rounded-full`}
              initial={{ width: '0%' }}
              animate={{ width: `${(value / 10) * 100}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
          
          {/* Invisible Range Input for Interaction - Extended to cover entire area */}
          <input
            type="range"
            min="0"
            max="10"
            step="1"
            value={value}
            onChange={(e) => onChange(Number(e.target.value))}
            disabled={disabled}
            className="absolute top-0 left-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed z-10"
          />

          {/* Grid System for Numbers and Thumb */}
          <div className="grid grid-cols-11 gap-0 relative mt-6">
            {Array.from({ length: 11 }, (_, i) => (
              <div
                key={i}
                className="relative flex flex-col items-center cursor-pointer hover:bg-matrix-green/10 rounded p-1 transition-colors duration-200"
                onClick={() => !disabled && onChange(i)}
              >
                {/* Thumb positioned in grid cell */}
                {i === value && (
                  <motion.div
                    className={`w-6 h-6 rounded-full border-2 border-matrix-dark shadow-lg mb-2 ${getThumbColor(value)} cursor-pointer`}
                    animate={{ 
                      scale: disabled ? 0.8 : 1,
                      boxShadow: disabled ? 'none' : getPillGlow(value)
                    }}
                    transition={{ duration: 0.2 }}
                    initial={{ scale: 0 }}
                    whileHover={{ scale: disabled ? 0.8 : 1.1 }}
                    whileTap={{ scale: disabled ? 0.8 : 0.95 }}
                  />
                )}
                
                {/* Number label */}
                <div
                  className={`text-xs cursor-pointer ${
                    i === value ? 'text-matrix-green font-bold' : 'text-matrix-green-dim hover:text-matrix-green'
                  } transition-colors duration-200`}
                >
                  {i}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Personality Stats */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <motion.div
          className="matrix-panel-inner p-3 rounded"
          whileHover={{ scale: 1.02 }}
          transition={{ duration: 0.2 }}
        >
          <div className="text-xs text-matrix-green-dim mb-1">POSITION DEFENDING</div>
          <div className="text-lg font-matrix text-blue-400">
            {personality.stubbornness}
          </div>
          <div className="w-full bg-matrix-gray rounded-full h-1 mt-1">
            <motion.div
              className="bg-blue-400 h-1 rounded-full"
              initial={{ width: '0%' }}
              animate={{ width: `${personality.stubbornness * 100}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </motion.div>

        <motion.div
          className="matrix-panel-inner p-3 rounded"
          whileHover={{ scale: 1.02 }}
          transition={{ duration: 0.2 }}
        >
          <div className="text-xs text-matrix-green-dim mb-1">TRUTH SEEKING</div>
          <div className="text-lg font-matrix text-red-400">
            {personality.cooperation}
          </div>
          <div className="w-full bg-matrix-gray rounded-full h-1 mt-1">
            <motion.div
              className="bg-red-400 h-1 rounded-full"
              initial={{ width: '0%' }}
              animate={{ width: `${personality.cooperation * 100}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </motion.div>
      </div>

      {/* Description */}
      <motion.div
        className="matrix-panel-inner p-3 rounded text-center"
        key={personality.description} // Re-animate when description changes
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="text-xs text-matrix-green-dim mb-1">MATRIX PERSONALITY</div>
        <div className="text-sm text-matrix-green font-medium">
          {personality.description}
        </div>
      </motion.div>
    </div>
  );
};

export default AgreeabilitySlider; 