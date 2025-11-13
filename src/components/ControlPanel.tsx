// Task 4.1 Complete: Matrix-style Control Panel for Debate Management
// Cyberpunk-themed interface for monitoring debate flow and configuration
// SIMPLIFIED: Only monitoring and configuration - no control buttons
// PHASE 1 UI IMPROVEMENTS: Renamed "Max Turns" to "Total Turns" for clarity (keeps current logic, rounds implementation deferred to Phase 2)
'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface ControlPanelProps {
  isDebateActive: boolean;
  maxTurns: number;
  onMaxTurnsChange: (turns: number) => void;
}

const ControlPanel: React.FC<ControlPanelProps> = ({
  isDebateActive,
  maxTurns,
  onMaxTurnsChange,
}) => {
  const [isOpen, setIsOpen] = useState(true); // Default to open

  const getSliderGradient = (value: number, max: number) => {
    const percentage = ((value - 1) / (max - 1)) * 100;
    return `linear-gradient(to right, #0047FF, #8024A3 ${percentage}%, #FF0047)`;
  };

  return (
    <motion.div 
      className="matrix-panel p-4 rounded-lg border border-matrix-green/30"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <motion.div
        className="relative flex justify-center items-center cursor-pointer"
        onClick={() => setIsOpen(!isOpen)}
      >
        <h3 className="text-2xl font-matrix text-matrix-green tracking-wider">
          Debate Length
        </h3>
        <motion.div
          className="absolute right-0"
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.3 }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-matrix-green">
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
        </motion.div>
      </motion.div>
      
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="mt-4">
              <label
                htmlFor="max-turns"
                className="block text-xl text-center font-matrix text-matrix-green/80 mb-4"
              >
                Total Turns: <span className="text-2xl text-matrix-blue font-bold">{maxTurns}</span>
              </label>
              <input
                id="max-turns"
                type="range"
                min="1"
                max="10"
                value={maxTurns}
                onChange={e => onMaxTurnsChange(parseInt(e.target.value, 10))}
                disabled={isDebateActive}
                className="w-full h-2 rounded-lg appearance-none cursor-pointer slider-max-turns"
                style={{ background: getSliderGradient(maxTurns, 10) }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <style jsx>{`
        .slider-max-turns::-webkit-slider-thumb {
          appearance: none;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: #00FF41;
          cursor: pointer;
          border: 2px solid #000;
          box-shadow: 0 0 8px #00FF41;
          transition: all 0.3s ease;
        }
        
        .slider-max-turns::-moz-range-thumb {
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: #00FF41;
          cursor: pointer;
          border: 2px solid #000;
          box-shadow: 0 0 8px #00FF41;
        }
      `}</style>
    </motion.div>
  );
};

export default ControlPanel; 