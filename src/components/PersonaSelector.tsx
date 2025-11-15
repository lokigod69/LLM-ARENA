// Change Log:
// - Added PNG-first persona portraits with JPG fallback for selector thumbnails and preview.

'use client';
import { motion, AnimatePresence } from 'framer-motion';
import { PERSONAS, getPersonaPortraitPaths, getPersonasForContext } from '@/lib/personas';

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
  const selectedPortraitPaths = selectedPersona
    ? getPersonaPortraitPaths(selectedPersona.id)
    : { primary: '', fallback: '' };
  const selectedPortraitSrc = selectedPersona
    ? selectedPortraitPaths.primary || selectedPersona.portrait
    : '';
  const selectedShouldFallback =
    Boolean(selectedPersona && selectedPortraitPaths.fallback && selectedPortraitPaths.fallback !== selectedPortraitSrc);

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
          {Object.values(getPersonasForContext('debate')).map((persona) => {
            const portraitPaths = getPersonaPortraitPaths(persona.id);
            const portraitSrc = portraitPaths.primary || persona.portrait;
            const shouldFallback = portraitPaths.fallback && portraitPaths.fallback !== portraitSrc;

            return (
              <div
                key={persona.id}
                className={`flip-card ${selectedPersonaId === persona.id ? 'flipped' : ''} cursor-pointer hover:scale-105 transition-transform aspect-square rounded-md overflow-hidden`}
                onClick={() => handlePersonaClick(persona.id)}
              >
                <div className="flip-card-inner">
                  {/* Front - Portrait */}
                  <div className="flip-card-front">
                    <img
                      src={portraitSrc}
                      alt={persona.name}
                      onError={
                        shouldFallback
                          ? (e) => {
                              e.currentTarget.onerror = null;
                              e.currentTarget.src = portraitPaths.fallback;
                            }
                          : undefined
                      }
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
            );
          })}
        </div>

      </div>
    </>
  );
};

export default PersonaSelector; 