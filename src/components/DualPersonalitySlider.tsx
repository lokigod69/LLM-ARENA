// PHASE B: Enhanced Dual Personality Slider Component - UNIFIED MODEL SELECTION MATRIX
// Updated to support any model A vs model B with dynamic display names and colors
// Replaces hardcoded GPT/Claude with flexible model configuration system
// Maintains Matrix cyberpunk theme and all personality features
// EXTENSIVENESS FEATURE: Added response length control (1-5 levels) for each model
// UI ENHANCEMENT: Removed headers, combined sections, simplified response length display
// FINAL REFINEMENT: Unified layout with STANCE/SCOPE sections, single dice button at bottom, matching text sizes
// EMOJI UPDATE: Added emojis to scope sliders for concise to academic spectrum
// PERSONA INTEGRATION: Displays effective slider ranges when a persona is active.

'use client';

import { motion } from 'framer-motion';
import { useCallback } from 'react';
import type { ModelPosition, ModelConfiguration } from '@/types';
import { EXTENSIVENESS_PRESETS } from '@/types';
import { getModelDisplayConfig, getModelColor, getModelDisplayName } from '@/lib/modelConfigs';
import { PERSONAS } from '@/lib/personas';

// Matrix personality type descriptions
const getPersonalityType = (level: number): string => {
  if (level <= 1) return 'BLUE PILL WARRIOR';
  if (level <= 2) return 'POSITION DEFENDER';
  if (level <= 3) return 'LOYAL ADVOCATE';
  if (level <= 4) return 'STEADY SUPPORTER';
  if (level <= 5) return 'MATRIX BALANCED';
  if (level <= 6) return 'DIPLOMATIC INQUIRER';
  if (level <= 7) return 'TRUTH EXPLORER';
  if (level <= 8) return 'REALITY QUESTIONER';
  if (level <= 9) return 'AWAKENING SEEKER';
  return 'RED PILL AWAKENED';
};

// Enhanced personality descriptions with Matrix philosophy
const getPersonalityDescription = (level: number): string => {
  if (level <= 1) return 'Defends the comfortable illusion with unwavering conviction';
  if (level <= 2) return 'Strongly advocates their assigned position with determination';
  if (level <= 3) return 'Maintains loyal support while showing tactical flexibility';
  if (level <= 4) return 'Provides steady backing with measured consideration';
  if (level <= 5) return 'Perfectly balanced between conviction and inquiry';
  if (level <= 6) return 'Diplomatically explores while building bridges';
  if (level <= 7) return 'Actively seeks deeper understanding and truth';
  if (level <= 8) return 'Questions assumptions and challenges surface reality';
  if (level <= 9) return 'Pursues authentic truth despite uncomfortable implications';
  return 'Fully awakened to reality, regardless of consequences';
};

// Matrix-themed pill icons for different personality levels
const getPillIcon = (level: number): string => {
  switch(level) {
    case 0: return '⚔️'; // Blue Pill Warrior - sword for combat
    case 1: return '🛡️'; // Position Defender - shield for defense  
    case 2: return '🏛️'; // Loyal Advocate - pillar for stability
    case 3: return '🤲'; // Steady Supporter - hands for support
    case 4: return '🧭'; // Approaching Balance - compass for direction
    case 5: return '⚖️'; // Matrix Balanced - scales for balance
    case 6: return '🤝'; // Diplomatic Inquirer - handshake for diplomacy
    case 7: return '🔍'; // Truth Explorer - magnifying glass for search
    case 8: return '🌟'; // Reality Questioner - star for enlightenment
    case 9: return '👁️'; // Awakening Seeker - eye for seeing truth
    case 10: return '🕊️'; // Red Pill Awakened - dove for enlightenment
    default: return '⚖️';
  }
};

// 11-color smooth gradient palette (blue → purple → red)
const sliderColors = [
  '#0047FF', // 0: Bright blue (extreme)
  '#1A40ED', // 1: Blue-purple blend
  '#3339DA', // 2: More purple
  '#4D32C8', // 3: Blue-purple
  '#662BB5', // 4: Purple-blue
  '#8024A3', // 5: Vibrant purple (center)
  '#991C91', // 6: Purple-red
  '#B3157E', // 7: More red-purple
  '#CC0E6C', // 8: Purple-red blend
  '#E60759', // 9: Red-purple
  '#FF0047'  // 10: Bright red-pink (extreme)
];

// Get color with intensity variation (dimmer middle, brighter extremes) - VERY SUBTLE BALANCE
const getSliderColor = (level: number): string => {
  const baseColor = sliderColors[level];
  const distanceFromCenter = Math.abs(level - 5); // Distance from center (5)
  const intensity = 0.30 + (distanceFromCenter * 0.07); // 0.30 at center, 0.65 at extremes (very subtle balance)
  
  // Convert hex to RGB and apply intensity
  const r = parseInt(baseColor.slice(1, 3), 16);
  const g = parseInt(baseColor.slice(3, 5), 16);
  const b = parseInt(baseColor.slice(5, 7), 16);
  
  // Apply intensity with very subtle variation
  const adjustedR = Math.round(r * intensity);
  const adjustedG = Math.round(g * intensity);
  const adjustedB = Math.round(b * intensity);
  
  return `rgb(${adjustedR}, ${adjustedG}, ${adjustedB})`;
};

// Create smooth 11-color background gradient with dynamic opacity spotlight
const getBackgroundGradient = (currentLevel: number): string => {
  const gradientStops = sliderColors.map((color, index) => {
    const percentage = (index / 10) * 100;
    
    // Calculate distance from current thumb position
    const distance = Math.abs(index - currentLevel);
    
    // Calculate opacity based on distance (closer = more opaque, farther = more transparent)
    // Maximum opacity at thumb position, minimum at opposite end
    const maxDistance = 10; // Maximum possible distance
    const minOpacity = 0.15; // Minimum opacity (15%)
    const maxOpacity = 1.0;   // Maximum opacity (100%)
    
    // Linear interpolation: closer positions get higher opacity
    const opacity = maxOpacity - ((distance / maxDistance) * (maxOpacity - minOpacity));
    
    // Convert hex to rgba for opacity
    const r = parseInt(color.slice(1, 3), 16);
    const g = parseInt(color.slice(3, 5), 16);
    const b = parseInt(color.slice(5, 7), 16);
    
    return `rgba(${r}, ${g}, ${b}, ${opacity}) ${percentage}%`;
  }).join(', ');
  
  return `linear-gradient(to right, ${gradientStops})`;
};

// Matrix pill glow effects
const getPillGlow = (level: number): string => {
  if (level <= 3) return '0 0 20px rgba(59, 130, 246, 0.5)'; // Blue glow
  if (level <= 6) return '0 0 20px rgba(147, 51, 234, 0.5)'; // Purple glow  
  return '0 0 20px rgba(239, 68, 68, 0.5)'; // Red glow
};

// Get thumb color based on agreeability level
const getThumbColor = (level: number): string => {
  return getSliderColor(level);
};

const getThumbBorderColor = (level: number): string => {
  const baseColor = getSliderColor(level);
  // Add some brightness to the border for better visibility
  return baseColor;
};

// Get personality text color with enhanced readability
const getPersonalityTextColor = (level: number): string => {
  if (level <= 3) return '#60A5FA'; // Light blue
  if (level <= 6) return '#A78BFA'; // Light purple  
  return '#FB7185'; // Light red/pink
};

interface DualPersonalitySliderProps {
  modelA: ModelConfiguration;
  modelB: ModelConfiguration;
  onModelAChange: (config: ModelConfiguration) => void;
  onModelBChange: (config: ModelConfiguration) => void;
  disabled?: boolean;
}

export default function DualPersonalitySlider({
  modelA,
  modelB,
  onModelAChange,
  onModelBChange,
  disabled = false
}: DualPersonalitySliderProps) {
  // Handle slider changes with haptic feedback
  const handleModelAChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newLevel = parseInt(e.target.value);
    onModelAChange({
      ...modelA,
      agreeabilityLevel: newLevel
    });
  }, [modelA, onModelAChange]);

  const handleModelBChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newLevel = parseInt(e.target.value);
    onModelBChange({
      ...modelB,
      agreeabilityLevel: newLevel
    });
  }, [modelB, onModelBChange]);

  // Position handling functions
  const handlePositionToggle = useCallback((model: 'A' | 'B') => {
    if (disabled) return;
    
    if (model === 'A') {
      const newPosition = modelA.position === 'pro' ? 'con' : 'pro';
      const otherPosition = newPosition === 'pro' ? 'con' : 'pro';
      
      onModelAChange({ ...modelA, position: newPosition });
      onModelBChange({ ...modelB, position: otherPosition });
    } else {
      const newPosition = modelB.position === 'pro' ? 'con' : 'pro';
      const otherPosition = newPosition === 'pro' ? 'con' : 'pro';
      
      onModelBChange({ ...modelB, position: newPosition });
      onModelAChange({ ...modelA, position: otherPosition });
    }
  }, [modelA, modelB, onModelAChange, onModelBChange, disabled]);

  const getPositionIcon = (position: ModelPosition) => {
    return position === 'pro' ? '👍' : '👎';
  };

  const getPositionColor = (position: ModelPosition) => {
    // Use Matrix green for PRO and Red Pill Awakened red for CON
    return position === 'pro' ? '#00FF41' : '#FF0047'; // Matrix green : Red pill red
  };

  // Response Length Color Functions (5 levels: Blue -> Purple -> Red)
  const getResponseLengthColor = (level: number): string => {
    switch(level) {
      case 1: return '#3b82f6'; // Blue
      case 2: return '#8b5cf6'; // Purple-Blue
      case 3: return '#a855f7'; // Purple (middle)
      case 4: return '#ec4899'; // Pink-Red
      case 5: return '#ef4444'; // Red
      default: return '#a855f7'; // Purple
    }
  };

  const getResponseLengthBorderColor = (level: number): string => {
    return `${getResponseLengthColor(level)}40`; // Add transparency
  };

  const getResponseLengthGradient = (level: number): string => {
    const color = getResponseLengthColor(level);
    return `linear-gradient(to right, ${color}20 0%, ${color}40 50%, ${color}20 100%)`;
  };

  // Get model-specific display config
  const modelAConfig = getModelDisplayConfig(modelA.name);
  const modelBConfig = getModelDisplayConfig(modelB.name);

  // Dice Icon for randomization
  const DiceIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
      <path d="M15.66 3.12a3 3 0 0 1 5.22 2.65l-1.34 8.04a3 3 0 0 1-5.22-2.65Z"/>
      <path d="M12.55 5.23 9.4 3.1a3 3 0 0 0-3.72 4.54l3.14 2.13a3 3 0 0 0 3.73-4.54Z"/>
      <path d="M10.88 12.55 7.1 15.8a3 3 0 0 1-4.54-3.72l3.78-3.25a3 3 0 0 1 4.54 3.72Z"/>
    </svg>
  );

  return (
    <motion.div 
      className="matrix-panel p-8 rounded-xl bg-gradient-to-b from-matrix-darker to-matrix-black border-2 border-matrix-green/20"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* STANCE Control Section */}
      <motion.div
        className="mt-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        <h3 className="text-2xl font-matrix font-bold text-matrix-green text-center mb-4 tracking-wider">
          STANCE
        </h3>
        
        {/* Model A and B Sliders */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Model A Slider */}
          <motion.div 
            className="relative"
            whileHover={{ scale: 1.02 }}
            transition={{ duration: 0.2 }}
          >
            <div 
              className="bg-gradient-to-br from-matrix-dark to-matrix-darker p-5 rounded-lg border"
              style={{ borderColor: `${getModelColor(modelA.name)}40` }}
            >
              {/* Centered Icon and Level */}
              <div className="flex items-center justify-center gap-3 mb-4">
                <motion.span 
                  className="text-2xl"
                  animate={{ 
                    filter: `drop-shadow(${getPillGlow(modelA.agreeabilityLevel)})`,
                    scale: [1, 1.1, 1]
                  }}
                  transition={{ 
                    filter: { duration: 0.3 },
                    scale: { duration: 2, repeat: Infinity }
                  }}
                >
                  {getPillIcon(modelA.agreeabilityLevel)}
                </motion.span>
                <div 
                  className="font-matrix text-lg"
                  style={{ color: getModelColor(modelA.name) }}
                >
                  {modelA.agreeabilityLevel}
                </div>
              </div>

              {/* Model A Slider */}
              <div className="relative mb-4">
                <input
                  type="range"
                  min="0"
                  max="10"
                  value={modelA.personaId ? (10 - PERSONAS[modelA.personaId].lockedTraits.baseStubbornness) : modelA.agreeabilityLevel}
                  onChange={handleModelAChange}
                  disabled={disabled || !!modelA.personaId}
                  className={`w-full h-2 bg-matrix-darker rounded-lg appearance-none slider-model-a ${
                    disabled || !!modelA.personaId ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'
                  }`}
                  style={{
                    background: getBackgroundGradient(modelA.agreeabilityLevel),
                  }}
                />
              </div>

              {/* Model A Status */}
              <div>
                <div className="text-sm font-matrix text-center" style={{ color: getPersonalityTextColor(modelA.agreeabilityLevel) }}>
                  {getPersonalityType(modelA.agreeabilityLevel)}
                </div>
                <div className="text-xs text-center opacity-80" style={{ color: getPersonalityTextColor(modelA.agreeabilityLevel) }}>
                  {getPersonalityDescription(modelA.agreeabilityLevel)}
                </div>
              </div>

              {/* Green Divider */}
              <div className="my-4">
                <div className="h-px bg-gradient-to-r from-transparent via-matrix-green to-transparent opacity-50"></div>
              </div>

              {/* Model A Position Assignment */}
              <div className="text-center">
                <div 
                  className="text-xs mb-2 tracking-wider"
                  style={{ color: getModelColor(modelA.name) }}
                >
                  POSITION
                </div>
                <motion.div
                  className="cursor-pointer p-3 rounded-lg"
                  style={{ 
                    backgroundColor: modelA.position === 'pro' 
                      ? 'rgba(34, 197, 94, 0.1)' 
                      : 'rgba(239, 68, 68, 0.1)' 
                  }}
                  onClick={() => handlePositionToggle('A')}
                  whileHover={!disabled ? { scale: 1.1 } : {}}
                  whileTap={!disabled ? { scale: 0.9 } : {}}
                  transition={{ duration: 0.2 }}
                >
                  <motion.div
                    className="text-3xl mb-1"
                    key={modelA.position} // Re-animate when position changes
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ duration: 0.4, type: "spring", stiffness: 200 }}
                  >
                    {getPositionIcon(modelA.position)}
                  </motion.div>
                  <div 
                    className="text-sm font-matrix tracking-wider"
                    style={{ color: getPositionColor(modelA.position) }}
                  >
                    {modelA.position.toUpperCase()}
                  </div>
                </motion.div>
              </div>
            </div>
          </motion.div>

          {/* Model B Slider */}
          <motion.div 
            className="relative"
            whileHover={{ scale: 1.02 }}
            transition={{ duration: 0.2 }}
          >
            <div 
              className="bg-gradient-to-br from-matrix-dark to-matrix-darker p-5 rounded-lg border"
              style={{ borderColor: `${getModelColor(modelB.name)}40` }}
            >
              {/* Centered Icon and Level */}
              <div className="flex items-center justify-center gap-3 mb-4">
                <motion.span 
                  className="text-2xl"
                  animate={{ 
                    filter: `drop-shadow(${getPillGlow(modelB.agreeabilityLevel)})`,
                    scale: [1, 1.1, 1]
                  }}
                  transition={{ 
                    filter: { duration: 0.3 },
                    scale: { duration: 2, repeat: Infinity }
                  }}
                >
                  {getPillIcon(modelB.agreeabilityLevel)}
                </motion.span>
                <div 
                  className="font-matrix text-lg"
                  style={{ color: getModelColor(modelB.name) }}
                >
                  {modelB.agreeabilityLevel}
                </div>
              </div>

              {/* Model B Slider */}
              <div className="relative mb-4">
                <input
                  type="range"
                  min="0"
                  max="10"
                  value={modelB.personaId ? (10 - PERSONAS[modelB.personaId].lockedTraits.baseStubbornness) : modelB.agreeabilityLevel}
                  onChange={handleModelBChange}
                  disabled={disabled || !!modelB.personaId}
                  className={`w-full h-2 bg-matrix-darker rounded-lg appearance-none slider-model-b ${
                    disabled || !!modelB.personaId ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'
                  }`}
                  style={{
                    background: getBackgroundGradient(modelB.agreeabilityLevel),
                  }}
                />
              </div>

              {/* Model B Status */}
              <div>
                <div className="text-sm font-matrix text-center" style={{ color: getPersonalityTextColor(modelB.agreeabilityLevel) }}>
                  {getPersonalityType(modelB.agreeabilityLevel)}
                </div>
                <div className="text-xs text-center opacity-80" style={{ color: getPersonalityTextColor(modelB.agreeabilityLevel) }}>
                  {getPersonalityDescription(modelB.agreeabilityLevel)}
                </div>
              </div>

              {/* Divider with Model B color */}
              <div className="my-4">
                <div 
                  className="h-px bg-gradient-to-r from-transparent to-transparent opacity-50"
                  style={{ 
                    background: `linear-gradient(to right, transparent, ${getModelColor(modelB.name)}, transparent)` 
                  }}
                ></div>
              </div>

              {/* Model B Position Assignment */}
              <div className="text-center">
                <div 
                  className="text-xs mb-2 tracking-wider"
                  style={{ color: getModelColor(modelB.name) }}
                >
                  POSITION
                </div>
                <motion.div
                  className="cursor-pointer p-3 rounded-lg"
                  style={{ 
                    backgroundColor: modelB.position === 'pro' 
                      ? 'rgba(34, 197, 94, 0.1)' 
                      : 'rgba(239, 68, 68, 0.1)' 
                  }}
                  onClick={() => handlePositionToggle('B')}
                  whileHover={!disabled ? { scale: 1.1 } : {}}
                  whileTap={!disabled ? { scale: 0.9 } : {}}
                  transition={{ duration: 0.2 }}
                >
                  <motion.div
                    className="text-3xl mb-1"
                    key={modelB.position} // Re-animate when position changes
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ duration: 0.4, type: "spring", stiffness: 200 }}
                  >
                    {getPositionIcon(modelB.position)}
                  </motion.div>
                  <div 
                    className="text-sm font-matrix tracking-wider"
                    style={{ color: getPositionColor(modelB.position) }}
                  >
                    {modelB.position.toUpperCase()}
                  </div>
                </motion.div>
              </div>
            </div>
          </motion.div>
        </div>
      </motion.div>

      {/* SCOPE Control Section */}
      <motion.div
        className="mt-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
      >
        <h3 className="text-2xl font-matrix font-bold text-matrix-green text-center mb-4 tracking-wider">
          SCOPE
        </h3>
        
        {/* Model A Extensiveness */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <motion.div 
            className="relative"
            whileHover={{ scale: 1.02 }}
            transition={{ duration: 0.2 }}
          >
            <div 
              className="bg-gradient-to-br from-matrix-dark to-matrix-darker p-5 rounded-lg border"
              style={{ borderColor: getResponseLengthBorderColor(modelA.extensivenessLevel) }}
            >
              {/* Centered Level and Status */}
              <div className="flex items-center justify-center gap-3 mb-4">
                <div 
                  className="text-2xl"
                >
                  {(() => {
                    switch(modelA.extensivenessLevel) {
                      case 1: return '💬';
                      case 2: return '⚡';
                      case 3: return '🎯';
                      case 4: return '✨';
                      case 5: return '📚';
                      default: return '🎯';
                    }
                  })()}
                </div>
                <div 
                  className="text-2xl font-bold"
                  style={{ color: getResponseLengthColor(modelA.extensivenessLevel) }}
                >
                  {modelA.extensivenessLevel}
                </div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-matrix tracking-wider" style={{ color: getResponseLengthColor(modelA.extensivenessLevel) }}>
                      SCOPE
                    </span>
                    <span className="text-sm font-mono" style={{ color: getResponseLengthColor(modelA.extensivenessLevel) }}>
                      {modelA.extensivenessLevel}
                    </span>
                  </div>
                  <div 
                    className="text-xs font-matrix tracking-wider"
                    style={{ color: getResponseLengthColor(modelA.extensivenessLevel) }}
                  >
                    {(() => {
                      switch(modelA.extensivenessLevel) {
                        case 1: return 'CONCISE';
                        case 2: return 'BRIEF';
                        case 3: return 'BALANCED';
                        case 4: return 'DETAILED';
                        case 5: return 'ACADEMIC';
                        default: return 'BALANCED';
                      }
                    })()}
                  </div>
                </div>
              </div>
              
              <div className="relative mb-4">
                <input
                  type="range"
                  min="1"
                  max="5"
                  value={modelA.personaId ? PERSONAS[modelA.personaId].lockedTraits.responseLength : modelA.extensivenessLevel}
                  onChange={(e) => onModelAChange({ ...modelA, extensivenessLevel: parseInt(e.target.value) })}
                  disabled={disabled || !!modelA.personaId}
                  className={`w-full h-2 bg-matrix-darker rounded-lg appearance-none slider-response-a ${
                    disabled || !!modelA.personaId ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'
                  }`}
                  style={{
                    background: getResponseLengthGradient(modelA.extensivenessLevel),
                  }}
                />
              </div>
              
              <div className="flex justify-between text-xs mb-3">
                <span style={{ color: '#3b82f6' }}>💬 CONCISE 📝</span>
                <span style={{ color: '#ef4444' }}>📖 ACADEMIC 🎓</span>
              </div>
              
              <div 
                className="text-xs text-center p-2 rounded"
                style={{ 
                  backgroundColor: `${getResponseLengthColor(modelA.extensivenessLevel)}20`,
                  color: getResponseLengthColor(modelA.extensivenessLevel)
                }}
              >
                {(() => {
                  switch(modelA.extensivenessLevel) {
                    case 1: return 'Single powerful statement - maximum impact, minimum words';
                    case 2: return 'Brief but complete - essential points only';
                    case 3: return 'Balanced response - key arguments with some context';
                    case 4: return 'Detailed analysis - comprehensive reasoning and examples';
                    case 5: return 'Academic depth - thorough exploration with nuanced analysis';
                    default: return 'Balanced response - key arguments with some context';
                  }
                })()}
              </div>
            </div>
          </motion.div>

          {/* Model B Extensiveness */}
          <motion.div 
            className="relative"
            whileHover={{ scale: 1.02 }}
            transition={{ duration: 0.2 }}
          >
            <div 
              className="bg-gradient-to-br from-matrix-dark to-matrix-darker p-5 rounded-lg border"
              style={{ borderColor: getResponseLengthBorderColor(modelB.extensivenessLevel) }}
            >
              {/* Centered Level and Status */}
              <div className="flex items-center justify-center gap-3 mb-4">
                <div 
                  className="text-2xl"
                >
                  {(() => {
                    switch(modelB.extensivenessLevel) {
                      case 1: return '💬';
                      case 2: return '⚡';
                      case 3: return '🎯';
                      case 4: return '✨';
                      case 5: return '📚';
                      default: return '🎯';
                    }
                  })()}
                </div>
                <div 
                  className="text-2xl font-bold"
                  style={{ color: getResponseLengthColor(modelB.extensivenessLevel) }}
                >
                  {modelB.extensivenessLevel}
                </div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-matrix tracking-wider" style={{ color: getResponseLengthColor(modelB.extensivenessLevel) }}>
                      SCOPE
                    </span>
                    <span className="text-sm font-mono" style={{ color: getResponseLengthColor(modelB.extensivenessLevel) }}>
                      {modelB.extensivenessLevel}
                    </span>
                  </div>
                  <div 
                    className="text-xs font-matrix tracking-wider"
                    style={{ color: getResponseLengthColor(modelB.extensivenessLevel) }}
                  >
                    {(() => {
                      switch(modelB.extensivenessLevel) {
                        case 1: return 'CONCISE';
                        case 2: return 'BRIEF';
                        case 3: return 'BALANCED';
                        case 4: return 'DETAILED';
                        case 5: return 'ACADEMIC';
                        default: return 'BALANCED';
                      }
                    })()}
                  </div>
                </div>
              </div>
              
              <div className="relative mb-4">
                <input
                  type="range"
                  min="1"
                  max="5"
                  value={modelB.personaId ? PERSONAS[modelB.personaId].lockedTraits.responseLength : modelB.extensivenessLevel}
                  onChange={(e) => onModelBChange({ ...modelB, extensivenessLevel: parseInt(e.target.value) })}
                  disabled={disabled || !!modelB.personaId}
                  className={`w-full h-2 bg-matrix-darker rounded-lg appearance-none slider-response-b ${
                    disabled || !!modelB.personaId ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'
                  }`}
                  style={{
                    background: getResponseLengthGradient(modelB.extensivenessLevel),
                  }}
                />
              </div>
              
              <div className="flex justify-between text-xs mb-3">
                <span style={{ color: '#3b82f6' }}>💬 CONCISE 📝</span>
                <span style={{ color: '#ef4444' }}>📖 ACADEMIC 🎓</span>
              </div>
              
              <div 
                className="text-xs text-center p-2 rounded"
                style={{ 
                  backgroundColor: `${getResponseLengthColor(modelB.extensivenessLevel)}20`,
                  color: getResponseLengthColor(modelB.extensivenessLevel)
                }}
              >
                {(() => {
                  switch(modelB.extensivenessLevel) {
                    case 1: return 'Single powerful statement - maximum impact, minimum words';
                    case 2: return 'Brief but complete - essential points only';
                    case 3: return 'Balanced response - key arguments with some context';
                    case 4: return 'Detailed analysis - comprehensive reasoning and examples';
                    case 5: return 'Academic depth - thorough exploration with nuanced analysis';
                    default: return 'Balanced response - key arguments with some context';
                  }
                })()}
              </div>
            </div>
          </motion.div>
        </div>
      </motion.div>

      {/* FINAL REFINEMENT: Single dice button at the bottom */}
      <motion.div 
        className="flex justify-center mt-6"
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.4, duration: 0.5 }}
      >
        <motion.button
          onClick={() => {
            // Randomize personalities and extensiveness
            const randomLevelA = Math.floor(Math.random() * 11);
            const randomLevelB = Math.floor(Math.random() * 11);
            const randomExtensiveA = Math.floor(Math.random() * 5) + 1;
            const randomExtensiveB = Math.floor(Math.random() * 5) + 1;
            const positionsA = Math.random() > 0.5 ? 'pro' : 'con';
            const positionsB = positionsA === 'pro' ? 'con' : 'pro';
            
            onModelAChange({
              ...modelA,
              agreeabilityLevel: randomLevelA,
              position: positionsA as ModelPosition,
              extensivenessLevel: randomExtensiveA
            });
            onModelBChange({
              ...modelB,
              agreeabilityLevel: randomLevelB,
              position: positionsB as ModelPosition,
              extensivenessLevel: randomExtensiveB
            });
          }}
          disabled={disabled}
          className="p-3 bg-matrix-dark/50 rounded-full text-5xl hover:bg-matrix-green/20 transition-colors duration-300 disabled:opacity-50"
          whileHover={{ scale: 1.1, rotate: 360 }}
          whileTap={{ scale: 0.9 }}
          title="Randomize stance and scope settings"
        >
          🎲
        </motion.button>
      </motion.div>

      <style jsx>{`
        .slider-model-a::-webkit-slider-thumb {
          appearance: none;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: ${getThumbColor(modelA.agreeabilityLevel)};
          cursor: pointer;
          border: 2px solid ${getThumbBorderColor(modelA.agreeabilityLevel)};
          box-shadow: 0 0 8px ${getThumbColor(modelA.agreeabilityLevel)};
          transition: all 0.3s ease;
        }
        
        .slider-model-b::-webkit-slider-thumb {
          appearance: none;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: ${getThumbColor(modelB.agreeabilityLevel)};
          cursor: pointer;
          border: 2px solid ${getThumbBorderColor(modelB.agreeabilityLevel)};
          box-shadow: 0 0 8px ${getThumbColor(modelB.agreeabilityLevel)};
          transition: all 0.3s ease;
        }
        
        .slider-model-a::-moz-range-thumb {
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: ${getThumbColor(modelA.agreeabilityLevel)};
          cursor: pointer;
          border: 2px solid ${getThumbBorderColor(modelA.agreeabilityLevel)};
          box-shadow: 0 0 8px ${getThumbColor(modelA.agreeabilityLevel)};
        }
        
        .slider-model-b::-moz-range-thumb {
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: ${getThumbColor(modelB.agreeabilityLevel)};
          cursor: pointer;
          border: 2px solid ${getThumbBorderColor(modelB.agreeabilityLevel)};
          box-shadow: 0 0 8px ${getThumbColor(modelB.agreeabilityLevel)};
        }

        .slider-response-a::-webkit-slider-thumb {
          appearance: none;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: ${getResponseLengthColor(modelA.extensivenessLevel)};
          cursor: pointer;
          border: 2px solid ${getResponseLengthColor(modelA.extensivenessLevel)};
          box-shadow: 0 0 8px ${getResponseLengthColor(modelA.extensivenessLevel)};
          transition: all 0.3s ease;
        }
        
        .slider-response-b::-webkit-slider-thumb {
          appearance: none;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: ${getResponseLengthColor(modelB.extensivenessLevel)};
          cursor: pointer;
          border: 2px solid ${getResponseLengthColor(modelB.extensivenessLevel)};
          box-shadow: 0 0 8px ${getResponseLengthColor(modelB.extensivenessLevel)};
          transition: all 0.3s ease;
        }
        
        .slider-response-a::-moz-range-thumb {
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: ${getResponseLengthColor(modelA.extensivenessLevel)};
          cursor: pointer;
          border: 2px solid ${getResponseLengthColor(modelA.extensivenessLevel)};
          box-shadow: 0 0 8px ${getResponseLengthColor(modelA.extensivenessLevel)};
        }
        
        .slider-response-b::-moz-range-thumb {
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: ${getResponseLengthColor(modelB.extensivenessLevel)};
          cursor: pointer;
          border: 2px solid ${getResponseLengthColor(modelB.extensivenessLevel)};
          box-shadow: 0 0 8px ${getResponseLengthColor(modelB.extensivenessLevel)};
        }
      `}</style>
    </motion.div>
  );
} 