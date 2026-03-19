'use client';

import { useState } from 'react';

interface FatigueFormProps {
  selectedMuscle: string | null;
  onSubmit: (muscle: string, fatigue: number) => Promise<void>;
  isLoading?: boolean;
}

export function FatigueForm({ selectedMuscle, onSubmit, isLoading = false }: FatigueFormProps) {
  const [fatigue, setFatigue] = useState(50);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMuscle) return;
    
    try {
      await onSubmit(selectedMuscle, fatigue);
      setSubmitted(true);
      setTimeout(() => setSubmitted(false), 2000);
    } catch (error) {
      console.error('Error saving fatigue data:', error);
    }
  };

  const muscleLabels: { [key: string]: string } = {
    chest: '胸部',
    back: '背中',
    shoulders: '肩',
    arms: '腕',
    forearms: '前腕',
    abs: '腹部',
    legs: '脚',
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h2 className="text-2xl font-bold mb-6">疲労度入力</h2>
      
      {!selectedMuscle ? (
        <p className="text-gray-500 text-center">体図面から部位をクリックして選択しください</p>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-lg font-semibold mb-2">
              選択部位: <span className="text-blue-600">{muscleLabels[selectedMuscle] || selectedMuscle}</span>
            </label>
          </div>

          <div>
            <label className="block font-semibold mb-2">
              疲労度: <span className="text-2xl font-bold text-red-600">{fatigue}%</span>
            </label>
            <input
              type="range"
              min="0"
              max="100"
              value={fatigue}
              onChange={(e) => setFatigue(parseInt(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            />
            <div className="flex justify-between text-sm text-gray-600 mt-2">
              <span>0%</span>
              <span>50%</span>
              <span>100%</span>
            </div>
          </div>

          <div className="pt-4 flex gap-2">
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-bold py-2 px-4 rounded transition"
            >
              {isLoading ? '保存中...' : '保存'}
            </button>
            
            {submitted && (
              <div className="flex-1 bg-green-100 border border-green-400 text-green-800 px-4 py-2 rounded text-center font-semibold">
                保存しました！
              </div>
            )}
          </div>

          <div className="mt-6 p-4 bg-gray-50 rounded text-sm">
            <p className="font-semibold mb-2">疲労度レベル</p>
            <ul className="space-y-1 text-gray-700">
              <li>• 0-29%: 低疲労（新緑色）</li>
              <li>• 30-59%: 中疲労（黄色）</li>
              <li>• 60-79%: 高疲労（オレンジ）</li>
              <li>• 80-100%: 最高疲労（赤色）</li>
            </ul>
          </div>
        </form>
      )}
    </div>
  );
}
