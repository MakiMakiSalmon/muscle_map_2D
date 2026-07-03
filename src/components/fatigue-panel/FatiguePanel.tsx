'use client';

import { useFatigueWithDecay } from '@/hooks/useFatigueWithDecay';
import { useFatigueHistory } from '@/hooks/useFatigue';
import { useUIStore } from '@/stores/uiStore';
import { MUSCLE_LABELS } from '@/types/domain';
import type { MuscleId } from '@/types/domain';
import FatigueInputTab from './FatigueInputTab';
import FatigueHistoryChart from './FatigueHistoryChart';
import WorkoutTab from './WorkoutTab';

interface FatiguePanelProps {
  selectedMuscle: MuscleId | null;
}

const TABS = [
  { id: 'input', label: '疲労入力' },
  { id: 'history', label: '履歴' },
  { id: 'workout', label: 'トレーニング' },
] as const;

function HistoryTabContent({ muscleId }: { muscleId: MuscleId }) {
  const { data: history = [], isLoading } = useFatigueHistory(muscleId, 20);

  if (isLoading) return <div className="text-sm text-gray-400">読み込み中...</div>;

  return (
    <div className="space-y-3">
      <div className="text-sm font-medium text-gray-600">
        {MUSCLE_LABELS[muscleId]} の疲労履歴
      </div>
      <FatigueHistoryChart history={history} muscleId={muscleId} />
    </div>
  );
}

export default function FatiguePanel({ selectedMuscle }: FatiguePanelProps) {
  const { activePanelTab, setActivePanelTab } = useUIStore();
  const { data: fatigueData } = useFatigueWithDecay();

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Tab bar */}
      <div className="flex flex-shrink-0 border-b border-gray-200">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActivePanelTab(tab.id)}
            className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
              activePanelTab === tab.id
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        {activePanelTab === 'input' && (
          <>
            {selectedMuscle && fatigueData?.[selectedMuscle] ? (
              <FatigueInputTab
                muscleId={selectedMuscle}
                entry={fatigueData[selectedMuscle]}
              />
            ) : (
              <div className="text-sm text-gray-400 text-center mt-8">
                体図の筋肉をクリックして選択してください
              </div>
            )}
          </>
        )}

        {activePanelTab === 'history' && (
          <>
            {selectedMuscle ? (
              <HistoryTabContent muscleId={selectedMuscle} />
            ) : (
              <div className="text-sm text-gray-400 text-center mt-8">
                体図の筋肉をクリックして選択してください
              </div>
            )}
          </>
        )}

        {activePanelTab === 'workout' && <WorkoutTab />}
      </div>
    </div>
  );
}
