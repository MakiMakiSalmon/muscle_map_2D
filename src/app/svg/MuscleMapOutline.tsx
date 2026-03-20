'use client';

export function MuscleMapOutline() {
  return (
    <g>
      {/* 頭部 */}
      <circle cx="190" cy="60" r="20" fill="#f0f0f0" stroke="#333" strokeWidth="2" />
      {/* 首 */}
      <rect x="182" y="80" width="16" height="15" fill="#f0f0f0" stroke="#333" strokeWidth="2" />
      {/* 胴体 */}
      <path
        d="M170 95 L210 95 L225 170 L215 210 L176 210 L165 170 Z"
        fill="#f8f8f8"
        stroke="#333"
        strokeWidth="2"
      />
      {/* 右上腕 */}
      <path d="M210 100 L245 125 L235 140 L210 120 Z" fill="#f8f8f8" stroke="#333" strokeWidth="2" />
      {/* 右前腕 */}
      <path d="M235 140 L260 170 L248 180 L230 150 Z" fill="#f8f8f8" stroke="#333" strokeWidth="2" />
      {/* 左上腕 */}
      <path d="M170 100 L135 125 L145 140 L170 120 Z" fill="#f8f8f8" stroke="#333" strokeWidth="2" />
      {/* 左前腕 */}
      <path d="M145 140 L120 170 L132 180 L150 150 Z" fill="#f8f8f8" stroke="#333" strokeWidth="2" />
      {/* 右腿 */}
      <path d="M190 210 L205 230 L220 300 L200 300 Z" fill="#f8f8f8" stroke="#333" strokeWidth="2" />
      {/* 右下腿 */}
      <path d="M200 300 L210 300 L220 360 L205 360 Z" fill="#f8f8f8" stroke="#333" strokeWidth="2" />
      {/* 左腿 */}
      <path d="M180 210 L165 230 L150 300 L170 300 Z" fill="#f8f8f8" stroke="#333" strokeWidth="2" />
      {/* 左下腿 */}
      <path d="M170 300 L160 300 L150 360 L165 360 Z" fill="#f8f8f8" stroke="#333" strokeWidth="2" />
    </g>
  );
}
