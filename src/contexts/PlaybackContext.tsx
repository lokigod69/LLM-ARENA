// Playback Context for managing currently playing message
// Used by PlayAllButton and ChatColumn to highlight playing messages

'use client';

import { createContext, useContext, useState, ReactNode } from 'react';

interface PlaybackContextType {
  playingMessageId: string | null;
  setPlayingMessageId: (id: string | null) => void;
}

const PlaybackContext = createContext<PlaybackContextType | undefined>(undefined);

export function PlaybackProvider({ children }: { children: ReactNode }) {
  const [playingMessageId, setPlayingMessageId] = useState<string | null>(null);

  return (
    <PlaybackContext.Provider value={{ playingMessageId, setPlayingMessageId }}>
      {children}
    </PlaybackContext.Provider>
  );
}

export function usePlayback() {
  const context = useContext(PlaybackContext);
  // Return default values if context is not available (for graceful degradation)
  if (context === undefined) {
    return {
      playingMessageId: null,
      setPlayingMessageId: () => {},
    };
  }
  return context;
}

