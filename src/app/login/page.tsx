'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

export default function LoginPage() {
  const router = useRouter();
  const { email, setEmail, password, setPassword, login, register, user } = useAuth();
  const [isRegistering, setIsRegistering] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // ログイン済み時はダッシュボードへリダイレクト
  if (user) {
    router.push('/');
    return null;
  }

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isRegistering) {
        await register();
      } else {
        await login();
      }
      router.push('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center px-4">
      <div className="bg-white rounded-lg shadow-lg p-8 w-full max-w-md">
        <h1 className="text-3xl font-bold text-center text-gray-900 mb-2">
          🦵 筋肉疲労マップ
        </h1>
        <p className="text-center text-gray-600 mb-8">
          {isRegistering ? '新規登録' : 'ログイン'}
        </p>

        <form onSubmit={handleAuthSubmit} className="space-y-4">
          {/* メールアドレス入力 */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              メールアドレス
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              placeholder="your-email@example.com"
            />
          </div>

          {/* パスワード入力 */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              パスワード
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              placeholder="パスワードを入力"
            />
          </div>

          {/* エラーメッセージ */}
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          {/* 送信ボタン */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-bold py-2 px-4 rounded-lg transition"
          >
            {loading
              ? '処理中...'
              : isRegistering
              ? '登録'
              : 'ログイン'}
          </button>
        </form>

        {/* モード切り替え */}
        <div className="mt-6 text-center">
          <p className="text-gray-600 text-sm mb-3">
            {isRegistering
              ? 'すでにアカウントを持っていますか？'
              : 'アカウントを持っていませんか？'}
          </p>
          <button
            onClick={() => {
              setIsRegistering(!isRegistering);
              setError('');
            }}
            className="text-blue-600 hover:text-blue-700 font-semibold"
          >
            {isRegistering ? 'ログイン' : '新規登録'}
          </button>
        </div>
      </div>
    </div>
  );
}
