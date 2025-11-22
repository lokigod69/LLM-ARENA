// src/components/AccessCodeModal.tsx

// Changes: Updated to use new auth system with proper admin/token separation
// Changes: Propagates entered access code back to parent so debate state can track it
// PHASE 2A: Added Google OAuth sign-in option
// This component creates a modal dialog for users to enter their access code.
// It is styled to match the application's "Matrix" theme.
// It handles its own state for the input field, loading status, and error messages.
// When the user submits a valid code, it calls the onVerified callback.

'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { signIn } from 'next-auth/react';

interface AccessCodeModalProps {
  onVerified: (authState: { mode: 'admin' | 'token', remaining?: number, allowed?: number, code?: string }) => void;
  setAppIsLoading: (isLoading: boolean) => void;
}

export default function AccessCodeModal({ onVerified, setAppIsLoading }: AccessCodeModalProps) {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code) {
      setError('Please enter an access code.');
      return;
    }
    
    setError('');
    setIsLoading(true);
    setAppIsLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // PHASE 1 FIX: Include credentials for cookies
        body: JSON.stringify({ code }),
      });

      const data = await response.json();

      if (response.ok) {
        onVerified({ ...data, code });
      } else {
        setError(data.error || 'An unknown error occurred.');
        setIsLoading(false);
        setAppIsLoading(false);
      }
    } catch (err) {
      setError('Failed to connect to the server. Please try again.');
      setIsLoading(false);
      setAppIsLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-matrix-black bg-opacity-90 backdrop-blur-sm flex items-center justify-center"
    >
      <motion.div
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.5 }}
        className="bg-matrix-dark border border-matrix-green-dark p-8 rounded-lg shadow-lg text-center max-w-sm w-full"
      >
        <h2 className="text-2xl font-matrix text-matrix-green mb-4">ACCESS REQUIRED</h2>
        <p className="text-matrix-text mb-6">Sign in to continue</p>
        
        {/* PHASE 2A: Google OAuth Button */}
        <button
          onClick={() => signIn('google', { callbackUrl: '/' })}
          disabled={isLoading}
          className="w-full bg-white text-gray-800 font-semibold py-3 px-4 rounded-md hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Sign in with Google
        </button>
        
        {/* Divider */}
        <div className="flex items-center my-6">
          <div className="flex-1 border-t border-matrix-green-dark"></div>
          <span className="px-4 text-matrix-green-dim text-sm">OR</span>
          <div className="flex-1 border-t border-matrix-green-dark"></div>
        </div>
        
        <p className="text-matrix-text text-sm mb-4">Enter your assigned access code:</p>
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            disabled={isLoading}
            className="w-full bg-matrix-black border border-matrix-green-dark text-matrix-green placeholder-matrix-green-dim p-3 rounded-md focus:outline-none focus:ring-2 focus:ring-matrix-green font-matrix-mono text-center"
            placeholder="test-xxxxxxxx"
          />
          {error && <p className="text-red-500 text-sm mt-4">{error}</p>}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full mt-6 bg-matrix-green text-matrix-black font-bold py-3 rounded-md hover:bg-opacity-80 transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed"
          >
            {isLoading ? 'VERIFYING...' : 'UNLOCK'}
          </button>
        </form>
      </motion.div>
    </motion.div>
  );
} 