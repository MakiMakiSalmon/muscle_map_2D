'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState, type ReactNode } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { clientAuth } from '@/lib/firebase/client';
import Header from '@/components/layout/Header';
import BottomBar from '@/components/layout/BottomBar';
import WorkoutInputModal from '@/components/workout/WorkoutInputModal';
import ResetConfirmModal from '@/components/workout/ResetConfirmModal';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(clientAuth, (user) => {
      if (!user) {
        router.replace('/login');
      } else {
        setAuthChecked(true);
      }
    });
    return unsubscribe;
  }, [router]);

  if (!authChecked) {
    return (
      <div className="flex min-h-screen items-center justify-center text-gray-400">
        読み込み中...
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <Header />
      <main className="min-h-0 flex-1 overflow-y-auto md:overflow-hidden">{children}</main>
      <BottomBar />
      <WorkoutInputModal />
      <ResetConfirmModal />
    </div>
  );
}
