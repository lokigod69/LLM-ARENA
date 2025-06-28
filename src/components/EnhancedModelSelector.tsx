// PHASE B: Enhanced Model Selector - Clean & Big Model Selection
// Redesigned to be bigger, cleaner, and remove redundant displays
// Just shows Model A and Model B with clean dropdowns - no duplicate info

'use client';

import React from 'react';
import { motion } from 'framer-motion';
import type { AvailableModel, ModelConfiguration } from '@/types';
import { 
  getAvailableModels, 
  getModelColor,
  getModelDisplayName 
} from '@/lib/modelConfigs';

interface EnhancedModelSelectorProps {
  modelA: ModelConfiguration;
  modelB: ModelConfiguration;
  onModelAChange: (config: ModelConfiguration) => void;
  onModelBChange: (config: ModelConfiguration) => void;
  disabled?: boolean;
}

const EnhancedModelSelector: React.FC<EnhancedModelSelectorProps> = ({
  modelA,
  modelB,
  onModelAChange,
  onModelBChange,
  disabled = false
}) => {
  const availableModels = getAvailableModels();

  const handleModelChange = (
    side: 'A' | 'B', 
    newModel: AvailableModel
  ) => {
    if (disabled) return;
    
    const currentConfig = side === 'A' ? modelA : modelB;
    const newConfig: ModelConfiguration = {
      ...currentConfig,
      name: newModel
    };
    
    if (side === 'A') {
      onModelAChange(newConfig);
    } else {
      onModelBChange(newConfig);
    }
  };

  const ModelDropdown = ({ 
    side, 
    config, 
    label 
  }: { 
    side: 'A' | 'B'; 
    config: ModelConfiguration;
    label: string;
  }) => {
    return (
      <motion.div 
        className="relative"
        whileHover={{ scale: 1.01 }}
        transition={{ duration: 0.2 }}
      >
        {/* Side Label - Bigger and more prominent */}
        <div className="text-center mb-6">
          <h4 className="text-3xl font-matrix font-bold text-matrix-green tracking-wider mb-2">
            {label}
          </h4>
          <div className="w-16 h-0.5 bg-matrix-green mx-auto opacity-60"></div>
        </div>
        
        {/* Model Selection Dropdown - Much bigger and cleaner */}
        <div className="relative">
          <select
            value={config.name}
            onChange={(e) => handleModelChange(side, e.target.value as AvailableModel)}
            disabled={disabled}
            className={`w-full p-6 pr-14 rounded-xl bg-matrix-darker border-3 border-matrix-green/40 
              text-matrix-green font-matrix tracking-wider text-xl font-bold
              focus:border-matrix-green focus:ring-4 focus:ring-matrix-green/30 outline-none
              disabled:opacity-50 disabled:cursor-not-allowed
              hover:border-matrix-green/80 hover:bg-matrix-dark transition-all duration-300
              cursor-pointer shadow-lg appearance-none`}
            style={{ 
              backgroundColor: '#0D0D0D',
              color: getModelColor(config.name),
              borderColor: `${getModelColor(config.name)}60`,
              minHeight: '80px'
            }}
          >
            {availableModels.map((model) => (
              <option 
                key={model} 
                value={model}
                style={{ 
                  backgroundColor: '#0D0D0D',
                  color: getModelColor(model),
                  fontSize: '18px',
                  padding: '10px'
                }}
              >
                {getModelDisplayName(model)}
              </option>
            ))}
          </select>
          
          {/* Custom Clean Arrow - Replaces browser default */}
          <div 
            className="absolute right-5 top-1/2 transform -translate-y-1/2 pointer-events-none"
            style={{ color: getModelColor(config.name) }}
          >
            <svg 
              width="20" 
              height="20" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="3" 
              strokeLinecap="round" 
              strokeLinejoin="round"
              className="opacity-80"
            >
              <polyline points="6,9 12,15 18,9"></polyline>
            </svg>
          </div>
        </div>
      </motion.div>
    );
  };

  return (
    <motion.div 
      className="matrix-panel p-8 rounded-xl"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* Header - Bigger and more prominent */}
      <div className="text-center mb-8">
        <h3 className="text-2xl font-matrix font-bold text-matrix-green mb-3 tracking-wider">
          SELECTION MATRIX
        </h3>
        <div className="w-32 h-0.5 bg-matrix-green mx-auto mb-3 opacity-80"></div>
      </div>

      {/* Model Selection Dropdowns - Bigger grid with more spacing */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 max-w-4xl mx-auto">
        <ModelDropdown side="A" config={modelA} label="MODEL A" />
        <ModelDropdown side="B" config={modelB} label="MODEL B" />
      </div>
    </motion.div>
  );
};

export default EnhancedModelSelector; 