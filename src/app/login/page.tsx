// Task 1.3 Complete + Matrix UI: Matrix-styled authentication interface
// Updated with cyberpunk aesthetics and neon effects
'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';
import { motion } from 'framer-motion';
import MatrixRain from '@/components/MatrixRain';
import TypewriterText from '@/components/TypewriterText';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setIsLoading(true);
    setMessage('');

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          emailRedirectTo: `${window.location.origin}`,
        },
      });

      if (error) {
        setMessage(`Authentication failed: ${error.message}`);
      } else {
        setMessage('Neural link established. Check your email for access codes.');
      }
    } catch (error) {
      setMessage('System error occurred. Please retry connection.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-matrix-black text-matrix-text font-matrix-mono relative overflow-hidden flex items-center justify-center">
      {/* Matrix Rain Background */}
      <MatrixRain />
      
      {/* Main Container */}
      <div className="relative z-10 w-full max-w-md mx-auto p-6">
        {/* Header */}
        <motion.div 
          className="text-center mb-8"
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <Link href="/" className="inline-block">
            <motion.h1 
              className="text-4xl font-matrix font-black matrix-title mb-2"
              whileHover={{ scale: 1.05 }}
              transition={{ duration: 0.2 }}
            >
              <TypewriterText 
                text="LLM ARENA" 
                speed={100}
                className="text-matrix-green drop-shadow-lg"
              />
            </motion.h1>
          </Link>
          <p className="text-matrix-green-dim font-matrix text-sm">
            <TypewriterText 
              text="NEURAL AUTHENTICATION PROTOCOL" 
              speed={50}
              startDelay={1000}
              className="tracking-wider"
            />
          </p>
        </motion.div>

        {/* Authentication Panel */}
        <motion.div 
          className="matrix-panel p-8 rounded-lg"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5, duration: 0.8 }}
        >
          <div className="text-center mb-6">
            <h2 className="text-xl font-matrix text-matrix-green mb-2">
              <TypewriterText 
                text="ESTABLISH CONNECTION" 
                speed={80}
                startDelay={1500}
                className="tracking-wider"
              />
            </h2>
            <p className="text-sm text-matrix-green-dim">
              Enter your neural ID to access the arena
            </p>
          </div>

          <form onSubmit={handleSignIn} className="space-y-6">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.8, duration: 0.5 }}
            >
              <label htmlFor="email" className="block text-sm font-matrix text-matrix-green-dim mb-2">
                NEURAL ID (EMAIL)
              </label>
              <motion.input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="user@neural.net"
                className="w-full matrix-input rounded-lg py-3 px-4 focus:ring-2 focus:ring-matrix-green transition-all duration-300"
                disabled={isLoading}
                required
                whileFocus={{ scale: 1.02 }}
                transition={{ duration: 0.2 }}
              />
            </motion.div>

            <motion.button
              type="submit"
              disabled={isLoading || !email.trim()}
              className="w-full matrix-button py-3 px-6 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1, duration: 0.5 }}
            >
              {isLoading ? (
                <div className="flex items-center justify-center gap-3">
                  <motion.div
                    className="w-5 h-5 border-2 border-matrix-green border-t-transparent rounded-full"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  />
                  <span>CONNECTING...</span>
                </div>
              ) : (
                <span>INITIATE CONNECTION</span>
              )}
            </motion.button>
          </form>

          {/* Status Message */}
          {message && (
            <motion.div
              className={`mt-6 p-4 rounded-lg border ${
                message.includes('failed') || message.includes('error')
                  ? 'border-matrix-red bg-matrix-red bg-opacity-10 text-matrix-red'
                  : 'border-matrix-green-dark bg-matrix-green bg-opacity-10 text-matrix-green'
              }`}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
            >
              <div className="flex items-center gap-2">
                <motion.div
                  className={`w-2 h-2 rounded-full ${
                    message.includes('failed') || message.includes('error')
                      ? 'bg-matrix-red'
                      : 'bg-matrix-green'
                  }`}
                  animate={{ opacity: [1, 0.3, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                />
                <span className="text-sm font-matrix">{message}</span>
              </div>
            </motion.div>
          )}

          {/* Command Line Style Info */}
          <motion.div 
            className="mt-6 text-xs text-matrix-green-dim font-matrix"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.5 }}
          >
            <div className="flex items-center gap-2 mb-1">
              <span className="text-matrix-green">$</span>
              <span>auth --method=magic_link --secure=true</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-matrix-green">&gt;</span>
              <span>Quantum encryption enabled</span>
            </div>
          </motion.div>
        </motion.div>

        {/* Back to Arena */}
        <motion.div 
          className="text-center mt-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2, duration: 0.5 }}
        >
          <Link 
            href="/" 
            className="text-matrix-green-dim hover:text-matrix-green transition-colors duration-300 font-matrix text-sm"
          >
            ← RETURN TO ARENA
          </Link>
        </motion.div>
      </div>
    </div>
  );
} 