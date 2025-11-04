// Play All Button Component
// - Plays all debate messages sequentially in chronological order
// - Uses existing AudioPlayer caching to minimize API calls
// - Shows visual feedback for currently playing message
// - Matrix-themed styling matching the app

'use client';

import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import type { Message } from '@/types';
import type { AvailableModel } from '@/types';
import { usePlayback } from '@/contexts/PlaybackContext';

interface PlayAllButtonProps {
  modelAMessages: Message[];
  modelBMessages: Message[];
  modelA: { name: AvailableModel; personaId?: string };
  modelB: { name: AvailableModel; personaId?: string };
}

const PlayAllButton = ({ modelAMessages, modelBMessages, modelA, modelB }: PlayAllButtonProps) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const { setPlayingMessageId } = usePlayback();
  const audioRefs = useRef<Map<string, HTMLAudioElement>>(new Map());
  const queueRef = useRef<Array<{ message: Message; modelName: AvailableModel; personaId?: string }>>([]);
  const isPlayingRef = useRef(false);

  // Combine messages in chronological order
  const getAllMessagesInOrder = () => {
    const allMessages: Array<{ message: Message; modelName: AvailableModel; personaId?: string }> = [];
    
    // Add Model A messages
    modelAMessages.forEach(msg => {
      allMessages.push({
        message: msg,
        modelName: modelA.name,
        personaId: modelA.personaId,
      });
    });
    
    // Add Model B messages
    modelBMessages.forEach(msg => {
      allMessages.push({
        message: msg,
        modelName: modelB.name,
        personaId: modelB.personaId,
      });
    });
    
    // Sort by timestamp
    return allMessages.sort((a, b) => 
      new Date(a.message.timestamp).getTime() - new Date(b.message.timestamp).getTime()
    );
  };

  // Generate cache key (same as AudioPlayer)
  const getCacheKey = (text: string, voiceId: string) => {
    const textHash = text.substring(0, 100);
    return `tts_${voiceId}_${textHash}`;
  };

  // Get cached audio URL from localStorage
  const getCachedAudio = (text: string, personaId?: string, modelName?: AvailableModel): string | null => {
    if (typeof window === 'undefined') return null;
    try {
      const voiceId = personaId || modelName || 'default';
      const cacheKey = getCacheKey(text, voiceId);
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const data = JSON.parse(cached);
        if (Date.now() - data.timestamp < 24 * 60 * 60 * 1000) {
          return data.url;
        } else {
          localStorage.removeItem(cacheKey);
        }
      }
    } catch (error) {
      console.error('Error reading cache:', error);
    }
    return null;
  };

  // Fetch audio from API
  const fetchAudio = async (text: string, personaId?: string, modelName?: AvailableModel): Promise<string> => {
    const response = await fetch('/api/tts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text, personaId, modelName }),
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch audio: ${response.statusText}`);
    }

    const blob = await response.blob();
    return URL.createObjectURL(blob);
  };

  // Play a single message
  const playMessage = async (
    message: Message,
    modelName: AvailableModel,
    onComplete: () => void,
    personaId?: string
  ): Promise<void> => {
    setPlayingMessageId(message.id);

    try {
      // Check cache first
      let audioUrl = getCachedAudio(message.text, personaId, modelName);

      if (!audioUrl) {
        // Fetch from API
        audioUrl = await fetchAudio(message.text, personaId, modelName);
      }

      const audio = new Audio(audioUrl);
      audioRefs.current.set(message.id, audio);

      audio.onended = () => {
        setPlayingMessageId(null);
        audioRefs.current.delete(message.id);
        onComplete();
      };

      audio.onerror = () => {
        console.error('Audio playback error for message:', message.id);
        setPlayingMessageId(null);
        audioRefs.current.delete(message.id);
        onComplete();
      };

      await audio.play();
    } catch (error) {
      console.error('Error playing message:', error);
      setPlayingMessageId(null);
      audioRefs.current.delete(message.id);
      onComplete();
    }
  };

  // Play all messages sequentially
  const playAll = async () => {
    const messages = getAllMessagesInOrder();
    
    if (messages.length === 0) {
      return;
    }

    setIsPlaying(true);
    isPlayingRef.current = true;
    setCurrentIndex(0);
    queueRef.current = messages;

    // Play messages one by one
    for (let i = 0; i < messages.length; i++) {
      // Check if we should continue (using ref to avoid stale closure)
      if (!isPlayingRef.current) {
        break;
      }

      setCurrentIndex(i);
      
      await new Promise<void>((resolve) => {
        playMessage(
          messages[i].message,
          messages[i].modelName,
          () => {
            // Wait 0.5 seconds between messages
            setTimeout(() => {
              resolve();
            }, 500);
          },
          messages[i].personaId
        );
      });

      // Check if we should continue after each message
      if (!isPlayingRef.current) {
        break;
      }
    }

    // Finished playing all messages
    setIsPlaying(false);
    isPlayingRef.current = false;
    setCurrentIndex(0);
    setPlayingMessageId(null);
    queueRef.current = [];
  };

  // Stop playback
  const stopAll = () => {
    setIsPlaying(false);
    isPlayingRef.current = false;
    setCurrentIndex(0);
    setPlayingMessageId(null);
    
    // Stop all currently playing audio
    audioRefs.current.forEach((audio) => {
      audio.pause();
      audio.currentTime = 0;
    });
    audioRefs.current.clear();
    
    queueRef.current = [];
  };

  // Track isPlaying state for the loop (using ref to avoid stale closure)
  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  // Cleanup on unmount
  useEffect(() => {
    const audioRefsMap = audioRefs.current;
    return () => {
      audioRefsMap.forEach((audio) => {
        audio.pause();
        audio.currentTime = 0;
      });
      audioRefsMap.clear();
    };
  }, []);

  const messages = getAllMessagesInOrder();
  const totalMessages = messages.length;
  const hasMessages = totalMessages > 0;

  if (!hasMessages) {
    return null;
  }

  return (
    <motion.div
      className="w-full flex flex-col items-center gap-2"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <motion.button
        onClick={isPlaying ? stopAll : playAll}
        disabled={!hasMessages}
        className={`w-full flex flex-col items-center gap-2 p-3 border-2 rounded-lg font-matrix tracking-wider transition-all duration-300 ${
          isPlaying
            ? 'border-red-500/50 bg-red-900/20 text-red-400 hover:bg-red-900/40'
            : 'border-matrix-green/50 bg-matrix-green/10 text-matrix-green hover:bg-matrix-green/20 hover:border-matrix-green'
        } ${!hasMessages ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        whileHover={hasMessages && !isPlaying ? { scale: 1.02 } : {}}
        whileTap={hasMessages ? { scale: 0.98 } : {}}
        animate={isPlaying ? {
          boxShadow: '0 0 20px rgba(239, 68, 68, 0.5)',
        } : {
          boxShadow: '0 0 15px rgba(16, 185, 129, 0.3)',
        }}
        transition={{ duration: 0.3 }}
      >
        <span className="text-2xl">
          {isPlaying ? '■' : '▶'}
        </span>
        <span className="text-sm font-bold">
          {isPlaying ? 'STOP' : 'PLAY ALL'}
        </span>
        {isPlaying && totalMessages > 0 && (
          <span className="text-xs text-matrix-green-dim">
            {currentIndex + 1} / {totalMessages}
          </span>
        )}
      </motion.button>
    </motion.div>
  );
};

export default PlayAllButton;

