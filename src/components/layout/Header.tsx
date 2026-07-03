'use client';

import { useState, useEffect } from 'react';
import { signOut, onAuthStateChanged, type User } from 'firebase/auth';
import { clientAuth } from '@/lib/firebase/client';

export default function Header() {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    return onAuthStateChanged(clientAuth, setUser);
  }, []);

  const handleSignOut = async () => {
    await signOut(clientAuth);
  };

  return (
    <header className="flex items-center justify-between gap-3 border-b border-gray-200 bg-white px-4 py-3 shadow-sm md:px-6">
      <h1 className="truncate text-base font-bold text-gray-900 md:text-lg">筋肉疲労マップ 2D</h1>

      <div className="flex flex-shrink-0 items-center gap-2 md:gap-3">
        {user?.photoURL && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={user.photoURL}
            alt={user.displayName ?? 'ユーザー'}
            className="h-8 w-8 rounded-full"
          />
        )}
        <span className="hidden text-sm text-gray-600 sm:inline">
          {user?.displayName ?? user?.email}
        </span>
        <button
          onClick={handleSignOut}
          className="whitespace-nowrap text-sm text-gray-500 transition-colors hover:text-gray-800"
        >
          ログアウト
        </button>
      </div>
    </header>
  );
}
