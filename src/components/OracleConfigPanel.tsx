// Oracle Configuration Panel - Phase 1.1 Implementation
// Enhanced architecture with separate verdict system and advanced bias detection
// ARCHITECTURAL REFACTOR: Cleaner separation of concerns with improved UX
// REDUNDANCY FIX: Removed overlay popup - Oracle always accessible for better UX
// UI/UX FIXES: Added cursor-pointer class to analyze button, added loading text feedback below spinner

'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import type { 
  OracleConfig, 
  OracleLens, 
  OracleOutputFormat, 
  VerdictScope, 
  BiasDetection
} from '@/types/oracle';
import {
  LENS_DESCRIPTIONS,
  FORMAT_DESCRIPTIONS,
  VERDICT_DESCRIPTIONS,
  DEPTH_DESCRIPTIONS,
  ORACLE_CAPABLE_MODELS,
  LENS_COLORS,
  FORMAT_COLORS,
  VERDICT_COLORS
} from '@/types/oracle';
import { getModelDisplayName, getModelColor } from '@/lib/modelConfigs';

interface OracleConfigPanelProps {
  onAnalyze: (config: OracleConfig) => void;
  isAnalyzing: boolean;
  hasMessages: boolean;
  isOracleAvailable: boolean;
}

export default function OracleConfigPanel({ 
  onAnalyze, 
  isAnalyzing, 
  hasMessages,
  isOracleAvailable
}: OracleConfigPanelProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  
  // UPDATED: New default configuration with separate verdict system
  const [config, setConfig] = useState<OracleConfig>({
    oracleModel: 'deepseek-r1', // PHASE B: Default Oracle model
    primaryLens: 'philosophical',
    depthLevel: 3,
    outputFormat: 'narrative',
    verdict: {
      enabled: false,
      scope: 'disabled' // DEFAULT: disabled as requested
    },
    biasDetection: {
      enabled: false,
      analyzeDebaterBias: false,
      analyzeCensorship: false,
      culturalBiasCheck: false,
      politicalBiasCheck: false
    }
  });

  const updateConfig = (updates: Partial<OracleConfig>) => {
    setConfig(prev => ({ ...prev, ...updates }));
  };

  const updateVerdict = (updates: Partial<OracleConfig['verdict']>) => {
    setConfig(prev => ({
      ...prev,
      verdict: { ...prev.verdict, ...updates }
    }));
  };

  const updateBiasDetection = (updates: Partial<BiasDetection>) => {
    setConfig(prev => ({
      ...prev,
      biasDetection: { ...prev.biasDetection, ...updates }
    }));
  };

  const handleAnalyze = () => {
    onAnalyze(config);
  };

  return (
    <motion.div 
      className="matrix-panel p-6 rounded-lg relative"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-matrix text-matrix-green tracking-wider">
          🔮 ORACLE MATRIX
        </h3>
        <div className="text-xs text-matrix-green-dim">
          PHASE 2: FLEXIBLE ORACLE MODELS
        </div>
      </div>

      {/* PHASE 2: Oracle Model Selection */}
      <div className="mb-6">
        <h4 className="text-sm font-matrix text-matrix-green-dim mb-4 tracking-wider text-center">
          ORACLE MODEL SELECTION
        </h4>
        
        <div className="flex justify-center">
          <motion.div 
            className="relative w-80"
            whileHover={{ scale: 1.01 }}
            transition={{ duration: 0.2 }}
          >
            <select
              value={config.oracleModel}
              onChange={(e) => updateConfig({ oracleModel: e.target.value as any })}
              className="w-full p-4 pr-12 rounded-xl bg-matrix-darker border-2 border-purple-500/40 
                text-purple-400 font-matrix tracking-wider text-lg font-bold
                focus:border-purple-500 focus:ring-4 focus:ring-purple-500/30 outline-none
                hover:border-purple-500/80 hover:bg-matrix-dark transition-all duration-300
                cursor-pointer shadow-lg appearance-none"
              style={{ 
                backgroundColor: '#0D0D0D',
                color: getModelColor(config.oracleModel),
                borderColor: `${getModelColor(config.oracleModel)}60`,
                minHeight: '60px'
              }}
            >
              {ORACLE_CAPABLE_MODELS.map((model) => (
                <option 
                  key={model} 
                  value={model}
                  style={{ 
                    backgroundColor: '#0D0D0D',
                    color: getModelColor(model),
                    fontSize: '16px',
                    padding: '8px'
                  }}
                >
                  {getModelDisplayName(model)}
                </option>
              ))}
            </select>
            
            <div 
              className="absolute right-4 top-1/2 transform -translate-y-1/2 pointer-events-none"
              style={{ color: getModelColor(config.oracleModel) }}
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
          </motion.div>
        </div>
      </div>

      {/* Primary Analysis Configuration */}
      <div className="mb-6">
        <h4 className="text-sm font-matrix text-matrix-green-dim mb-4 tracking-wider">
          PRIMARY ANALYSIS CONFIGURATION
        </h4>

        {/* Analysis Lens */}
        <div className="mb-4">
          <label className="block text-sm font-matrix text-matrix-green-dim mb-3">
            ANALYSIS LENS <span className="text-red-500">*</span>
          </label>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(LENS_DESCRIPTIONS).map(([lens, description]) => {
              const lensColor = LENS_COLORS[lens as OracleLens];
              const isSelected = config.primaryLens === lens;
              return (
                <motion.div
                  key={lens}
                  className={`p-3 rounded border cursor-pointer transition-all duration-200 ${
                    isSelected
                      ? 'bg-opacity-10 border-2'
                      : 'border-matrix-green-dark bg-matrix-darker hover:border-opacity-50'
                  }`}
                  style={{
                    borderColor: isSelected ? lensColor : '#374151',
                    backgroundColor: isSelected ? `${lensColor}20` : '#1F2937',
                    color: isSelected ? lensColor : '#9CA3AF'
                  }}
                  onClick={() => updateConfig({ primaryLens: lens as OracleLens })}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="font-medium capitalize mb-1" style={{ color: isSelected ? lensColor : '#D1D5DB' }}>
                    {lens}
                  </div>
                  <div className="text-xs opacity-80">{description}</div>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Output Format */}
        <div className="mb-4">
          <label className="block text-sm font-matrix text-matrix-green-dim mb-3">
            OUTPUT FORMAT
          </label>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(FORMAT_DESCRIPTIONS).map(([format, description]) => {
              const formatColor = FORMAT_COLORS[format as OracleOutputFormat];
              const isSelected = config.outputFormat === format;
              return (
                <motion.label
                  key={format}
                  className={`flex items-start space-x-2 p-2 rounded cursor-pointer transition-all duration-200 border`}
                  style={{
                    borderColor: isSelected ? formatColor : '#374151',
                    backgroundColor: isSelected ? `${formatColor}20` : '#1F2937'
                  }}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                >
                  <input
                    type="radio"
                    name="outputFormat"
                    value={format}
                    checked={config.outputFormat === format}
                    onChange={(e) => updateConfig({ outputFormat: e.target.value as OracleOutputFormat })}
                    className="mt-1"
                    style={{ accentColor: formatColor }}
                  />
                  <div>
                    <div 
                      className="font-medium capitalize text-sm"
                      style={{ color: isSelected ? formatColor : '#D1D5DB' }}
                    >
                      {format.replace('_', ' ')}
                    </div>
                    <div className="text-xs opacity-80" style={{ color: isSelected ? `${formatColor}C0` : '#9CA3AF' }}>
                      {description}
                    </div>
                  </div>
                </motion.label>
              );
            })}
          </div>
        </div>

        {/* Analysis Depth */}
        <div>
          <label className="block text-sm font-matrix text-matrix-green-dim mb-2">
            ANALYSIS DEPTH: {config.depthLevel}/5
          </label>
          <div className="flex items-center gap-3 mb-2">
            <input
              type="range"
              min="1"
              max="5"
              value={config.depthLevel}
              onChange={(e) => updateConfig({ depthLevel: parseInt(e.target.value) })}
              className="flex-1 h-2 bg-matrix-gray rounded-lg appearance-none cursor-pointer slider-matrix"
            />
            <span className="text-matrix-green font-matrix text-sm w-8">{config.depthLevel}</span>
          </div>
          <div className="flex justify-between text-xs text-matrix-green-dim">
            <span>SURFACE</span>
            <span>LIGHT</span>
            <span>STANDARD</span>
            <span>DEEP</span>
            <span>EXHAUSTIVE</span>
          </div>
          <div className="text-sm text-matrix-green-dim bg-matrix-darker p-2 rounded mt-2">
            {DEPTH_DESCRIPTIONS[config.depthLevel as keyof typeof DEPTH_DESCRIPTIONS]}
          </div>
        </div>
      </div>

      {/* Verdict System - Separate Section */}
      <div className="mb-6 border-t border-matrix-green-dark pt-4">
        <h4 className="text-sm font-matrix text-matrix-green-dim mb-4 tracking-wider">
          VERDICT SYSTEM
        </h4>
        
        <div className="space-y-3">
          {Object.entries(VERDICT_DESCRIPTIONS).map(([scope, description]) => {
            const verdictColor = VERDICT_COLORS[scope as VerdictScope];
            const isSelected = config.verdict.scope === scope;
            return (
              <motion.label
                key={scope}
                className={`flex items-start space-x-3 p-2 rounded cursor-pointer transition-all duration-200 border`}
                style={{
                  borderColor: isSelected ? verdictColor : '#374151',
                  backgroundColor: isSelected ? `${verdictColor}20` : '#1F2937'
                }}
                whileHover={{ scale: 1.01 }}
              >
                <input
                  type="radio"
                  name="verdictScope"
                  value={scope}
                  checked={config.verdict.scope === scope}
                  onChange={(e) => updateVerdict({ 
                    enabled: e.target.value !== 'disabled',
                    scope: e.target.value as VerdictScope 
                  })}
                  className="mt-1"
                  style={{ accentColor: verdictColor }}
                />
                <div>
                  <div 
                    className="font-medium capitalize text-sm"
                    style={{ color: isSelected ? verdictColor : '#D1D5DB' }}
                  >
                    {scope === 'disabled' ? 'Disabled' : scope.replace('_', ' ')}
                  </div>
                  <div className="text-xs opacity-80" style={{ color: isSelected ? `${verdictColor}C0` : '#9CA3AF' }}>
                    {description}
                  </div>
                </div>
              </motion.label>
            );
          })}
        </div>
      </div>

      {/* Advanced Section - Collapsible */}
      <div className="border-t border-matrix-green-dark pt-4 mb-6">
        <motion.button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex items-center justify-between w-full text-left mb-4"
          whileHover={{ scale: 1.01 }}
        >
          <h4 className="text-sm font-matrix text-matrix-green-dim tracking-wider">
            ADVANCED SETTINGS
          </h4>
          <motion.span 
            className="text-matrix-green-dim"
            animate={{ rotate: showAdvanced ? 180 : 0 }}
            transition={{ duration: 0.2 }}
          >
            ▼
          </motion.span>
        </motion.button>
        
        {showAdvanced && (
          <motion.div 
            className="space-y-4"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
          >
            {/* Experimental Bias Detection */}
            <div className="bg-gradient-to-br from-red-900/20 to-orange-900/20 border border-red-500/30 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h5 className="font-matrix text-red-400 tracking-wider">🧪 EXPERIMENTAL BIAS DETECTION</h5>
                  <p className="text-xs text-red-300">Analyze limitations and biases in model responses</p>
                </div>
                <motion.label 
                  className="flex items-center cursor-pointer"
                  whileHover={{ scale: 1.05 }}
                >
                  <input
                    type="checkbox"
                    checked={config.biasDetection.enabled}
                    onChange={(e) => updateBiasDetection({ enabled: e.target.checked })}
                    className="mr-2 text-red-500"
                  />
                  <span className="text-sm text-red-400">ENABLE</span>
                </motion.label>
              </div>
              
              {config.biasDetection.enabled && (
                <motion.div 
                  className="space-y-2 ml-4"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.1 }}
                >
                  <motion.label 
                    className="flex items-center cursor-pointer"
                    whileHover={{ scale: 1.02 }}
                  >
                    <input
                      type="checkbox"
                      checked={config.biasDetection.analyzeDebaterBias}
                      onChange={(e) => updateBiasDetection({ analyzeDebaterBias: e.target.checked })}
                      className="mr-2 text-red-500"
                    />
                    <span className="text-sm text-red-300">Political/Ideological Bias Detection</span>
                  </motion.label>
                  
                  <motion.label 
                    className="flex items-center cursor-pointer"
                    whileHover={{ scale: 1.02 }}
                  >
                    <input
                      type="checkbox"
                      checked={config.biasDetection.analyzeCensorship}
                      onChange={(e) => updateBiasDetection({ analyzeCensorship: e.target.checked })}
                      className="mr-2 text-red-500"
                    />
                    <span className="text-sm text-red-300">Censorship & Safety Filter Analysis</span>
                  </motion.label>
                  
                  <motion.label 
                    className="flex items-center cursor-pointer"
                    whileHover={{ scale: 1.02 }}
                  >
                    <input
                      type="checkbox"
                      checked={config.biasDetection.culturalBiasCheck}
                      onChange={(e) => updateBiasDetection({ culturalBiasCheck: e.target.checked })}
                      className="mr-2 text-red-500"
                    />
                    <span className="text-sm text-red-300">Cultural Bias Detection (Western-centric)</span>
                  </motion.label>
                  
                  <motion.label 
                    className="flex items-center cursor-pointer"
                    whileHover={{ scale: 1.02 }}
                  >
                    <input
                      type="checkbox"
                      checked={config.biasDetection.politicalBiasCheck}
                      onChange={(e) => updateBiasDetection({ politicalBiasCheck: e.target.checked })}
                      className="mr-2 text-red-500"
                    />
                    <span className="text-sm text-red-300">Political Leaning Analysis</span>
                  </motion.label>
                </motion.div>
              )}
            </div>
          </motion.div>
        )}
      </div>

      {/* Configuration Summary */}
      <div className="bg-gradient-to-br from-purple-900/20 to-blue-900/20 border border-purple-500/30 rounded-lg p-4 mb-6">
        <h4 className="font-matrix text-purple-400 mb-3 tracking-wider">CONFIGURATION MATRIX</h4>
        <div className="text-sm text-purple-300 space-y-2">
          <div className="flex justify-between">
            <span>🤖 Oracle:</span> 
            <span className="font-matrix" style={{ color: getModelColor(config.oracleModel) }}>
              {getModelDisplayName(config.oracleModel)}
            </span>
          </div>
          <div className="flex justify-between">
            <span>📊 Lens:</span> 
            <span className="text-matrix-green capitalize">{config.primaryLens}</span>
          </div>
          <div className="flex justify-between">
            <span>🔍 Depth:</span> 
            <span className="text-matrix-green">Level {config.depthLevel}/5</span>
          </div>
          <div className="flex justify-between">
            <span>📝 Format:</span> 
            <span className="text-matrix-green capitalize">{config.outputFormat.replace('_', ' ')}</span>
          </div>
          <div className="flex justify-between">
            <span>⚖️ Verdict:</span> 
            <span className={config.verdict.enabled ? 'text-matrix-green' : 'text-gray-500'}>
              {config.verdict.enabled ? config.verdict.scope.toUpperCase() : 'DISABLED'}
            </span>
          </div>
          {config.biasDetection.enabled && (
            <div className="text-red-400">🧪 Bias detection enabled</div>
          )}
        </div>
      </div>

      {/* Analyze Button - Big Crystal Ball Icon */}
      <div className="w-full">
        <motion.button
          onClick={handleAnalyze}
          disabled={isAnalyzing || !hasMessages || !isOracleAvailable}
          className={`w-full h-24 flex items-center justify-center text-6xl rounded-lg transition-all duration-300 border-2 focus:outline-none focus:ring-0 ${
            isAnalyzing || !hasMessages || !isOracleAvailable
              ? 'bg-gray-600 border-gray-500 cursor-not-allowed opacity-50'
              : `hover:scale-105 shadow-lg hover:shadow-xl focus:scale-105 cursor-pointer`
          }`}
          style={{
            backgroundColor: isAnalyzing || !hasMessages || !isOracleAvailable 
              ? '#4B5563' 
              : getModelColor(config.oracleModel),
            borderColor: isAnalyzing || !hasMessages || !isOracleAvailable 
              ? '#6B7280' 
              : getModelColor(config.oracleModel),
            boxShadow: isAnalyzing || !hasMessages || !isOracleAvailable 
              ? 'none' 
              : `0 0 20px ${getModelColor(config.oracleModel)}40`
          }}
          whileHover={!isAnalyzing && hasMessages && isOracleAvailable ? { scale: 1.02 } : {}}
          whileTap={!isAnalyzing && hasMessages && isOracleAvailable ? { scale: 0.98 } : {}}
        >
          {isAnalyzing ? (
            <motion.div
              className="text-white"
              animate={{ 
                rotate: [0, 360],
                scale: [1, 1.1, 1]
              }}
              transition={{ 
                duration: 2, 
                repeat: Infinity,
                ease: "easeInOut"
              }}
            >
              🔮
            </motion.div>
          ) : (
            <motion.div
              className="text-white drop-shadow-lg"
              whileHover={{ 
                scale: 1.1,
                rotate: [0, 5, -5, 0]
              }}
              transition={{ duration: 0.3 }}
            >
              🔮
            </motion.div>
          )}
        </motion.button>
        {isAnalyzing && (
          <motion.div
            className="text-center mt-3"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <p className="font-matrix text-matrix-green text-sm tracking-wider">
              🔮 Oracle analyzing...
            </p>
          </motion.div>
        )}
      </div>

      {hasMessages && !isOracleAvailable && (
        <div className="text-center text-sm text-amber-400 mt-3">
          ⏸️ Pause or finish the debate to enable Oracle analysis
        </div>
      )}
    </motion.div>
  );
} 