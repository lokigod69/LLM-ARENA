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
  const getCacheKey = (): string => {
    const voiceId = personaId || modelName || 'default';
    const textHash = text.substring(0, 100); // Use first 100 chars as hash
    const cacheKey = `tts_${voiceId}_${textHash}`;
    
    // LOG: Cache key generation
    console.log('🔑 AudioPlayer: Cache key generated:', {
      cacheKey,
      voiceId,
      personaId: personaId || 'NONE',
      modelName: modelName || 'NONE',
      textHash: textHash.substring(0, 20) + '...',
    });
    
    return cacheKey;
  };

  // Get cached audio blob from IndexedDB
  const getCachedAudio = async (): Promise<string | null> => {
    if (typeof window === 'undefined') return null;
    
    const cacheKey = getCacheKey();
    console.log('🔍 AudioPlayer: Looking up cache:', cacheKey);
    
    try {
      // Try IndexedDB first (persistent storage)
      const db = await openIndexedDB();
      const blob = await getBlobFromIndexedDB(db, cacheKey);
      
      if (blob) {
        // Check if cache is still valid (24 hours)
        const metadata = await getCacheMetadata(db, cacheKey);
        if (metadata && Date.now() - metadata.timestamp < 24 * 60 * 60 * 1000) {
          const url = URL.createObjectURL(blob);
          console.log('✅ AudioPlayer: CACHE HIT (IndexedDB):', cacheKey);
          return url;
        } else {
          console.log('⏰ AudioPlayer: Cache expired, removing:', cacheKey);
          await deleteFromIndexedDB(db, cacheKey);
        }
      }
      
      // Fallback: Check localStorage (for backward compatibility)
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const data = JSON.parse(cached);
        if (Date.now() - data.timestamp < 24 * 60 * 60 * 1000) {
          console.log('✅ AudioPlayer: CACHE HIT (localStorage):', cacheKey);
          return data.url;
        } else {
          console.log('⏰ AudioPlayer: Cache expired (localStorage), removing:', cacheKey);
          localStorage.removeItem(cacheKey);
        }
      }
      
      console.log('❌ AudioPlayer: CACHE MISS:', cacheKey);
      return null;
    } catch (error) {
      console.error('❌ AudioPlayer: Error reading cache:', error);
      return null;
    }
  };

  // Cache audio blob in IndexedDB
  const cacheAudio = async (blob: Blob) => {
    if (typeof window === 'undefined') return;
    
    const cacheKey = getCacheKey();
    console.log('💾 AudioPlayer: Saving to cache:', cacheKey);
    
    try {
      // Save to IndexedDB (persistent storage)
      const db = await openIndexedDB();
      await saveBlobToIndexedDB(db, cacheKey, blob);
      console.log('✅ AudioPlayer: Saved to IndexedDB:', cacheKey);
      
      // Also save metadata to localStorage for quick lookup
      const metadata = {
        timestamp: Date.now(),
        cacheKey,
      };
      localStorage.setItem(`tts_meta_${cacheKey}`, JSON.stringify(metadata));
    } catch (error) {
      console.error('❌ AudioPlayer: Error saving to cache:', error);
      // Fallback: Try localStorage (but this won't persist blob URLs)
      try {
        const url = URL.createObjectURL(blob);
        const data = {
          url,
          timestamp: Date.now(),
        };
        localStorage.setItem(cacheKey, JSON.stringify(data));
        console.log('⚠️ AudioPlayer: Saved to localStorage (fallback):', cacheKey);
      } catch (fallbackError) {
        console.error('❌ AudioPlayer: Failed to save to localStorage:', fallbackError);
      }
    }
  };

  // IndexedDB helpers
  const openIndexedDB = (): Promise<IDBDatabase> => {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('TTSAudioCache', 1);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains('audioBlobs')) {
          db.createObjectStore('audioBlobs', { keyPath: 'key' });
        }
        if (!db.objectStoreNames.contains('metadata')) {
          db.createObjectStore('metadata', { keyPath: 'key' });
        }
      };
    });
  };

  const saveBlobToIndexedDB = async (db: IDBDatabase, key: string, blob: Blob): Promise<void> => {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['audioBlobs', 'metadata'], 'readwrite');
      
      // Save blob
      const blobStore = transaction.objectStore('audioBlobs');
      const blobRequest = blobStore.put({ key, blob });
      
      // Save metadata
      const metadataStore = transaction.objectStore('metadata');
      const metadataRequest = metadataStore.put({ 
        key, 
        timestamp: Date.now() 
      });
      
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
      
      blobRequest.onerror = () => reject(blobRequest.error);
      metadataRequest.onerror = () => reject(metadataRequest.error);
    });
  };

  const getBlobFromIndexedDB = async (db: IDBDatabase, key: string): Promise<Blob | null> => {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['audioBlobs'], 'readonly');
      const store = transaction.objectStore('audioBlobs');
      const request = store.get(key);
      
      request.onsuccess = () => {
        const result = request.result;
        resolve(result ? result.blob : null);
      };
      
      request.onerror = () => reject(request.error);
    });
  };

  const getCacheMetadata = async (db: IDBDatabase, key: string): Promise<{ timestamp: number } | null> => {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['metadata'], 'readonly');
      const store = transaction.objectStore('metadata');
      const request = store.get(key);
      
      request.onsuccess = () => {
        const result = request.result;
        resolve(result ? { timestamp: result.timestamp } : null);
      };
      
      request.onerror = () => reject(request.error);
    });
  };

  const deleteFromIndexedDB = async (db: IDBDatabase, key: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['audioBlobs', 'metadata'], 'readwrite');
      
      const blobStore = transaction.objectStore('audioBlobs');
      blobStore.delete(key);
      
      const metadataStore = transaction.objectStore('metadata');
      metadataStore.delete(key);
      
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
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

    // LOG: What voice parameters we have
    console.log('🔊 AudioPlayer.handlePlay called:', {
      personaId: personaId || 'NONE',
      modelName: modelName || 'NONE',
      textPreview: text.substring(0, 50) + '...',
    });

    // Check cache first (async)
    const cachedUrl = await getCachedAudio();
    if (cachedUrl) {
      console.log('✅ AudioPlayer: Using cached audio from IndexedDB');
      try {
        const audio = new Audio(cachedUrl);
        audioRef.current = audio;
        audio.play();
        setIsPlaying(true);
        setError(null);

        audio.onended = () => {
          setIsPlaying(false);
          // Clean up blob URL
          URL.revokeObjectURL(cachedUrl);
        };
        return;
      } catch (error) {
        console.error('❌ AudioPlayer: Error playing cached audio:', error);
        // Continue to fetch new audio
      }
    }

    // Fetch new audio
    if (!personaId && !modelName) {
      console.error('❌ AudioPlayer: No voice available (no personaId or modelName)');
      setError('No voice available');
      return;
    }

    console.log('📡 AudioPlayer: Fetching audio from API with:', {
      personaId: personaId || 'NONE',
      modelName: modelName || 'NONE',
    });

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
      console.log('📦 AudioPlayer: Received blob from API, size:', blob.size, 'bytes');
      
      // Cache the blob itself (persistent storage)
      await cacheAudio(blob);
      
      const url = URL.createObjectURL(blob);
      console.log('🎵 AudioPlayer: Created blob URL, playing audio');

      const audio = new Audio(url);
      audioRef.current = audio;

      audio.play();
      setIsPlaying(true);

      audio.onended = () => {
        setIsPlaying(false);
        // Clean up blob URL
        URL.revokeObjectURL(url);
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