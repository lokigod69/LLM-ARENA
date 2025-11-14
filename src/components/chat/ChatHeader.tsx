// Chat Header Component
// Header with navigation and session info

'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';

interface ChatHeaderProps {
  queriesRemaining: number | string;
  onBack?: () => void;
}

export default function ChatHeader({ queriesRemaining, onBack }: ChatHeaderProps) {
  return (
    <motion.header
      className="sticky top-0 z-50 border-b border-matrix-green-dark bg-gradient-to-r from-matrix-black via-matrix-dark to-matrix-black backdrop-blur-sm"
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.8, ease: "easeOut" }}
    >
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-matrix-green to-transparent opacity-10"></div>
      <div className="relative flex justify-between items-center p-6">
        <motion.div
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3, duration: 0.8 }}
          className="flex items-center gap-3"
        >
          {onBack && (
            <button
              onClick={onBack}
              className="text-matrix-green hover:text-matrix-green-dim transition-colors text-xl mr-2"
            >
              ←
            </button>
          )}
          <div>
            <h1 className="text-3xl font-matrix font-black matrix-title text-matrix-green drop-shadow-lg">
              CHARACTER STUDIO
            </h1>
            <p className="text-sm text-matrix-green-dim mt-1 font-matrix">
              One-on-One Character Conversations
            </p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5, duration: 0.8 }}
          className="text-right flex items-center gap-6"
        >
          <div>
            <p className="text-xs text-matrix-green-dim">QUERIES REMAINING</p>
            <p className="text-sm text-matrix-text font-matrix">{queriesRemaining}</p>
          </div>
          <Link href="/chat" className="inline-flex items-center justify-center rounded-full bg-matrix-green/10 hover:bg-matrix-green/30 transition-colors p-2 ml-2" title="Character Chat">
            <span role="img" aria-label="Chat">💬</span>
          </Link>
          <Link href="/library" className="inline-flex items-center justify-center rounded-full bg-matrix-green/10 hover:bg-matrix-green/30 transition-colors p-2 ml-2" title="Open Library">
            <span role="img" aria-label="Library">📚</span>
          </Link>
        </motion.div>
      </div>
    </motion.header>
  );
}

