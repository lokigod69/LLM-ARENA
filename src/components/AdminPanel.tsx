// Admin Panel Component
// Matrix-themed UI for admin token generation and TTS control
// Only visible when logged in with admin code
// UI FIX: Panel now starts collapsed by default
// TTS TOGGLE: Added TTS enable/disable toggle for global control

'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export function AdminPanel() {
  const [isOpen, setIsOpen] = useState(false); // Default to collapsed
  const [tokenCount, setTokenCount] = useState(1);
  const [queriesPerToken, setQueriesPerToken] = useState(30);
  const [generatedTokens, setGeneratedTokens] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedTokenIndex, setCopiedTokenIndex] = useState<number | null>(null);
  const [copyAllClicked, setCopyAllClicked] = useState(false);
  
  // TTS Toggle State
  const [ttsEnabled, setTtsEnabled] = useState(false);
  const [isTogglingTts, setIsTogglingTts] = useState(false);

  const generateTokens = async () => {
    setIsGenerating(true);
    setError(null);
    setGeneratedTokens([]);

    try {
      const response = await fetch('/api/admin/generate-codes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminCode: '6969',
          count: tokenCount,
          queries: queriesPerToken
        })
      });

      const data = await response.json();

      if (response.ok && data.codes) {
        setGeneratedTokens(data.codes);
      } else {
        setError(data.error || 'Failed to generate tokens');
      }
    } catch (err) {
      console.error('Error generating tokens:', err);
      setError('Error generating tokens. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToken = async (token: string, index: number) => {
    try {
      await navigator.clipboard.writeText(token);
      setCopiedTokenIndex(index);
      setTimeout(() => {
        setCopiedTokenIndex(null);
      }, 2000);
    } catch (err) {
      console.error('Failed to copy token:', err);
    }
  };

  const copyAll = async () => {
    try {
      await navigator.clipboard.writeText(generatedTokens.join('\n'));
      setCopyAllClicked(true);
      setTimeout(() => {
        setCopyAllClicked(false);
      }, 2000);
    } catch (err) {
      console.error('Failed to copy all tokens:', err);
    }
  };

  // Load TTS status on mount
  useEffect(() => {
    const loadTtsStatus = async () => {
      try {
        const response = await fetch('/api/admin/tts-status');
        if (response.ok) {
          const data = await response.json();
          setTtsEnabled(data.enabled || false);
        }
      } catch (err) {
        console.error('Failed to load TTS status:', err);
      }
    };
    
    if (isOpen) {
      loadTtsStatus();
    }
  }, [isOpen]);

  // Toggle TTS
  const handleTtsToggle = async () => {
    setIsTogglingTts(true);
    try {
      const newState = !ttsEnabled;
      const response = await fetch('/api/admin/toggle-tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          adminCode: '6969',
          enabled: newState 
        })
      });

      if (response.ok) {
        const data = await response.json();
        setTtsEnabled(data.enabled);
        alert(`TTS ${data.enabled ? 'enabled' : 'disabled'} successfully!`);
      } else {
        const errorData = await response.json();
        alert(`Failed to toggle TTS: ${errorData.error || 'Unknown error'}`);
      }
    } catch (err) {
      console.error('Error toggling TTS:', err);
      alert('Error toggling TTS. Please try again.');
    } finally {
      setIsTogglingTts(false);
    }
  };

  return (
    <motion.div
      className="fixed top-24 right-4 w-96 z-50"
      initial={{ opacity: 0, x: 100 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5 }}
    >
      <motion.div className="matrix-panel p-4 rounded-lg border border-matrix-green/30">
        <motion.div
          className="relative flex justify-center items-center cursor-pointer mb-4"
          onClick={() => setIsOpen(!isOpen)}
        >
          <h3 className="text-2xl font-matrix text-matrix-green tracking-wider">
            🔑 ADMIN PANEL
          </h3>
          <motion.div
            className="absolute right-0"
            animate={{ rotate: isOpen ? 180 : 0 }}
            transition={{ duration: 0.3 }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-matrix-green"
            >
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
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-matrix text-matrix-green/80 mb-2">
                    Number of tokens:
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={tokenCount}
                    onChange={(e) => setTokenCount(parseInt(e.target.value) || 1)}
                    className="w-full bg-matrix-black border border-matrix-green-dark text-matrix-green placeholder-matrix-green-dim px-3 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-matrix-green font-matrix-mono"
                  />
                </div>

                <div>
                  <label className="block text-sm font-matrix text-matrix-green/80 mb-2">
                    Queries per token:
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="1000"
                    value={queriesPerToken}
                    onChange={(e) => setQueriesPerToken(parseInt(e.target.value) || 1)}
                    className="w-full bg-matrix-black border border-matrix-green-dark text-matrix-green placeholder-matrix-green-dim px-3 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-matrix-green font-matrix-mono"
                  />
                </div>

                <button
                  onClick={generateTokens}
                  disabled={isGenerating}
                  className="w-full bg-matrix-green text-matrix-black font-matrix font-bold py-2 px-4 rounded-md hover:bg-opacity-80 transition-colors disabled:bg-matrix-gray disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isGenerating ? 'GENERATING...' : 'GENERATE TOKENS'}
                </button>

                {error && (
                  <div className="text-matrix-red text-sm font-matrix-mono text-center">
                    {error}
                  </div>
                )}

                {generatedTokens.length > 0 && (
                  <div className="mt-4">
                    <div className="flex justify-between items-center mb-2">
                      <label className="text-sm font-matrix text-matrix-green/80">
                        Generated Tokens:
                      </label>
                      <button
                        onClick={copyAll}
                        className={`text-xs font-matrix-mono px-2 py-1 border border-matrix-green-dark rounded transition-all ${
                          copyAllClicked
                            ? 'bg-matrix-green text-matrix-black font-bold'
                            : 'text-matrix-green hover:text-matrix-green-dim hover:bg-matrix-green/10 underline'
                        }`}
                      >
                        {copyAllClicked ? '✓ Copied!' : 'Copy All'}
                      </button>
                    </div>
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {generatedTokens.map((token, idx) => (
                        <div
                          key={idx}
                          className="flex items-center gap-2 bg-matrix-black/50 p-2 rounded border border-matrix-green-dark"
                        >
                          <code className="text-matrix-green text-sm flex-1 font-matrix-mono break-all">
                            {token}
                          </code>
                          <button
                            onClick={() => copyToken(token, idx)}
                            className={`text-xs font-matrix-mono px-2 py-1 border border-matrix-green-dark rounded transition-all min-w-[60px] ${
                              copiedTokenIndex === idx
                                ? 'bg-matrix-green text-matrix-black font-bold'
                                : 'text-matrix-green hover:text-matrix-green-dim hover:bg-matrix-green/10'
                            }`}
                          >
                            {copiedTokenIndex === idx ? '✓ Copied!' : 'Copy'}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* TTS Toggle Section */}
                <div className="border-t border-matrix-green/30 pt-4">
                  <h3 className="text-matrix-green font-matrix-code text-sm mb-2">
                    🎤 TEXT-TO-SPEECH CONTROL
                  </h3>
                  <label className="flex items-center space-x-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={ttsEnabled}
                      onChange={handleTtsToggle}
                      disabled={isTogglingTts}
                      className="w-5 h-5 accent-matrix-green cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                    <span className="text-matrix-green font-matrix-mono">
                      {ttsEnabled ? '✅ TTS Enabled' : '❌ TTS Disabled'}
                    </span>
                  </label>
                  <p className="text-xs text-matrix-green/60 mt-1 font-matrix-mono">
                    {ttsEnabled 
                      ? 'Users can use text-to-speech (costs money)'
                      : 'TTS disabled - prevents ElevenLabs usage'}
                  </p>
                  {isTogglingTts && (
                    <p className="text-xs text-matrix-green/80 mt-1 font-matrix-mono">
                      Updating...
                    </p>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}

