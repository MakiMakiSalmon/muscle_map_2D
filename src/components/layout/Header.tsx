'use client';

import { signOut } from 'firebase/auth';
import { clientAuth } from '@/lib/firebase/client';

export default function Header() {
  const user = clientAuth.currentUser;

  const handleSignOut = async () => {
    await signOut(clientAuth);
  };

  return (
    <header className="flex items-center justify-between px-6 py-3 bg-white border-b border-gray-200 shadow-sm">
      <h1 className="text-lg font-bold text-gray-900">筋肉疲労マップ 2D</h1>

      <div className="flex items-center gap-3">
        {user?.photoURL && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={user.photoURL}
            alt={user.displayName ?? 'ユーザー'}
            className="w-8 h-8 rounded-full"
          />
        )}
        <span className="text-sm text-gray-600 hidden sm:inline">
          {user?.displayName ?? user?.email}
        </span>
        <button
          onClick={handleSignOut}
          className="text-sm text-gray-500 hover:text-gray-800 transition-colors"
        >
          ログアウト
        </button>
      </div>
    </header>
  );
}
