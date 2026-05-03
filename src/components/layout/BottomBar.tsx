'use client';

import { useFatigueWithDecay } from '@/hooks/useFatigueWithDecay';
import { useUIStore } from '@/stores/uiStore';
import { MUSCLE_GROUPS, MUSCLE_GROUP_LABELS, expandMuscleGroup } from '@/types/domain';
import { getFatigueColor } from '@/lib/fatigue/colorMap';
import type { MuscleGroup } from '@/types/domain';

export default function BottomBar() {
  const fatigueData = useFatigueWithDecay();
  const { openResetModal, setSelectedMuscle, setActivePanelTab } = useUIStore();

  const getGroupValue = (group: MuscleGroup): number => {
    if (!fatigueData) return 0;
    const ids = expandMuscleGroup(group);
    return Math.max(...ids.map((id) => fatigueData[id]?.currentValue ?? 0));
  };

  const handleBadgeClick = (group: MuscleGroup) => {
    const ids = expandMuscleGroup(group);
    setSelectedMuscle(ids[0]);
    setActivePanelTab('input');
  };

  return (
    <footer className="bg-white border-t border-gray-200 px-4 py-2">
      <div className="flex items-center gap-2 flex-wrap">
        {MUSCLE_GROUPS.map((group) => {
          const value = getGroupValue(group);
          const color = getFatigueColor(value);
          return (
            <button
              key={group}
              onClick={() => handleBadgeClick(group)}
              className="flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-gray-100 hover:bg-gray-200 transition-colors"
              title={MUSCLE_GROUP_LABELS[group]}
            >
              <span
                className="inline-block w-3 h-3 rounded-full border border-gray-300 flex-shrink-0"
                style={{ backgroundColor: color }}
              />
              <span className="text-gray-700">{MUSCLE_GROUP_LABELS[group]}</span>
              <span className="text-gray-500">{value}%</span>
            </button>
          );
        })}

        <div className="ml-auto">
          <button
            onClick={openResetModal}
            className="text-xs text-red-600 hover:text-red-800 font-medium transition-colors px-2 py-1 rounded hover:bg-red-50"
          >
            すべてリセット
          </button>
        </div>
      </div>
    </footer>
  );
}
