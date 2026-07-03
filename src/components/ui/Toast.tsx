'use client';

import { useUIStore } from '@/stores/uiStore';

export default function Toast() {
  const { toasts, dismissToast } = useUIStore();

  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed right-4 top-4 z-50 flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-2"
      aria-live="polite"
      aria-atomic="true"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          role={toast.type === 'error' ? 'alert' : 'status'}
          className={`flex items-start gap-3 rounded-lg border px-4 py-3 text-sm shadow-lg ${
            toast.type === 'error'
              ? 'border-red-200 bg-red-50 text-red-900'
              : 'border-green-200 bg-green-50 text-green-900'
          }`}
        >
          <div className="min-w-0 flex-1 break-words">{toast.message}</div>
          <button
            type="button"
            onClick={() => dismissToast(toast.id)}
            className="shrink-0 rounded px-1 text-lg leading-none text-gray-500 hover:bg-white/70 hover:text-gray-700"
            aria-label="通知を閉じる"
          >
            x
          </button>
        </div>
      ))}
    </div>
  );
}
