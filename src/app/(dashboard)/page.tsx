'use client';

import { useFatigueWithDecay } from '@/hooks/useFatigueWithDecay';
import { useUIStore } from '@/stores/uiStore';
import MuscleDiagram from '@/components/body-diagram/MuscleDiagram';
import FatiguePanel from '@/components/fatigue-panel/FatiguePanel';
import Button from '@/components/ui/Button';
import Toast from '@/components/ui/Toast';
import { useRouter } from 'next/navigation';

export default function DashboardPage() {
  const router = useRouter();
  const { selectedMuscle, setSelectedMuscle, bodyView, setBodyView } = useUIStore();
  const { data: fatigueData, isError, isUnauthorized, refetch } = useFatigueWithDecay();

  const handleRetry = () => {
    if (isUnauthorized) {
      router.replace('/login');
      return;
    }
    refetch();
  };

  return (
    <div className="flex h-full overflow-hidden">
      {/* Left: Body Diagram */}
      <div className="flex flex-col items-center py-4 px-6 border-r border-gray-200 bg-white min-w-[200px] max-w-[280px] flex-shrink-0 overflow-y-auto">
        {/* Front / Back toggle */}
        <div className="flex gap-1 mb-4 p-1 bg-gray-100 rounded-lg self-stretch">
          {(['front', 'back'] as const).map((v) => (
            <button
              key={v}
              onClick={() => setBodyView(v)}
              className={`flex-1 py-1 text-sm rounded-md transition-colors ${
                bodyView === v
                  ? 'bg-white text-blue-600 font-semibold shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {v === 'front' ? '前面' : '背面'}
            </button>
          ))}
        </div>

        {isError ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
            <p className="text-sm text-gray-600">
              疲労データを取得できませんでした。
            </p>
            <Button size="sm" onClick={handleRetry}>
              {isUnauthorized ? 'ログインへ移動' : '再試行'}
            </Button>
          </div>
        ) : fatigueData ? (
          <MuscleDiagram
            fatigueData={fatigueData}
            selectedMuscle={selectedMuscle}
            onMuscleClick={setSelectedMuscle}
            view={bodyView}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center text-sm text-gray-400">
            読み込み中...
          </div>
        )}

        {/* Color legend */}
        <div className="flex items-center gap-2 mt-4 flex-wrap justify-center">
          {[
            { color: '#dddddd', label: '0%' },
            { color: '#90ee90', label: '低' },
            { color: '#ffd700', label: '中' },
            { color: '#ff8c00', label: '高' },
            { color: '#ff4500', label: '最高' },
          ].map(({ color, label }) => (
            <div key={label} className="flex items-center gap-1">
              <span
                className="inline-block w-3 h-3 rounded-sm border border-gray-300"
                style={{ backgroundColor: color }}
              />
              <span className="text-xs text-gray-500">{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Right: Fatigue Panel */}
      <div className="flex-1 overflow-hidden">
        <FatiguePanel selectedMuscle={selectedMuscle} />
      </div>
      <Toast />
    </div>
  );
}
