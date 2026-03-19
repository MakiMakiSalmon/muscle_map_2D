'use client';

import { useState, useEffect } from 'react';
import { MuscleDiagram } from './components/MuscleDiagram';
import { FatigueForm } from './components/FatigueForm';

export default function Home() {
  const [fatigueData, setFatigueData] = useState<{ [key: string]: number }>({});
  const [selectedMuscle, setSelectedMuscle] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // 初期データ取得
  useEffect(() => {
    fetchFatigueData();
  }, []);

  const fetchFatigueData = async () => {
    try {
      const response = await fetch('/api/fatigue');
      const data = await response.json();
      setFatigueData(data);
    } catch (error) {
      console.error('Error fetching fatigue data:', error);
    }
  };

  const handleMuscleClick = (muscle: string) => {
    setSelectedMuscle(muscle);
  };

  const handleSaveFatigue = async (muscle: string, fatigue: number) => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/fatigue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ muscle, tire: fatigue }),
      });
      
      if (response.ok) {
        const updatedData = await response.json();
        setFatigueData(updatedData.data);
      }
    } catch (error) {
      console.error('Error saving fatigue:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = async () => {
    if (!confirm('すべての疲労度をリセットしますか？')) return;
    
    try {
      const response = await fetch('/api/fatigue', { method: 'PUT' });
      if (response.ok) {
        const data = await response.json();
        setFatigueData(data.data);
        setSelectedMuscle(null);
      }
    } catch (error) {
      console.error('Error resetting data:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* ヘッダー */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <h1 className="text-4xl font-bold text-gray-900">🦵 筋肉疲労マップ 2D</h1>
          <p className="text-gray-600 mt-2">各部位の疲労度を手動で入力して管理します</p>
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
