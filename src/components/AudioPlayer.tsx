// ElevenLabs TTS Audio Player Component
// - Supports both persona voices (unique per persona) and model voices (shared per model)
// - Includes localStorage caching to avoid regenerating audio
// - Handles play/pause, loading states, and error handling
// - Fetches audio from /api/tts endpoint with ElevenLabs integration

'use client';

import { useState, useRef, useEffect } from 'react';
import { Play, Pause, Loader } from 'lucide-react';

interface AudioPlayerProps {
  text: string;
  personaId?: string;
  modelName?: string; // Optional: model name for fallback voice
}

const AudioPlayer = ({ text, personaId, modelName }: AudioPlayerProps) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Generate cache key from text and voice identifier
  const getCacheKey = () => {
    const voiceId = personaId || modelName || 'default';
    const textHash = text.substring(0, 100); // Use first 100 chars as hash
    return `tts_${voiceId}_${textHash}`;
  };

  // Get cached audio URL from localStorage
  const getCachedAudio = (): string | null => {
    if (typeof window === 'undefined') return null;
    try {
      const cached = localStorage.getItem(getCacheKey());
      if (cached) {
        const data = JSON.parse(cached);
        // Check if cache is still valid (24 hours)
        if (Date.now() - data.timestamp < 24 * 60 * 60 * 1000) {
          return data.url;
        } else {
          localStorage.removeItem(getCacheKey());
        }
      }
    } catch (error) {
      console.error('Error reading cache:', error);
    }
    return null;
  };

  // Cache audio URL in localStorage
  const cacheAudio = (url: string) => {
    if (typeof window === 'undefined') return;
    try {
      const data = {
        url,
        timestamp: Date.now(),
      };
      localStorage.setItem(getCacheKey(), JSON.stringify(data));
    } catch (error) {
      console.error('Error caching audio:', error);
      // If storage quota exceeded, clear old entries
      if (error instanceof Error && error.name === 'QuotaExceededError') {
        clearOldCache();
      }
    }
  };

  // Clear old cache entries (keep last 50)
  const clearOldCache = () => {
    if (typeof window === 'undefined') return;
    try {
      const keys = Object.keys(localStorage).filter(key => key.startsWith('tts_'));
      if (keys.length > 50) {
        const entries = keys.map(key => ({
          key,
          timestamp: JSON.parse(localStorage.getItem(key) || '{}').timestamp || 0,
        }));
        entries.sort((a, b) => a.timestamp - b.timestamp);
        entries.slice(0, entries.length - 50).forEach(entry => {
          localStorage.removeItem(entry.key);
        });
      }
    } catch (error) {
      console.error('Error clearing old cache:', error);
    }
  };

  const handlePlay = async () => {
    // If already playing, pause
    if (audioRef.current && !audioRef.current.paused) {
      audioRef.current.pause();
      setIsPlaying(false);
      return;
    }

    // If paused, resume
    if (audioRef.current && audioRef.current.paused) {
      audioRef.current.play();
      setIsPlaying(true);
      return;
    }

    // Check cache first
    const cachedUrl = getCachedAudio();
    if (cachedUrl) {
      try {
        const audio = new Audio(cachedUrl);
        audioRef.current = audio;
        audio.play();
        setIsPlaying(true);
        setError(null);

        audio.onended = () => {
          setIsPlaying(false);
        };
        return;
      } catch (error) {
        console.error('Error playing cached audio:', error);
        // Continue to fetch new audio
      }
    }

    // Fetch new audio
    if (!personaId && !modelName) {
      setError('No voice available');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text, personaId, modelName }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Failed to fetch audio');
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);

      // Cache the blob URL (we'll store the blob itself)
      cacheAudio(url);

      const audio = new Audio(url);
      audioRef.current = audio;

      audio.play();
      setIsPlaying(true);

      audio.onended = () => {
        setIsPlaying(false);
      };

      audio.onerror = (e) => {
        console.error('Audio playback error:', e);
        setError('Playback failed');
        setIsPlaying(false);
      };
    } catch (error) {
      console.error('Error playing audio:', error);
      setError(error instanceof Error ? error.message : 'Failed to load audio');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePause = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  return (
    <button
      onClick={isPlaying ? handlePause : handlePlay}
      className="ml-2 p-1 text-green-500 hover:text-green-300 transition-colors focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
      aria-label={isPlaying ? 'Pause audio' : 'Play audio'}
      disabled={isLoading}
      title={error || (isPlaying ? 'Pause audio' : 'Play audio')}
    >
      {isLoading ? (
        <Loader className="animate-spin" size={16} />
      ) : isPlaying ? (
        <Pause size={16} />
      ) : (
        <Play size={16} />
      )}
    </button>
  );
};

export default AudioPlayer; 