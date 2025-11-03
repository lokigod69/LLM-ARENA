// Oracle Panel - Phase 1.1 Implementation
// Main Oracle container with updated architecture support
// ARCHITECTURAL REFACTOR: Updated for new config and results structure
// REDUNDANCY FIX: Removed small red popup that duplicated status shown in main Oracle panel
// The main Oracle panel already shows debate status and provides pause functionality
// UI ENHANCEMENT: Repositioned results count badge from corner to inline with tab text
// AUTO-NAVIGATION: Automatically switches to results after analysis completes

'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { OracleConfig, OracleResult } from '@/types/oracle';
import OracleConfigPanel from './OracleConfigPanel';
import OracleResultsPanel from './OracleResultsPanel';

interface OraclePanelProps {
  onAnalyze: (config: OracleConfig) => void;
  isAnalyzing: boolean;
  hasMessages: boolean;
  results: OracleResult[];
  onClearResults: () => void;
  isDebateActive: boolean;
  isPaused: boolean;
  onExportData?: () => void;
}

export default function OraclePanel({ 
  onAnalyze, 
  isAnalyzing, 
  hasMessages, 
  results, 
  onClearResults,
  isDebateActive,
  isPaused,
  onExportData
}: OraclePanelProps) {
  const [activeTab, setActiveTab] = useState<'config' | 'results'>('config');
  const [previousResultsLength, setPreviousResultsLength] = useState(0);

  // Auto-navigate to results when new analysis completes
  useEffect(() => {
    if (results.length > previousResultsLength && !isAnalyzing) {
      // New result added and analysis is complete
      setActiveTab('results');
    }
    setPreviousResultsLength(results.length);
  }, [results.length, isAnalyzing, previousResultsLength]);

  // Option B Logic: Oracle available when debate is paused OR finished
  const isOracleAvailable = !isDebateActive || isPaused;

  return (
    <div className="h-full flex flex-col">
      {/* Tab Navigation */}
      <div className="flex border-b border-matrix-green-dark">
        <motion.button
          onClick={() => setActiveTab('config')}
          className={`flex-1 py-3 px-4 text-sm font-matrix tracking-wider transition-all duration-200 ${
            activeTab === 'config'
              ? 'bg-matrix-green/10 text-matrix-green border-b-2 border-matrix-green'
              : 'text-matrix-green-dim hover:text-matrix-green hover:bg-matrix-green/5'
          }`}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          🔮 CONFIGURATION
        </motion.button>
        
        <motion.button
          onClick={() => setActiveTab('results')}
          className={`flex-1 py-3 px-4 text-sm font-matrix tracking-wider transition-all duration-200 ${
            activeTab === 'results'
              ? 'bg-matrix-green/10 text-matrix-green border-b-2 border-matrix-green'
              : 'text-matrix-green-dim hover:text-matrix-green hover:bg-matrix-green/5'
          }`}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <div className="flex items-center gap-2">
            📊 RESULTS
            {results.length > 0 && (
              <span className="bg-purple-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                {results.length}
              </span>
            )}
          </div>
        </motion.button>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto">
        <AnimatePresence mode="wait">
          {activeTab === 'config' && (
            <motion.div
              key="config"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="h-full"
            >
              <OracleConfigPanel
                onAnalyze={onAnalyze}
                isAnalyzing={isAnalyzing}
                hasMessages={hasMessages && isOracleAvailable}
                isOracleAvailable={isOracleAvailable}
              />
            </motion.div>
          )}

          {activeTab === 'results' && (
            <motion.div
              key="results"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.3 }}
              className="h-full"
            >
              {results.length > 0 ? (
                <div className="space-y-4 p-4">
                  {/* Results Header with Clear Button */}
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-matrix text-matrix-green tracking-wider">
                      📊 RESULTS
                    </h3>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-matrix-green-dim">
                        {results.length} ANALYSIS{results.length !== 1 ? 'ES' : ''}
                      </span>
                      {onExportData && (
                        <motion.button
                          onClick={onExportData}
                          className="text-xs text-blue-400 hover:text-blue-300 font-matrix tracking-wider"
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          📁 EXPORT
                        </motion.button>
                      )}
                      <motion.button
                        onClick={onClearResults}
                        className="text-xs text-red-400 hover:text-red-300 font-matrix tracking-wider"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        CLEAR ALL
                      </motion.button>
                    </div>
                  </div>

                  {/* Results List - Most Recent First */}
                  <div className="space-y-4">
                    {results.slice().reverse().map((result, index) => (
                      <motion.div
                        key={result.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: index * 0.1 }}
                      >
                        <OracleResultsPanel result={result} />
                      </motion.div>
                    ))}
                  </div>

                  {/* Summary Footer */}
                  {results.length > 1 && (
                    <motion.div 
                      className="mt-6 pt-4 border-t border-matrix-green-dark"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.5 }}
                    >
                      <div className="text-center text-xs text-matrix-green-dim">
                        Multiple perspectives analyzed • Compare insights for deeper understanding
                      </div>
                    </motion.div>
                  )}
                </div>
              ) : (
                <div className="h-full flex items-center justify-center">
                  <motion.div 
                    className="text-center"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                  >
                    <div className="text-4xl text-matrix-green-dim mb-4">🔮</div>
                    <h3 className="text-lg font-matrix text-matrix-green-dim mb-2">NO ORACLE INSIGHTS</h3>
                    <p className="text-sm text-matrix-green-dim max-w-xs">
                      Configure and run an analysis to generate insights and wisdom from the debate
                    </p>
                    <motion.button
                      onClick={() => setActiveTab('config')}
                      className="mt-4 text-sm text-purple-400 hover:text-purple-300 font-matrix tracking-wider"
                      whileHover={{ scale: 1.05 }}
                    >
                      → GO TO CONFIGURATION
                    </motion.button>
                  </motion.div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
} 