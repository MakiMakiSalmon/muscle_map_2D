'use client';

import { MuscleMapOutline } from '../svg/MuscleMapOutline';

interface MuscleDiagramProps {
  fatigueData: { [key: string]: number };
  onMuscleClick?: (muscle: string) => void;
}

export function MuscleDiagram({ fatigueData, onMuscleClick }: MuscleDiagramProps) {
  const getFatigueColor = (fatigue: number): string => {
    if (fatigue === 0) return '#ddd';
    if (fatigue < 30) return '#90ee90';
    if (fatigue < 60) return '#ffd700';
    if (fatigue < 80) return '#ff8c00';
    return '#ff4500';
  };

  const muscles = [
    { id: 'head', label: '頭部', x: 170, y: 45, width: 40, height: 30 },
    { id: 'shoulders', label: '肩', x: 145, y: 75, width: 90, height: 25 },
    { id: 'chest', label: '胸部', x: 145, y: 100, width: 90, height: 35 },
    { id: 'back', label: '背中', x: 145, y: 140, width: 90, height: 35 },
    { id: 'abs', label: '腹部', x: 150, y: 175, width: 80, height: 30 },
    { id: 'biceps', label: '上腕', x: 115, y: 110, width: 25, height: 40 },
    { id: 'triceps', label: '上腕後', x: 260, y: 110, width: 25, height: 40 },
    { id: 'forearms', label: '前腕', x: 100, y: 150, width: 25, height: 40 },
    { id: 'forearms_right', label: '前腕(右)', x: 275, y: 150, width: 25, height: 40 },
    { id: 'thighs', label: '大腿', x: 160, y: 210, width: 25, height: 60 },
    { id: 'calves', label: '下腿', x: 160, y: 280, width: 25, height: 60 },
    { id: 'thighs_right', label: '大腿(右)', x: 210, y: 210, width: 25, height: 60 },
    { id: 'calves_right', label: '下腿(右)', x: 210, y: 280, width: 25, height: 60 },
  ];

  return (
    <div className="flex flex-col items-center">
      <h2 className="text-2xl font-bold mb-6">体図面</h2>
      <svg width="400" height="420" className="border border-gray-300 rounded bg-white">
        {/* 体の輪郭 */}
        <MuscleMapOutline />

        {/* 筋肉グループ */}
        {muscles.map((muscle) => (
          <g key={muscle.id}>
            <rect
              x={muscle.x}
              y={muscle.y}
              width={muscle.width}
              height={muscle.height}
              fill={getFatigueColor(fatigueData[muscle.id] || 0)}
              stroke="#333"
              strokeWidth="2"
              rx="4"
              onClick={() => onMuscleClick?.(muscle.id)}
              style={{ cursor: 'pointer', opacity: 0.8 }}
            />
            <text
              x={muscle.x + muscle.width / 2}
              y={muscle.y + muscle.height / 2}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize="10"
              fontWeight="bold"
              fill="#000"
              onClick={() => onMuscleClick?.(muscle.id)}
              style={{ cursor: 'pointer' }}
            >
              {muscle.label}
            </text>
          </g>
        ))}
      </svg>
      
      {/* 凡例 */}
      <div className="mt-6 grid grid-cols-2 gap-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded" style={{ backgroundColor: '#ddd' }}></div>
          <span>未入力 (0%)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded" style={{ backgroundColor: '#90ee90' }}></div>
          <span>低 (1-29%)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded" style={{ backgroundColor: '#ffd700' }}></div>
          <span>中 (30-59%)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded" style={{ backgroundColor: '#ff8c00' }}></div>
          <span>高 (60-79%)</span>
        </div>
        <div className="flex items-center gap-2" style={{ gridColumn: 'span 2' }}>
          <div className="w-6 h-6 rounded" style={{ backgroundColor: '#ff4500' }}></div>
          <span>最高 (80-100%)</span>
        </div>
      </div>
    </div>
  );
}
