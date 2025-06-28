// This comment fulfills the user request to document changes.
// - Created a new, isolated AudioPlayer component.
// - This component is self-contained and manages its own state for audio playback.
// - It includes a play/pause button with a Matrix-style design.
// - It fetches audio from the mock /api/tts endpoint.
// - It handles loading states and audio playback using the HTML5 Audio API.

'use client';

import { useState, useRef } from 'react';
import { Play, Pause, Loader } from 'lucide-react';

interface AudioPlayerProps {
  text: string;
  personaId: string;
}

const AudioPlayer = ({ text, personaId }: AudioPlayerProps) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const handlePlay = async () => {
    if (audioRef.current && !audioRef.current.paused) {
      audioRef.current.pause();
      setIsPlaying(false);
      return;
    }

    if (audioRef.current && audioRef.current.paused) {
      audioRef.current.play();
      setIsPlaying(true);
      return;
    }
    
    setIsLoading(true);
    try {
      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text, personaId }),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch audio');
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      
      const audio = new Audio(url);
      audioRef.current = audio;

      audio.play();
      setIsPlaying(true);

      audio.onended = () => {
        setIsPlaying(false);
        URL.revokeObjectURL(url); // Clean up the object URL
        audioRef.current = null;
      };
    } catch (error) {
      console.error('Error playing audio:', error);
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

  return (
    <button
      onClick={isPlaying ? handlePause : handlePlay}
      className="ml-2 p-1 text-green-500 hover:text-green-300 transition-colors focus:outline-none"
      aria-label={isPlaying ? 'Pause audio' : 'Play audio'}
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