// Simplified PositionSelector - UPDATED TO MATCH DUAL PERSONALITY MATRIX STYLE
// Removed random/manual complexity, just click to flip positions
// Now matches the elegant layout with model names above boxes and pro/con labels below

'use client';

import React from 'react';
import { motion } from 'framer-motion';

export type ModelPosition = 'pro' | 'con';

interface PositionAssignment {
  gpt: ModelPosition;
  claude: ModelPosition;
}

interface PositionSelectorProps {
  assignment: PositionAssignment;
  onAssignmentChange: (assignment: PositionAssignment) => void;
  disabled?: boolean;
}

const PositionSelector: React.FC<PositionSelectorProps> = ({
  assignment,
  onAssignmentChange,
  disabled = false
}) => {
  const handleModelToggle = (model: 'gpt' | 'claude') => {
    if (disabled) return;
    
    const newPosition = assignment[model] === 'pro' ? 'con' : 'pro';
    onAssignmentChange({
      ...assignment,
      [model]: newPosition,
      // Automatically flip the other model to maintain opposition
      [model === 'gpt' ? 'claude' : 'gpt']: newPosition === 'pro' ? 'con' : 'pro'
    });
  };

  const getPositionIcon = (position: ModelPosition) => {
    return position === 'pro' ? '👍' : '👎';
  };

  const getPositionColor = (position: ModelPosition) => {
    return position === 'pro' ? 'text-green-400' : 'text-red-400';
  };

  const getBoxBg = (model: 'gpt' | 'claude') => {
    return model === 'gpt' ? 'bg-gray-100' : 'bg-orange-100';
  };

  const getBoxBorder = (model: 'gpt' | 'claude') => {
    return model === 'gpt' ? 'border-gray-600' : 'border-matrix-orange-dark';
  };

  return (
    <motion.div 
      className="matrix-panel p-6 rounded-lg"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* Header - Centered */}
      <div className="text-center mb-6">
        <h3 className="text-lg font-matrix text-matrix-green mb-2 tracking-wider">
          POSITION ASSIGNMENT
        </h3>
        <p className="text-sm text-matrix-green-dim">
          Configure debate positions
        </p>
      </div>

      {/* Model Position Cards */}
      <div className="grid grid-cols-2 gap-6">
        {/* GPT Position */}
        <motion.div 
          className="relative"
          whileHover={{ scale: 1.02 }}
          transition={{ duration: 0.2 }}
        >
          {/* GPT Title - Above Box */}
          <div className="text-center mb-3">
            <h4 className="text-xl font-matrix text-gray-300 tracking-wider">GPT-4</h4>
          </div>
          
          <motion.div
            className={`${getBoxBg('gpt')} p-5 rounded-lg border ${getBoxBorder('gpt')} cursor-pointer transition-all duration-300 hover:scale-105 ${
              disabled ? 'opacity-50 cursor-not-allowed' : ''
            }`}
            onClick={() => handleModelToggle('gpt')}
            whileHover={!disabled ? { scale: 1.05 } : {}}
            whileTap={!disabled ? { scale: 0.95 } : {}}
          >
            <div className="text-center">
              <div className="text-4xl mb-2">{getPositionIcon(assignment.gpt)}</div>
            </div>
          </motion.div>
          
          {/* Pro/Con Label - Below Box */}
          <div className="text-center mt-3">
            <div className={`text-lg font-matrix ${getPositionColor(assignment.gpt)} tracking-wider`}>
              {assignment.gpt.toUpperCase()}
            </div>
          </div>
        </motion.div>

        {/* Claude Position */}
        <motion.div 
          className="relative"
          whileHover={{ scale: 1.02 }}
          transition={{ duration: 0.2 }}
        >
          {/* Claude Title - Above Box */}
          <div className="text-center mb-3">
            <h4 className="text-xl font-matrix text-matrix-orange tracking-wider">CLAUDE</h4>
          </div>
          
          <motion.div
            className={`${getBoxBg('claude')} p-5 rounded-lg border ${getBoxBorder('claude')} cursor-pointer transition-all duration-300 hover:scale-105 ${
              disabled ? 'opacity-50 cursor-not-allowed' : ''
            }`}
            onClick={() => handleModelToggle('claude')}
            whileHover={!disabled ? { scale: 1.05 } : {}}
            whileTap={!disabled ? { scale: 0.95 } : {}}
          >
            <div className="text-center">
              <div className="text-4xl mb-2">{getPositionIcon(assignment.claude)}</div>
            </div>
          </motion.div>
          
          {/* Pro/Con Label - Below Box */}
          <div className="text-center mt-3">
            <div className={`text-lg font-matrix ${getPositionColor(assignment.claude)} tracking-wider`}>
              {assignment.claude.toUpperCase()}
            </div>
          </div>
        </motion.div>
      </div>

      {/* Instruction Text */}
      <motion.div
        className="matrix-panel-inner p-3 rounded text-center mt-6"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="text-xs text-matrix-green-dim mb-1">DIRECT CONTROL</div>
        <div className="text-sm text-matrix-green">
          {disabled ? 'Position assignment locked during debate' : 'Click on any model to flip their position'}
        </div>
      </motion.div>
    </motion.div>
  );
};

export default PositionSelector; 