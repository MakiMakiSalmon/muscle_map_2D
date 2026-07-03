'use client';

import { useFatigueWithDecay } from '@/hooks/useFatigueWithDecay';
import { useUIStore } from '@/stores/uiStore';
import MuscleDiagram from '@/components/body-diagram/MuscleDiagram';
import FatiguePanel from '@/components/fatigue-panel/FatiguePanel';

export default function DashboardPage() {
  const { selectedMuscle, setSelectedMuscle, bodyView, setBodyView } = useUIStore();
  const fatigueData = useFatigueWithDecay();

  return (
    <div className="flex min-h-full flex-col md:h-full md:flex-row md:overflow-hidden">
      {/* Left: Body Diagram */}
      <div className="flex flex-col items-center border-b border-gray-200 bg-white px-4 py-4 md:min-w-[200px] md:max-w-[280px] md:flex-shrink-0 md:overflow-y-auto md:border-b-0 md:border-r md:px-6">
        {/* Front / Back toggle */}
        <div className="mb-4 flex gap-1 self-stretch rounded-lg bg-gray-100 p-1">
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

        {fatigueData ? (
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
        <div className="mt-4 flex items-center justify-center gap-2 self-stretch overflow-x-auto pb-1 md:flex-wrap md:overflow-visible md:pb-0">
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
              <span className="whitespace-nowrap text-xs text-gray-500">{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Right: Fatigue Panel */}
      <div className="min-h-[360px] flex-1 overflow-hidden bg-white md:min-h-0">
        <FatiguePanel selectedMuscle={selectedMuscle} />
      </div>
    </div>
  );
}
