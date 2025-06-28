'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Message } from '@/types';
import { Play, Pause, Square } from 'lucide-react';

interface GlobalAudioPlayerProps {
  messages: Message[];
  isActive: boolean;
}

export default function GlobalAudioPlayer({ messages, isActive }: GlobalAudioPlayerProps) {
  const [playbackState, setPlaybackState] = useState<'stopped' | 'playing' | 'paused'>('stopped');
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);

  // When debate becomes inactive, show the player if there are messages
  const shouldShowPlayer = !isActive && messages.length > 0;

  const handlePlay = () => {
    console.log('▶️ Playback started from message', currentMessageIndex);
    setPlaybackState('playing');
    // MOCK: Simulate playing through messages
    const interval = setInterval(() => {
      setCurrentMessageIndex(prev => {
        if (prev >= messages.length - 1) {
          console.log('⏹️ Playback finished.');
          setPlaybackState('stopped');
          clearInterval(interval);
          return 0;
        }
        console.log('Playing message', prev + 1);
        return prev + 1;
      });
    }, 2000); // Play next message every 2 seconds
  };

  const handlePause = () => {
    console.log('⏸️ Playback paused at message', currentMessageIndex);
    setPlaybackState('paused');
  };
  
  const handleStop = () => {
    console.log('⏹️ Playback stopped.');
    setPlaybackState('stopped');
    setCurrentMessageIndex(0);
  };

  return (
    <AnimatePresence>
      {shouldShowPlayer && (
        <motion.div
          className="flex items-center justify-between w-full"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.5 }}
        >
          {playbackState === 'playing' ? (
            <button onClick={handlePause} className="p-3 bg-yellow-500/20 text-yellow-400 rounded-full hover:bg-yellow-500/30 transition-colors">
              <Pause size={20} />
            </button>
          ) : (
            <button onClick={handlePlay} className="p-3 bg-green-500/20 text-matrix-green rounded-full hover:bg-green-500/30 transition-colors">
              <Play size={20} />
            </button>
          )}
          <span role="img" aria-label="voice" className="text-3xl">🗣️</span>
          <button onClick={handleStop} className="p-3 bg-red-500/20 text-red-400 rounded-full hover:bg-red-500/30 transition-colors">
            <Square size={20} />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
} 