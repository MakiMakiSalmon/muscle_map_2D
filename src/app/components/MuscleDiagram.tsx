'use client';

import { BackBodyOutline, FrontBodyOutline } from '../svg/MuscleMapOutline';

interface MuscleDiagramProps {
  fatigueData: { [key: string]: number };
  onMuscleClick?: (muscle: string) => void;
}

interface MuscleArea {
  key: string;
  id: string;
  label: string;
  d: string;
  cx: number;
  cy: number;
}

export function MuscleDiagram({ fatigueData, onMuscleClick }: MuscleDiagramProps) {
  const getFatigueColor = (fatigue: number): string => {
    if (fatigue === 0) return '#ddd';
    if (fatigue < 30) return '#90ee90';
    if (fatigue < 60) return '#ffd700';
    if (fatigue < 80) return '#ff8c00';
    return '#ff4500';
  };

  const frontMuscleAreas: MuscleArea[] = [
    { key: 'head_front', id: 'head', label: '頭部', d: 'M200 32 C185 32 176 46 176 60 C176 75 185 88 200 88 C215 88 224 75 224 60 C224 46 215 32 200 32 Z', cx: 200, cy: 60 },
    { key: 'shoulders_left_front', id: 'shoulders', label: '肩', d: 'M158 108 C170 100 181 101 195 104 C192 112 189 118 184 124 C176 123 169 122 162 124 Z', cx: 176, cy: 113 },
    { key: 'shoulders_right_front', id: 'shoulders', label: '肩(右)', d: 'M205 104 C219 101 230 100 242 108 L238 124 C231 122 224 123 216 124 C211 118 208 112 205 104 Z', cx: 224, cy: 113 },
    { key: 'chest_front', id: 'chest', label: '胸部', d: 'M162 124 C175 120 186 120 200 122 C214 120 225 120 238 124 L240 154 C227 158 216 161 200 161 C184 161 173 158 160 154 Z', cx: 200, cy: 142 },
    { key: 'abs_front', id: 'abs', label: '腹部', d: 'M168 182 C179 192 188 198 200 200 C212 198 221 192 232 182 L226 213 C219 218 211 220 200 220 C189 220 181 218 174 213 Z', cx: 200, cy: 205 },
    { key: 'biceps_left_front', id: 'biceps', label: '上腕', d: 'M157 116 C145 122 136 136 134 149 C132 161 137 169 146 171 C152 165 155 157 158 146 C160 136 161 126 160 120 Z', cx: 146, cy: 143 },
    { key: 'biceps_right_front', id: 'biceps', label: '上腕(右)', d: 'M243 116 C255 122 264 136 266 149 C268 161 263 169 254 171 C248 165 245 157 242 146 C240 136 239 126 240 120 Z', cx: 254, cy: 143 },
    { key: 'forearms_left_front', id: 'forearms', label: '前腕', d: 'M146 171 C137 183 132 198 132 211 C132 223 138 230 147 232 C152 225 154 214 154 203 C154 191 151 181 148 173 Z', cx: 143, cy: 203 },
    { key: 'forearms_right_front', id: 'forearms_right', label: '前腕(右)', d: 'M254 171 C263 183 268 198 268 211 C268 223 262 230 253 232 C248 225 246 214 246 203 C246 191 249 181 252 173 Z', cx: 257, cy: 203 },
    { key: 'thighs_left_front', id: 'thighs', label: '大腿', d: 'M184 220 C171 250 169 274 170 291 C171 304 177 314 186 317 C192 309 194 299 195 287 C196 270 197 248 198 224 Z', cx: 184, cy: 270 },
    { key: 'calves_left_front', id: 'calves', label: '下腿', d: 'M186 315 C178 335 176 353 176 368 C176 380 180 388 187 390 C191 384 193 374 194 362 C195 349 196 335 196 318 Z', cx: 186, cy: 355 },
    { key: 'thighs_right_front', id: 'thighs_right', label: '大腿(右)', d: 'M216 220 C229 250 231 274 230 291 C229 304 223 314 214 317 C208 309 206 299 205 287 C204 270 203 248 202 224 Z', cx: 216, cy: 270 },
    { key: 'calves_right_front', id: 'calves_right', label: '下腿(右)', d: 'M214 315 C222 335 224 353 224 368 C224 380 220 388 213 390 C209 384 207 374 206 362 C205 349 204 335 204 318 Z', cx: 214, cy: 355 },
  ];

  const backMuscleAreas: MuscleArea[] = [
    { key: 'head_back', id: 'head', label: '頭部', d: 'M200 32 C185 32 176 46 176 60 C176 75 185 88 200 88 C215 88 224 75 224 60 C224 46 215 32 200 32 Z', cx: 200, cy: 60 },
    { key: 'shoulders_left_back', id: 'shoulders', label: '肩後', d: 'M158 108 C170 101 182 103 196 106 C193 112 189 118 184 123 C176 122 169 122 162 123 Z', cx: 176, cy: 114 },
    { key: 'shoulders_right_back', id: 'shoulders', label: '肩後(右)', d: 'M204 106 C218 103 230 101 242 108 L238 123 C231 122 224 122 216 123 C211 118 207 112 204 106 Z', cx: 224, cy: 114 },
    { key: 'back_back', id: 'back', label: '背中', d: 'M160 123 C173 125 184 127 200 127 C216 127 227 125 240 123 L240 185 C227 194 216 199 200 201 C184 199 173 194 160 185 Z', cx: 200, cy: 162 },
    { key: 'triceps_left_back', id: 'triceps', label: '上腕後', d: 'M157 116 C145 122 136 136 134 149 C132 161 137 169 146 171 C152 165 155 157 158 146 C160 136 161 126 160 120 Z', cx: 146, cy: 143 },
    { key: 'triceps_right_back', id: 'triceps', label: '上腕後(右)', d: 'M243 116 C255 122 264 136 266 149 C268 161 263 169 254 171 C248 165 245 157 242 146 C240 136 239 126 240 120 Z', cx: 254, cy: 143 },
    { key: 'forearms_left_back', id: 'forearms', label: '前腕後', d: 'M146 171 C137 183 132 198 132 211 C132 223 138 230 147 232 C152 225 154 214 154 203 C154 191 151 181 148 173 Z', cx: 143, cy: 203 },
    { key: 'forearms_right_back', id: 'forearms_right', label: '前腕後(右)', d: 'M254 171 C263 183 268 198 268 211 C268 223 262 230 253 232 C248 225 246 214 246 203 C246 191 249 181 252 173 Z', cx: 257, cy: 203 },
    { key: 'thighs_left_back', id: 'thighs', label: 'ハム(左)', d: 'M184 220 C171 250 169 274 170 291 C171 304 177 314 186 317 C192 309 194 299 195 287 C196 270 197 248 198 224 Z', cx: 184, cy: 270 },
    { key: 'thighs_right_back', id: 'thighs_right', label: 'ハム(右)', d: 'M216 220 C229 250 231 274 230 291 C229 304 223 314 214 317 C208 309 206 299 205 287 C204 270 203 248 202 224 Z', cx: 216, cy: 270 },
    { key: 'calves_left_back', id: 'calves', label: '下腿後(左)', d: 'M186 315 C178 335 176 353 176 368 C176 380 180 388 187 390 C191 384 193 374 194 362 C195 349 196 335 196 318 Z', cx: 186, cy: 355 },
    { key: 'calves_right_back', id: 'calves_right', label: '下腿後(右)', d: 'M214 315 C222 335 224 353 224 368 C224 380 220 388 213 390 C209 384 207 374 206 362 C205 349 204 335 204 318 Z', cx: 214, cy: 355 },
  ];

  const renderMuscleLayer = (muscleAreas: MuscleArea[]) =>
    muscleAreas.map((muscle) => (
      <g key={muscle.key}>
        <path
          d={muscle.d}
          fill={getFatigueColor(fatigueData[muscle.id] || 0)}
          stroke="#333"
          strokeWidth="1"
          onClick={() => onMuscleClick?.(muscle.id)}
          style={{ cursor: 'pointer', opacity: 0.8 }}
        />
        <text
          x={muscle.cx}
          y={muscle.cy}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize="10"
          fontWeight="bold"
          fill="#111"
          pointerEvents="none"
        >
          {muscle.label}
        </text>
      </g>
    ));

  return (
    <div className="flex flex-col items-center">
      <h2 className="text-2xl font-bold mb-6">体図面（前面 / 背面）</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
        <div className="flex flex-col items-center">
          <p className="text-sm font-semibold text-gray-700 mb-2">前面</p>
          <svg width="360" height="420" viewBox="20 0 360 420" className="border border-gray-300 rounded bg-white">
            <FrontBodyOutline />
            {renderMuscleLayer(frontMuscleAreas)}
          </svg>
        </div>
        <div className="flex flex-col items-center">
          <p className="text-sm font-semibold text-gray-700 mb-2">背面</p>
          <svg width="360" height="420" viewBox="20 0 360 420" className="border border-gray-300 rounded bg-white">
            <BackBodyOutline />
            {renderMuscleLayer(backMuscleAreas)}
          </svg>
        </div>
      </div>
      
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
