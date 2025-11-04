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
  const getCacheKey = (text: string, voiceId: string): string => {
    const textHash = text.substring(0, 100);
    const cacheKey = `tts_${voiceId}_${textHash}`;
    
    console.log('🔑 PlayAllButton: Cache key generated:', {
      cacheKey,
      voiceId,
      textHash: textHash.substring(0, 20) + '...',
    });
    
    return cacheKey;
  };

  // IndexedDB helpers (same as AudioPlayer)
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

  const getBlobFromIndexedDB = async (db: IDBDatabase, key: string): Promise<Blob | null> => {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['audioBlobs'], 'readonly');
      const store = transaction.objectStore('audioBlobs');
      const request = store.get(key);
      
      request.onsuccess = () => {
        const result = request.result;
        
        if (!result) {
          console.log('❌ PlayAllButton: No blob found in IndexedDB:', key);
          resolve(null);
          return;
        }
        
        // LOG: Retrieved data details
        console.log('📦 PlayAllButton: Retrieved from IndexedDB:', {
          key,
          hasArrayBuffer: !!result.arrayBuffer,
          type: result.type,
          size: result.size,
        });
        
        try {
          // Reconstruct Blob from ArrayBuffer
          const blob = new Blob([result.arrayBuffer], { type: result.type || 'audio/mpeg' });
          
          // LOG: Reconstructed blob details
          console.log('🔄 PlayAllButton: Reconstructed blob:', {
            type: blob.type,
            size: blob.size,
            isBlob: blob instanceof Blob,
          });
          
          resolve(blob);
        } catch (error) {
          console.error('❌ PlayAllButton: Error reconstructing blob:', error);
          resolve(null);
        }
      };
      
      request.onerror = () => {
        console.error('❌ PlayAllButton: IndexedDB get error:', request.error);
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

  const saveBlobToIndexedDB = async (db: IDBDatabase, key: string, blob: Blob): Promise<void> => {
    // LOG: Blob details before saving
    console.log('💾 PlayAllButton: Saving blob to IndexedDB:', {
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
          console.log('✅ PlayAllButton: Blob saved to IndexedDB successfully:', key);
          resolve();
        };
        transaction.onerror = () => {
          console.error('❌ PlayAllButton: Transaction error:', transaction.error);
          reject(transaction.error);
        };
        
        blobRequest.onerror = () => {
          console.error('❌ PlayAllButton: Blob save error:', blobRequest.error);
          reject(blobRequest.error);
        };
        metadataRequest.onerror = () => {
          console.error('❌ PlayAllButton: Metadata save error:', metadataRequest.error);
          reject(metadataRequest.error);
        };
      } catch (error) {
        console.error('❌ PlayAllButton: Error converting blob to ArrayBuffer:', error);
        reject(error);
      }
    });
  };

  // Get cached audio URL from IndexedDB
  const getCachedAudio = async (text: string, personaId?: string, modelName?: AvailableModel): Promise<string | null> => {
    if (typeof window === 'undefined') return null;
    
    const voiceId = personaId || modelName || 'default';
    const cacheKey = getCacheKey(text, voiceId);
    
    console.log('🔍 PlayAllButton: Looking up cache:', cacheKey);
    
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
          console.log('🔗 PlayAllButton: Created blob URL:', {
            url: url.substring(0, 50) + '...',
            blobType: blob.type,
            blobSize: blob.size,
          });
          
          console.log('✅ PlayAllButton: CACHE HIT (IndexedDB):', cacheKey);
          return url;
        } else {
          console.log('⏰ PlayAllButton: Cache expired, removing:', cacheKey);
        }
      }
      
      // Fallback: Check localStorage (for backward compatibility)
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const data = JSON.parse(cached);
        if (Date.now() - data.timestamp < 24 * 60 * 60 * 1000) {
          console.log('✅ PlayAllButton: CACHE HIT (localStorage):', cacheKey);
          return data.url;
        } else {
          console.log('⏰ PlayAllButton: Cache expired (localStorage), removing:', cacheKey);
          localStorage.removeItem(cacheKey);
        }
      }
      
      console.log('❌ PlayAllButton: CACHE MISS:', cacheKey);
      return null;
    } catch (error) {
      console.error('❌ PlayAllButton: Error reading cache:', error);
      return null;
    }
  };

  // Fetch audio from API and cache it
  const fetchAudio = async (text: string, personaId?: string, modelName?: AvailableModel): Promise<string> => {
    console.log('📡 PlayAllButton: Fetching audio from API:', {
      personaId: personaId || 'NONE',
      modelName: modelName || 'NONE',
      textPreview: text.substring(0, 50) + '...',
    });
    
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
    console.log('📦 PlayAllButton: Received blob from API, size:', blob.size, 'bytes');
    
    // Cache the blob itself (persistent storage)
    const voiceId = personaId || modelName || 'default';
    const cacheKey = getCacheKey(text, voiceId);
    
    try {
      const db = await openIndexedDB();
      await saveBlobToIndexedDB(db, cacheKey, blob);
      console.log('✅ PlayAllButton: Saved to IndexedDB:', cacheKey);
    } catch (error) {
      console.error('❌ PlayAllButton: Error saving to cache:', error);
    }
    
    return URL.createObjectURL(blob);
  };

  // Play a single message
  const playMessage = async (
    message: Message,
    modelName: AvailableModel,
    onComplete: () => void,
    personaId?: string
  ): Promise<void> => {
    // CRITICAL: Prioritize message.personaId over column-level personaId
    // Message-level personaId is more specific (set when message was created)
    const effectivePersonaId = message.personaId || personaId;

    // LOG: What we're playing
    console.log('🎵 PlayAllButton.playMessage called:', {
      messageId: message.id,
      messagePersonaId: message.personaId || 'NONE',
      columnPersonaId: personaId || 'NONE',
      effectivePersonaId: effectivePersonaId || 'NONE',
      modelName,
      textPreview: message.text.substring(0, 50) + '...',
    });

    setPlayingMessageId(message.id);

    try {
      // Check cache first - use effectivePersonaId (async)
      let audioUrl = await getCachedAudio(message.text, effectivePersonaId, modelName);

      if (!audioUrl) {
        console.log('📡 PlayAllButton: Fetching audio from API');
        // Fetch from API - use effectivePersonaId
        audioUrl = await fetchAudio(message.text, effectivePersonaId, modelName);
      } else {
        console.log('✅ PlayAllButton: Using cached audio from IndexedDB');
      }

      // Create fresh Audio element with the blob URL
      const audio = new Audio(audioUrl);
      audioRefs.current.set(message.id, audio);

      audio.onended = () => {
        setPlayingMessageId(null);
        audioRefs.current.delete(message.id);
        // Clean up blob URL when done
        if (audioUrl.startsWith('blob:')) {
          URL.revokeObjectURL(audioUrl);
        }
        onComplete();
      };

      audio.onerror = () => {
        console.error('❌ PlayAllButton: Audio playback error for message:', message.id);
        setPlayingMessageId(null);
        audioRefs.current.delete(message.id);
        // Clean up blob URL on error
        if (audioUrl.startsWith('blob:')) {
          URL.revokeObjectURL(audioUrl);
        }
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
    
    // Stop all currently playing audio and revoke blob URLs
    audioRefs.current.forEach((audio) => {
      const audioSrc = audio.src;
      audio.pause();
      audio.currentTime = 0;
      // Clean up blob URL
      if (audioSrc.startsWith('blob:')) {
        try {
          URL.revokeObjectURL(audioSrc);
        } catch (error) {
          console.error('❌ PlayAllButton: Error revoking blob URL:', error);
        }
      }
    });
    audioRefs.current.clear();
    
    queueRef.current = [];
  };

  // Track isPlaying state for the loop (using ref to avoid stale closure)
  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  // Cleanup on unmount - revoke all blob URLs
  useEffect(() => {
    const audioRefsMap = audioRefs.current;
    return () => {
      audioRefsMap.forEach((audio) => {
        const audioSrc = audio.src;
        audio.pause();
        audio.currentTime = 0;
        // Clean up blob URL
        if (audioSrc.startsWith('blob:')) {
          try {
            URL.revokeObjectURL(audioSrc);
            console.log('🧹 PlayAllButton: Cleaned up blob URL on unmount');
          } catch (error) {
            console.error('❌ PlayAllButton: Error revoking blob URL:', error);
          }
        }
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

