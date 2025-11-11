// Changes: Introduced global audio context to coordinate single active playback.
'use client';

import { createContext, useContext, useRef, type ReactNode, type MutableRefObject } from 'react';

interface AudioContextValue {
  currentAudioRef: MutableRefObject<HTMLAudioElement | null>;
  stopCurrentAudio: () => void;
}

const AudioContext = createContext<AudioContextValue | undefined>(undefined);

export function AudioProvider({ children }: { children: ReactNode }) {
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);

  const stopCurrentAudio = () => {
    const activeAudio = currentAudioRef.current;
    if (activeAudio) {
      try {
        console.log('⏹️ Stopping previous audio');
        activeAudio.pause();
        activeAudio.currentTime = 0;
        activeAudio.dispatchEvent(new Event('ended'));
      } catch (error) {
        console.error('❌ Failed to stop current audio:', error);
      }
      currentAudioRef.current = null;
    }
  };

  return (
    <AudioContext.Provider value={{ currentAudioRef, stopCurrentAudio }}>
      {children}
    </AudioContext.Provider>
  );
}

export function useAudioContext(): AudioContextValue {
  const context = useContext(AudioContext);
  if (!context) {
    throw new Error('useAudioContext must be used within an AudioProvider');
  }
  return context;
}

