'use client';

import { useSession } from 'next-auth/react';
import UserMenu from './UserMenu';

interface SignInButtonProps {
  onSignInClick?: () => void;
}

export default function SignInButton({ onSignInClick }: SignInButtonProps) {
  const { data: session, status } = useSession();

  if (status === 'loading') {
    return (
      <div className="h-10 px-6 bg-matrix-dark border border-matrix-green-dark rounded-md animate-pulse" />
    );
  }

  if (status === 'authenticated' && session) {
    return <UserMenu />;
  }

  return (
    <button
      onClick={onSignInClick}
      className="px-6 py-2 bg-matrix-green text-matrix-black font-semibold rounded-md hover:bg-opacity-80 transition-colors"
    >
      Sign In
    </button>
  );
}
