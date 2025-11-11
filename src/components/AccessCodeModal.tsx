// src/components/AccessCodeModal.tsx

// Changes: Updated to use new auth system with proper admin/token separation
// Changes: Propagates entered access code back to parent so debate state can track it
// This component creates a modal dialog for users to enter their access code.
// It is styled to match the application's "Matrix" theme.
// It handles its own state for the input field, loading status, and error messages.
// When the user submits a valid code, it calls the onVerified callback.

'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';

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
        <p className="text-matrix-text mb-6">Enter your assigned access code to proceed.</p>
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