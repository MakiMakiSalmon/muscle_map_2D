'use client';

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
    { id: 'shoulders', label: '肩', x: 150, y: 60, width: 80, height: 30 },
    { id: 'chest', label: '胸部', x: 100, y: 100, width: 60, height: 40 },
    { id: 'back', label: '背中', x: 220, y: 100, width: 60, height: 40 },
    { id: 'abs', label: '腹部', x: 105, y: 150, width: 50, height: 35 },
    { id: 'arms', label: '腕', x: 70, y: 110, width: 25, height: 50 },
    { id: 'forearms', label: '前腕', x: 70, y: 165, width: 25, height: 40 },
    { id: 'legs', label: '脚', x: 140, y: 190, width: 40, height: 60 },
  ];

  return (
    <div className="flex flex-col items-center">
      <h2 className="text-2xl font-bold mb-6">体図面</h2>
      <svg width="400" height="350" className="border border-gray-300 rounded">
        {/* 体の輪郭 */}
        <circle cx="190" cy="60" r="20" fill={getFatigueColor(fatigueData.head || 0)} />
        
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
