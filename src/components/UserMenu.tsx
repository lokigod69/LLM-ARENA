'use client';

import { useSession, signOut } from 'next-auth/react';
import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function UserMenu() {
  const { data: session, status } = useSession();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  if (status === 'loading') {
    return (
      <div className="h-10 w-10 rounded-full bg-matrix-dark border border-matrix-green-dark animate-pulse" />
    );
  }

  if (status === 'unauthenticated' || !session) {
    return null;
  }

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'pro':
        return 'text-yellow-400';
      case 'basic':
        return 'text-blue-400';
      case 'free':
      default:
        return 'text-matrix-green';
    }
  };

  const getTierBadge = (tier: string) => {
    switch (tier) {
      case 'pro':
        return '⭐ PRO';
      case 'basic':
        return '⚡ BASIC';
      case 'free':
      default:
        return '🆓 FREE';
    }
  };

  return (
    <div className="relative" ref={menuRef}>
      {/* Avatar Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="h-10 w-10 rounded-full overflow-hidden border-2 border-matrix-green hover:border-matrix-green-bright transition-colors"
      >
        {session.user.image ? (
          <img
            src={session.user.image}
            alt={session.user.name || 'User'}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="h-full w-full bg-matrix-green flex items-center justify-center text-matrix-black font-bold">
            {session.user.name?.[0] || session.user.email?.[0] || 'U'}
          </div>
        )}
      </button>

      {/* Dropdown Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="absolute right-0 mt-2 w-64 bg-matrix-dark border border-matrix-green-dark rounded-lg shadow-lg overflow-hidden z-50"
          >
            {/* User Info */}
            <div className="p-4 border-b border-matrix-green-dark">
              <p className="text-matrix-green font-semibold truncate">
                {session.user.name || 'User'}
              </p>
              <p className="text-matrix-text text-sm truncate">
                {session.user.email}
              </p>
            </div>

            {/* Tier & Quota */}
            <div className="p-4 border-b border-matrix-green-dark">
              <div className="flex items-center justify-between mb-2">
                <span className="text-matrix-text text-sm">Tier:</span>
                <span className={`text-sm font-bold ${getTierColor(session.user.tier)}`}>
                  {getTierBadge(session.user.tier)}
                </span>
              </div>
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-matrix-text">Debates:</span>
                  <span className="text-matrix-green font-mono">
                    {session.user.debatesRemaining >= 0 ? session.user.debatesRemaining : '∞'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-matrix-text">Chats:</span>
                  <span className="text-matrix-green font-mono">
                    {session.user.chatsRemaining >= 0 ? session.user.chatsRemaining : '∞'}
                  </span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="p-2">
              {session.user.tier !== 'pro' && (
                <button
                  onClick={() => {
                    setIsOpen(false);
                    // TODO: Navigate to upgrade page when implemented
                    window.alert('Upgrade feature coming soon in Phase 2B (Stripe)');
                  }}
                  className="w-full text-left px-3 py-2 text-sm text-yellow-400 hover:bg-matrix-green-dark rounded transition-colors"
                >
                  ⚡ Upgrade Plan
                </button>
              )}
              <button
                onClick={() => {
                  setIsOpen(false);
                  signOut({ callbackUrl: '/' });
                }}
                className="w-full text-left px-3 py-2 text-sm text-red-400 hover:bg-matrix-green-dark rounded transition-colors"
              >
                🚪 Sign Out
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
