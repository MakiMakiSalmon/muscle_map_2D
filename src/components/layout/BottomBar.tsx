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
    <footer className="border-t border-gray-200 bg-white px-3 py-2 md:px-4">
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {MUSCLE_GROUPS.map((group) => {
          const value = getGroupValue(group);
          const color = getFatigueColor(value);
          return (
            <button
              key={group}
              onClick={() => handleBadgeClick(group)}
              className="flex flex-shrink-0 items-center gap-1 rounded-full bg-gray-100 px-2 py-1 text-xs font-medium transition-colors hover:bg-gray-200"
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

        <div className="ml-auto flex-shrink-0">
          <button
            onClick={openResetModal}
            className="whitespace-nowrap rounded px-2 py-1 text-xs font-medium text-red-600 transition-colors hover:bg-red-50 hover:text-red-800"
          >
            すべてリセット
          </button>
        </div>
      </div>
    </footer>
  );
}
