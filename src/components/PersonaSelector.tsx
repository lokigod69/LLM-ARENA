'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { PERSONAS, PersonaDefinition } from '@/lib/personas';

// Card flip animation styles
const flipStyles = `
  .flip-card { perspective: 1000px; }
  .flip-card-inner {
    position: relative;
    width: 100%;
    height: 100%;
    transition: transform 0.6s;
    transform-style: preserve-3d;
  }
  .flip-card.flipped .flip-card-inner { transform: rotateY(180deg); }
  .flip-card-front, .flip-card-back {
    position: absolute;
    width: 100%;
    height: 100%;
    backface-visibility: hidden;
  }
  .flip-card-back { transform: rotateY(180deg); }
`;

// Helper function for initials
const getInitials = (name: string): string => {
  return name.split(' ').map(word => word[0]).join('.').toUpperCase() + '.';
};

interface PersonaSelectorProps {
  selectedPersonaId: string | null;
  onSelectPersona: (id: string | null) => void;
  title: string;
}

const PersonaSelector: React.FC<PersonaSelectorProps> = ({
  selectedPersonaId,
  onSelectPersona,
  title,
}) => {
  const selectedPersona = selectedPersonaId ? PERSONAS[selectedPersonaId] : null;

  const handlePersonaClick = (personaId: string) => {
    // Toggle behavior: if already selected, deselect
    if (selectedPersonaId === personaId) {
      onSelectPersona(null);
    } else {
      onSelectPersona(personaId);
    }
  };

  return (
    <>
      <style>{flipStyles}</style>
      <div className="matrix-panel p-4 rounded-lg border border-matrix-green/30 bg-matrix-dark/50 shadow-lg">
        <h3 className="text-lg font-matrix text-matrix-green tracking-wider text-center mb-4">{title}</h3>
        
        {/* Persona Grid with Flip Cards */}
        <div className="grid grid-cols-5 gap-4">
          {Object.values(PERSONAS).map((persona) => (
            <div
              key={persona.id}
              className={`flip-card ${selectedPersonaId === persona.id ? 'flipped' : ''} cursor-pointer hover:scale-105 transition-transform aspect-square rounded-md overflow-hidden`}
              onClick={() => handlePersonaClick(persona.id)}
            >
              <div className="flip-card-inner">
                {/* Front - Portrait */}
                <div className="flip-card-front">
                  <img
                    src={persona.portrait}
                    alt={persona.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                
                {/* Back - Black with initials */}
                <div className="flip-card-back bg-black flex items-center justify-center border border-matrix-green">
                  <span className="text-matrix-green text-2xl font-bold font-matrix">
                    {getInitials(persona.name)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Large Selected Persona Display */}
        {selectedPersonaId && PERSONAS[selectedPersonaId] && (
          <div 
            className="mt-6 flex flex-col items-center gap-3 p-6 border-2 border-matrix-green rounded-lg bg-black/50 shadow-[0_0_20px_rgba(0,255,0,0.3)] cursor-pointer hover:border-matrix-green/80 transition-colors"
            onClick={() => onSelectPersona(null)}
          >
            <img 
              src={PERSONAS[selectedPersonaId].portrait} 
              alt={PERSONAS[selectedPersonaId].name}
              className="w-32 h-32 border-2 border-matrix-green shadow-[0_0_25px_rgba(0,255,0,0.6)]"
            />
            <span className="text-matrix-green text-xl font-bold font-matrix tracking-wider">
              {PERSONAS[selectedPersonaId].name.toUpperCase()}
            </span>
            <span className="text-xs text-gray-400 italic">
              (Click to deselect)
            </span>
          </div>
        )}
      </div>
    </>
  );
};

export default PersonaSelector; 