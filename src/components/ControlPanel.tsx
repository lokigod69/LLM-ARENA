// Task 4.1 Complete: Matrix-style Control Panel for Debate Management
// Cyberpunk-themed interface for monitoring debate flow and configuration
// SIMPLIFIED: Only monitoring and configuration - no control buttons
// PHASE 1 UI IMPROVEMENTS: Renamed "Max Turns" to "Total Turns" for clarity (keeps current logic, rounds implementation deferred to Phase 2)
// SLIDER REDESIGN: Matrix-themed notched slider design
//   - Removed rainbow gradient (blue → purple → red)
//   - Black track with green border + glow
//   - 10 green notch indicators (one per turn value 1-10)
//   - Filled notches glow bright green, unfilled are dark outlines
//   - Fixed label color (blue → green)
//   - Enhanced thumb with hover effects
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
                Total Turns: <span className="text-2xl text-matrix-green font-bold">{maxTurns}</span>
              </label>
              <div className="relative">
                <input
                  id="max-turns"
                  type="range"
                  min="1"
                  max="10"
                  value={maxTurns}
                  onChange={e => onMaxTurnsChange(parseInt(e.target.value, 10))}
                  disabled={isDebateActive}
                  className="w-full h-2 rounded-lg appearance-none cursor-pointer slider-max-turns relative z-10"
                  style={{ 
                    background: '#000000',
                    border: '1px solid #00FF41',
                    boxShadow: '0 0 4px rgba(0, 255, 65, 0.3)'
                  }}
                />
                {/* Notch indicators - 10 segments for 1-10 turns */}
                <div className="relative -mt-2 h-4 flex justify-between items-end pointer-events-none px-1">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((turn) => (
                    <div
                      key={turn}
                      className={`w-0.5 transition-all duration-200 ${
                        turn <= maxTurns
                          ? 'bg-matrix-green h-4 shadow-[0_0_6px_rgba(0,255,65,0.6)]'
                          : 'bg-transparent border-l border-matrix-green/20 h-2'
                      }`}
                      style={{
                        borderColor: turn <= maxTurns ? 'transparent' : 'rgba(0, 255, 65, 0.2)'
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <style jsx>{`
        .slider-max-turns::-webkit-slider-thumb {
          appearance: none;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: #00FF41;
          cursor: pointer;
          border: 2px solid #003300;
          box-shadow: 0 0 10px rgba(0, 255, 65, 0.6), 0 0 20px rgba(0, 255, 65, 0.3);
          transition: all 0.3s ease;
          position: relative;
          z-index: 20;
        }
        
        .slider-max-turns::-webkit-slider-thumb:hover {
          background: #00FF66;
          box-shadow: 0 0 15px rgba(0, 255, 65, 0.8), 0 0 30px rgba(0, 255, 65, 0.4);
        }
        
        .slider-max-turns::-moz-range-thumb {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: #00FF41;
          cursor: pointer;
          border: 2px solid #003300;
          box-shadow: 0 0 10px rgba(0, 255, 65, 0.6), 0 0 20px rgba(0, 255, 65, 0.3);
          position: relative;
          z-index: 20;
        }
        
        .slider-max-turns::-moz-range-thumb:hover {
          background: #00FF66;
          box-shadow: 0 0 15px rgba(0, 255, 65, 0.8), 0 0 30px rgba(0, 255, 65, 0.4);
        }
      `}</style>
    </motion.div>
  );
};

export default ControlPanel; 