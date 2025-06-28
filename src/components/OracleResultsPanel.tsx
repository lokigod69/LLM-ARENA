// Oracle Results Panel - Phase 1.1 Implementation
// Enhanced display for new verdict system and bias analysis
// ARCHITECTURAL REFACTOR: Updated to support separate verdict and bias detection
// UI ENHANCEMENT: Made large analysis reports collapsible to save space
// MarkButton integration: Added MarkButton after each Oracle result for marking (heart/star) Oracle analyses

'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { OracleResult } from '@/types/oracle';
import { getModelDisplayName, getModelColor } from '@/lib/modelConfigs';

interface OracleResultsPanelProps {
  result: OracleResult;
}

export default function OracleResultsPanel({ result }: OracleResultsPanelProps) {
  const [showBiasAnalysis, setShowBiasAnalysis] = useState(false);
  const [showMainAnalysis, setShowMainAnalysis] = useState(false);

  return (
    <motion.div
      className="matrix-panel p-6 rounded-lg space-y-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-matrix text-matrix-green tracking-wider">
            🔮 ORACLE ANALYSIS
          </h3>
          <div className="text-xs text-matrix-green-dim">
            <span 
              className="font-matrix"
              style={{ color: getModelColor(result.config.oracleModel) }}
            >
              {getModelDisplayName(result.config.oracleModel)}
            </span> • {result.config.primaryLens.toUpperCase()} LENS • DEPTH {result.config.depthLevel}/5 • 
            {result.config.outputFormat.replace('_', ' ').toUpperCase()}
          </div>
        </div>
        <div className="text-xs text-matrix-green-dim">
          {result.processingTime}ms
        </div>
      </div>

      {/* Main Analysis - Now Collapsible */}
      <div className="space-y-4">
        <motion.button
          onClick={() => setShowMainAnalysis(!showMainAnalysis)}
          className="w-full flex items-center justify-between p-3 bg-gradient-to-br from-purple-900/20 to-blue-900/20 border border-purple-500/30 rounded-lg cursor-pointer hover:border-purple-400/50 transition-colors"
          whileHover={{ scale: 1.01 }}
        >
          <div className="flex items-center gap-2">
            <h4 className="font-matrix text-purple-400 tracking-wider">
              <span style={{ color: getModelColor(result.config.oracleModel) }}>
                {getModelDisplayName(result.config.oracleModel)}
              </span> {result.config.primaryLens.toUpperCase()} LENS ANALYSIS
            </h4>
          </div>
          <motion.span 
            className="text-purple-400"
            animate={{ rotate: showMainAnalysis ? 180 : 0 }}
            transition={{ duration: 0.2 }}
          >
            ▼
          </motion.span>
        </motion.button>

        <AnimatePresence>
          {showMainAnalysis && (
            <motion.div
              className="bg-gradient-to-br from-purple-900/20 to-blue-900/20 border border-purple-500/30 rounded-lg p-4 space-y-4"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className="text-matrix-green-dim whitespace-pre-wrap leading-relaxed">
                {result.analysis}
              </div>

              {/* Verdict Section - NOW INSIDE COLLAPSIBLE */}
              {result.verdict && (
                <div className="mt-6 pt-4 border-t border-purple-500/30">
                  <h4 className="font-matrix text-amber-400 mb-3 tracking-wider flex items-center justify-between">
                    <span>⚖️ VERDICT ANALYSIS</span>
                    <span className="text-xs text-amber-300 uppercase">
                      {result.verdict.scope} SCOPE
                    </span>
                  </h4>
                  
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`text-2xl font-matrix ${
                          result.verdict.winner === 'GPT' ? 'text-green-400' :
                          result.verdict.winner === 'Claude' ? 'text-blue-400' :
                          'text-yellow-400'
                        }`}>
                          {result.verdict.winner === 'GPT' ? '🟢 GPT-4' :
                           result.verdict.winner === 'Claude' ? '🔵 CLAUDE' :
                           '🟡 ALIGNED'}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-matrix text-amber-400">
                          {result.verdict.confidence}%
                        </div>
                        <div className="text-xs text-amber-300">CONFIDENCE</div>
                      </div>
                    </div>
                    
                    <div className="text-sm text-amber-200 bg-amber-900/30 p-3 rounded">
                      <strong>Reasoning:</strong> {result.verdict.reasoning}
                    </div>
                    
                    {result.verdict.scope === 'lens' && (
                      <div className="text-xs text-amber-300 italic">
                        * Verdict based specifically on {result.config.primaryLens} lens criteria
                      </div>
                    )}
                    
                    {result.verdict.scope === 'meta' && (
                      <div className="text-xs text-amber-300 italic">
                        * Verdict based on comprehensive multi-dimensional analysis
                      </div>
                    )}
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Bias Analysis Section - NEW: Enhanced experimental analysis */}
      {result.biasAnalysis && (
        <div className="space-y-4">
          <motion.button
            onClick={() => setShowBiasAnalysis(!showBiasAnalysis)}
            className="w-full flex items-center justify-between p-3 bg-gradient-to-br from-red-900/20 to-orange-900/20 border border-red-500/30 rounded-lg cursor-pointer hover:border-red-400/50 transition-colors"
            whileHover={{ scale: 1.01 }}
          >
            <div className="flex items-center gap-2">
              <span className="text-red-400 font-matrix tracking-wider">🧪 EXPERIMENTAL BIAS ANALYSIS</span>
              <span className="text-xs text-red-300 bg-red-900/30 px-2 py-1 rounded">
                ADVANCED
              </span>
            </div>
            <motion.span 
              className="text-red-400"
              animate={{ rotate: showBiasAnalysis ? 180 : 0 }}
              transition={{ duration: 0.2 }}
            >
              ▼
            </motion.span>
          </motion.button>

          <AnimatePresence>
            {showBiasAnalysis && (
              <motion.div
                className="space-y-3"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
              >
                {result.biasAnalysis.debaterBias && (
                  <div className="bg-red-900/20 border border-red-500/30 rounded p-3">
                    <h5 className="text-red-400 font-matrix text-sm mb-2">🎭 POLITICAL/IDEOLOGICAL BIAS</h5>
                    <p className="text-red-200 text-sm">{result.biasAnalysis.debaterBias}</p>
                  </div>
                )}

                {result.biasAnalysis.censorship && (
                  <div className="bg-orange-900/20 border border-orange-500/30 rounded p-3">
                    <h5 className="text-orange-400 font-matrix text-sm mb-2">🚨 CENSORSHIP ANALYSIS</h5>
                    <p className="text-orange-200 text-sm">{result.biasAnalysis.censorship}</p>
                  </div>
                )}

                {result.biasAnalysis.culturalBias && (
                  <div className="bg-yellow-900/20 border border-yellow-500/30 rounded p-3">
                    <h5 className="text-yellow-400 font-matrix text-sm mb-2">🌍 CULTURAL BIAS</h5>
                    <p className="text-yellow-200 text-sm">{result.biasAnalysis.culturalBias}</p>
                  </div>
                )}

                {result.biasAnalysis.politicalBias && (
                  <div className="bg-pink-900/20 border border-pink-500/30 rounded p-3">
                    <h5 className="text-pink-400 font-matrix text-sm mb-2">🗳️ POLITICAL LEANING</h5>
                    <p className="text-pink-200 text-sm">{result.biasAnalysis.politicalBias}</p>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Analysis Metadata */}
      <div className="flex justify-between items-center text-xs text-matrix-green-dim border-t border-matrix-green-dark pt-4">
        <div>
          Analysis ID: {result.id.substring(0, 8)}...
        </div>
        <div>
          Generated: {new Date(result.timestamp).toLocaleString()}
        </div>
      </div>
    </motion.div>
  );
} 