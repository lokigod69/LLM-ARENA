'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { PERSONAS, PersonaDefinition } from '@/lib/personas';

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

  return (
    <div className="matrix-panel p-4 rounded-lg border border-matrix-green/30 bg-matrix-dark/50 shadow-lg">
      <h3 className="text-lg font-matrix text-matrix-green tracking-wider text-center mb-4">{title}</h3>
      
      {/* Restructured Grid and Button Layout */}
      <div>
        <div className="grid grid-cols-5 gap-4">
          {Object.values(PERSONAS).map((persona) => (
            <div
              key={persona.id}
              onClick={() => onSelectPersona(persona.id === selectedPersonaId ? null : persona.id)}
              className={`relative group rounded-md overflow-hidden transition-transform transform hover:scale-105 aspect-square cursor-pointer ${
                selectedPersonaId === persona.id
                  ? 'ring-2 ring-matrix-blue ring-offset-2 ring-offset-matrix-dark'
                  : 'border-2 border-matrix-green/30 hover:border-matrix-green'
              }`}
            >
              <img
                src={persona.portrait}
                alt={persona.name}
                className="w-full h-full object-cover transition-opacity duration-300 group-hover:opacity-75"
              />
              <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <span className="text-white text-xs text-center p-1">{persona.name}</span>
              </div>
              {selectedPersonaId === persona.id && (
                <div className="absolute bottom-1 right-1 bg-matrix-blue rounded-full p-1">
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="mt-4 flex justify-center">
          {/* No Persona Button */}
          <div
            onClick={() => onSelectPersona(null)}
            className={`relative group rounded-md flex items-center justify-center bg-transparent w-24 h-24 cursor-pointer ${
              !selectedPersonaId
                ? 'ring-2 ring-matrix-blue ring-offset-2 ring-offset-matrix-dark'
                : 'border-2 border-dashed border-matrix-green/40 hover:border-matrix-green'
            }`}
          >
            {/* Icon is always visible */}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-8 w-8 text-matrix-green/50 group-hover:text-matrix-green/80 transition-colors"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>

            {/* Text overlay appears on hover */}
            <div className="absolute inset-0 bg-black bg-opacity-70 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-md">
              <span className="text-white text-xs text-center p-1">No Persona</span>
            </div>

            {/* Add checkmark when selected to match other items */}
            {!selectedPersonaId && (
              <div className="absolute bottom-1 right-1 bg-matrix-blue rounded-full p-1">
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PersonaSelector; 