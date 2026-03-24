'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { MuscleDiagram } from './components/MuscleDiagram';
import { FatigueForm } from './components/FatigueForm';
import { ServiceErrorScreen } from './components/ServiceErrorScreen';

export default function Home() {
  const router = useRouter();
  const { user, loading, logout } = useAuth();
  const [fatigueData, setFatigueData] = useState<{ [key: string]: number }>({});
  const [selectedMuscle, setSelectedMuscle] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [serviceError, setServiceError] = useState<{ code: string; message: string; isRateLimited: boolean } | null>(null);

  // 未ログイン時はログインページへリダイレクト
  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  const getAuthHeaders = useCallback(async (includeJson = false): Promise<HeadersInit> => {
    if (!user) {
      throw new Error('UNAUTHORIZED');
    }

    const token = await user.getIdToken();
    return {
      ...(includeJson ? { 'Content-Type': 'application/json' } : {}),
      Authorization: `Bearer ${token}`,
    };
  }, [user]);

  const fetchFatigueData = useCallback(async () => {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch('/api/fatigue', { headers });

      if (response.status === 401) {
        await logout();
        router.push('/login');
        return;
      }
      
      if (response.status === 503) {
        const errorData = await response.json();
        setServiceError({
          code: errorData.code || 'SERVICE_ERROR',
          message: errorData.error || 'Service temporarily unavailable',
          isRateLimited: errorData.isRateLimited || false,
        });
        return;
      }
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data = await response.json();
      setFatigueData(data);
      setServiceError(null);
    } catch (error) {
      console.error('Error fetching fatigue data:', error);
    }
  }, [getAuthHeaders, logout, router]);

  // 初期データ取得
  useEffect(() => {
    if (user) {
      void fetchFatigueData();
    }
  }, [user, fetchFatigueData]);

  const handleMuscleClick = (muscle: string) => {
    setSelectedMuscle(muscle);
  };

  const handleSaveFatigue = async (muscle: string, fatigue: number): Promise<boolean> => {
    setIsLoading(true);
    try {
      const headers = await getAuthHeaders(true);
      const response = await fetch('/api/fatigue', {
        method: 'POST',
        headers,
        body: JSON.stringify({ muscle, tire: fatigue }),
      });

      if (response.status === 401) {
        await logout();
        router.push('/login');
        return false;
      }
      
      if (response.status === 503) {
        const errorData = await response.json();
        setServiceError({
          code: errorData.code || 'SERVICE_ERROR',
          message: errorData.error || 'Service temporarily unavailable',
          isRateLimited: errorData.isRateLimited || false,
        });
        return false;
      }
      
      if (response.ok) {
        const updatedData = await response.json();
        setFatigueData(updatedData.data);
        setServiceError(null);
        return true;
      }

      const errorData = await response.json().catch(() => ({}));
      setServiceError({
        code: errorData.code || `HTTP_${response.status}`,
        message: errorData.error || '保存に失敗しました。Firebase Adminの設定を確認してください。',
        isRateLimited: false,
      });
      return false;
    } catch (error) {
      console.error('Error saving fatigue:', error);
      setServiceError({
        code: 'SAVE_FAILED',
        message: '保存処理に失敗しました。ネットワークまたはFirebase設定を確認してください。',
        isRateLimited: false,
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = async () => {
    if (!confirm('すべての疲労度をリセットしますか？')) return;
    
    try {
      const headers = await getAuthHeaders();
      const response = await fetch('/api/fatigue', { method: 'PUT', headers });

      if (response.status === 401) {
        await logout();
        router.push('/login');
        return;
      }
      
      if (response.status === 503) {
        const errorData = await response.json();
        setServiceError({
          code: errorData.code || 'SERVICE_ERROR',
          message: errorData.error || 'Service temporarily unavailable',
          isRateLimited: errorData.isRateLimited || false,
        });
        return;
      }
      
      if (response.ok) {
        const data = await response.json();
        setFatigueData(data.data);
        setSelectedMuscle(null);
        setServiceError(null);
      }
    } catch (error) {
      console.error('Error resetting data:', error);
    }
  };

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  // ロード中は何も表示しない
  if (loading) {
    return <div>ロード中...</div>;
  }

  // ログインしていないなら何も表示しない（useEffect でリダイレクト中）
  if (!user) {
    return null;
  }

  // サービスエラー時に error screen を表示
  if (serviceError) {
    return (
      <ServiceErrorScreen 
        isRateLimited={serviceError.isRateLimited}
        onDismiss={() => setServiceError(null)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* ヘッダー */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-6 flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold text-gray-900">🦵 筋肉疲労マップ 2D</h1>
            <p className="text-gray-600 mt-2 text-sm">ユーザー: {user.email}</p>
          </div>
          <button
            onClick={handleLogout}
            className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded transition"
          >
            ログアウト
          </button>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* 左側: 体図面 */}
          <div className="bg-white p-8 rounded-lg shadow">
            <MuscleDiagram 
              fatigueData={fatigueData}
              onMuscleClick={handleMuscleClick}
            />
          </div>

          {/* 右側: 疲労度入力フォーム */}
          <div>
            <FatigueForm
              selectedMuscle={selectedMuscle}
              onSubmit={handleSaveFatigue}
              isLoading={isLoading}
            />

            {/* リセットボタン */}
            <button
              onClick={handleReset}
              className="w-full mt-6 bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded transition"
            >
              すべてリセット
            </button>

            {/* データ表示 */}
            <div className="mt-8 bg-white p-6 rounded-lg shadow">
              <h3 className="text-xl font-bold mb-4">データ保存状態</h3>
              <pre className="bg-gray-50 p-4 rounded text-sm overflow-auto max-h-64">
                {JSON.stringify(fatigueData, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      </main>

      {/* フッター */}
      <footer className="bg-white border-t border-gray-200 mt-16">
        <div className="max-w-7xl mx-auto px-4 py-6 text-center text-gray-600">
          <p>MVP - 手動入力による筋肉疲労度管理アプリケーション</p>
        </div>
      </footer>
    </div>
  );
}
