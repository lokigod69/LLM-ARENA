// ElevenLabs TTS Audio Player Component
// - Supports both persona voices (unique per persona) and model voices (shared per model)
// - Includes IndexedDB caching to avoid regenerating audio (persistent storage)
// - Handles play/pause/restart, loading states, and error handling
// - Fetches audio from /api/tts endpoint with ElevenLabs integration
// - PROMPT 3: Added restart button to reset audio to beginning

'use client';

import { useState, useRef, useEffect } from 'react';
import { Play, Pause, Loader, RotateCcw } from 'lucide-react';

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
          // Create blob URL from reconstructed blob
          const url = URL.createObjectURL(blob);
          
          // LOG: Blob URL creation
          console.log('🔗 AudioPlayer: Created blob URL:', {
            url: url.substring(0, 50) + '...',
            blobType: blob.type,
            blobSize: blob.size,
          });
          
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
    // LOG: Blob details before saving
    console.log('💾 AudioPlayer: Saving blob to IndexedDB:', {
      key,
      type: blob.type,
      size: blob.size,
      isBlob: blob instanceof Blob,
    });
    
    return new Promise(async (resolve, reject) => {
      try {
        // Convert blob to ArrayBuffer for IndexedDB storage
        const arrayBuffer = await blob.arrayBuffer();
        
        const transaction = db.transaction(['audioBlobs', 'metadata'], 'readwrite');
        
        // Save blob as ArrayBuffer with metadata
        const blobStore = transaction.objectStore('audioBlobs');
        const blobRequest = blobStore.put({ 
          key, 
          arrayBuffer,
          type: blob.type, // Store MIME type to reconstruct Blob later
          size: blob.size,
        });
        
        // Save metadata
        const metadataStore = transaction.objectStore('metadata');
        const metadataRequest = metadataStore.put({ 
          key, 
          timestamp: Date.now() 
        });
        
        transaction.oncomplete = () => {
          console.log('✅ AudioPlayer: Blob saved to IndexedDB successfully:', key);
          resolve();
        };
        transaction.onerror = () => {
          console.error('❌ AudioPlayer: Transaction error:', transaction.error);
          reject(transaction.error);
        };
        
        blobRequest.onerror = () => {
          console.error('❌ AudioPlayer: Blob save error:', blobRequest.error);
          reject(blobRequest.error);
        };
        metadataRequest.onerror = () => {
          console.error('❌ AudioPlayer: Metadata save error:', metadataRequest.error);
          reject(metadataRequest.error);
        };
      } catch (error) {
        console.error('❌ AudioPlayer: Error converting blob to ArrayBuffer:', error);
        reject(error);
      }
    });
  };

  const getBlobFromIndexedDB = async (db: IDBDatabase, key: string): Promise<Blob | null> => {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['audioBlobs'], 'readonly');
      const store = transaction.objectStore('audioBlobs');
      const request = store.get(key);
      
      request.onsuccess = () => {
        const result = request.result;
        
        if (!result) {
          console.log('❌ AudioPlayer: No blob found in IndexedDB:', key);
          resolve(null);
          return;
        }
        
        // LOG: Retrieved data details
        console.log('📦 AudioPlayer: Retrieved from IndexedDB:', {
          key,
          hasArrayBuffer: !!result.arrayBuffer,
          type: result.type,
          size: result.size,
        });
        
        try {
          // Reconstruct Blob from ArrayBuffer
          const blob = new Blob([result.arrayBuffer], { type: result.type || 'audio/mpeg' });
          
          // LOG: Reconstructed blob details
          console.log('🔄 AudioPlayer: Reconstructed blob:', {
            type: blob.type,
            size: blob.size,
            isBlob: blob instanceof Blob,
          });
          
          resolve(blob);
        } catch (error) {
          console.error('❌ AudioPlayer: Error reconstructing blob:', error);
          resolve(null);
        }
      };
      
      request.onerror = () => {
        console.error('❌ AudioPlayer: IndexedDB get error:', request.error);
        reject(request.error);
      };
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
    const voiceId = personaId || modelName || 'default';
    console.log('🔊 AudioPlayer.handlePlay called:', {
      personaId: personaId || 'NONE',
      modelName: modelName || 'NONE',
      voiceId: voiceId,
      textPreview: text.substring(0, 50) + '...',
    });
    
    // LOG: Voice ID being used (for debugging)
    console.log('🎤 AudioPlayer: Using voice ID:', voiceId, 'for persona:', personaId || 'NONE', 'model:', modelName || 'NONE');

    // Check cache first (async) - get blob, create fresh URL
    const cachedBlobUrl = await getCachedAudio();
    if (cachedBlobUrl) {
      console.log('✅ AudioPlayer: Using cached audio from IndexedDB');
      try {
        // Create fresh blob URL each time (never reuse old URLs)
        const freshUrl = cachedBlobUrl; // getCachedAudio already returns a fresh blob URL
        const audio = new Audio(freshUrl);
        audioRef.current = audio;
        
        audio.play();
        setIsPlaying(true);
        setError(null);

        audio.onended = () => {
          setIsPlaying(false);
          // Clean up blob URL when done
          if (freshUrl.startsWith('blob:')) {
            URL.revokeObjectURL(freshUrl);
          }
        };
        
        audio.onerror = (e) => {
          console.error('❌ AudioPlayer: Audio playback error:', e);
          setIsPlaying(false);
          setError('Playback failed');
          // Clean up blob URL on error
          if (freshUrl.startsWith('blob:')) {
            URL.revokeObjectURL(freshUrl);
          }
        };
        
        return;
      } catch (error) {
        console.error('❌ AudioPlayer: Error playing cached audio:', error);
        // Clean up blob URL on error
        if (cachedBlobUrl.startsWith('blob:')) {
          URL.revokeObjectURL(cachedBlobUrl);
        }
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
      console.log('📦 AudioPlayer: Received blob from API:', {
        type: blob.type,
        size: blob.size,
        isBlob: blob instanceof Blob,
      });
      
      // Cache the blob itself (persistent storage)
      await cacheAudio(blob);
      
      const url = URL.createObjectURL(blob);
      console.log('🎵 AudioPlayer: Created blob URL, playing audio:', {
        url: url.substring(0, 50) + '...',
        blobType: blob.type,
        blobSize: blob.size,
      });

      const audio = new Audio(url);
      audioRef.current = audio;

      audio.play();
      setIsPlaying(true);

      audio.onended = () => {
        setIsPlaying(false);
        // Clean up blob URL when done
        if (url.startsWith('blob:')) {
          URL.revokeObjectURL(url);
        }
      };

      audio.onerror = (e) => {
        console.error('❌ AudioPlayer: Audio playback error:', e);
        setError('Playback failed');
        setIsPlaying(false);
        // Clean up blob URL on error
        if (url.startsWith('blob:')) {
          URL.revokeObjectURL(url);
        }
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

  // PROMPT 3: Restart audio from beginning
  const handleRestart = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  // Cleanup on unmount - revoke any active blob URLs
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        // Get current src (might be a blob URL)
        const currentSrc = audioRef.current.src;
        
        // Pause and cleanup audio element
        audioRef.current.pause();
        
        // Revoke blob URL if it's a blob URL
        if (currentSrc.startsWith('blob:')) {
          try {
            URL.revokeObjectURL(currentSrc);
            console.log('🧹 AudioPlayer: Cleaned up blob URL on unmount');
          } catch (error) {
            console.error('❌ AudioPlayer: Error revoking blob URL:', error);
          }
        }
        
        audioRef.current = null;
      }
    };
  }, []);

  return (
    <div className="flex items-center gap-1 ml-2">
      {/* PROMPT 3: Play/Pause Button */}
      <button
        onClick={isPlaying ? handlePause : handlePlay}
        className="p-1 text-green-500 hover:text-green-300 transition-colors focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed hover:drop-shadow-[0_0_8px_rgba(0,255,65,0.6)]"
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
      {/* PROMPT 3: Restart Button */}
      {audioRef.current && (
        <button
          onClick={handleRestart}
          className="p-1 text-green-500 hover:text-green-300 transition-colors focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed hover:drop-shadow-[0_0_8px_rgba(0,255,65,0.6)]"
          aria-label="Restart from beginning"
          title="Restart from beginning"
        >
          <RotateCcw size={16} />
        </button>
      )}
    </div>
  );
};

export default AudioPlayer; 