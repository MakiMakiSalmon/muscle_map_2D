'use client';

export function FrontBodyOutline() {
  return (
    <g>
      {/* 頭部（前面） */}
      <ellipse cx="200" cy="60" rx="24" ry="28" fill="#f0f0f0" stroke="#333" strokeWidth="2" />
      {/* 首 */}
      <path d="M190 86 Q200 92 210 86 L210 102 Q200 108 190 102 Z" fill="#f0f0f0" stroke="#333" strokeWidth="2" />
      {/* 胴体（前面） */}
      <path
        d="M155 108 Q170 98 183 104 Q200 110 217 104 Q230 98 245 108 L252 158 Q255 178 243 195 Q228 214 200 220 Q172 214 157 195 Q145 178 148 158 Z"
        fill="#f8f8f8"
        stroke="#333"
        strokeWidth="2"
      />
      {/* 左上腕 */}
      <path d="M155 114 Q136 122 128 144 Q125 161 133 172 Q142 166 147 156 Q153 142 159 125 Z" fill="#f8f8f8" stroke="#333" strokeWidth="2" />
      {/* 右上腕 */}
      <path d="M245 114 Q264 122 272 144 Q275 161 267 172 Q258 166 253 156 Q247 142 241 125 Z" fill="#f8f8f8" stroke="#333" strokeWidth="2" />
      {/* 左前腕 */}
      <path d="M133 172 Q122 190 122 210 Q123 224 132 230 Q141 221 144 206 Q146 189 147 176 Z" fill="#f8f8f8" stroke="#333" strokeWidth="2" />
      {/* 右前腕 */}
      <path d="M267 172 Q278 190 278 210 Q277 224 268 230 Q259 221 256 206 Q254 189 253 176 Z" fill="#f8f8f8" stroke="#333" strokeWidth="2" />
      {/* 左大腿 */}
      <path d="M182 220 Q167 252 166 286 Q167 306 178 316 Q190 305 192 286 Q194 253 196 224 Z" fill="#f8f8f8" stroke="#333" strokeWidth="2" />
      {/* 右大腿 */}
      <path d="M218 220 Q233 252 234 286 Q233 306 222 316 Q210 305 208 286 Q206 253 204 224 Z" fill="#f8f8f8" stroke="#333" strokeWidth="2" />
      {/* 左下腿 */}
      <path d="M178 316 Q168 338 166 366 Q166 382 175 390 Q184 384 187 370 Q190 346 192 320 Z" fill="#f8f8f8" stroke="#333" strokeWidth="2" />
      {/* 右下腿 */}
      <path d="M222 316 Q232 338 234 366 Q234 382 225 390 Q216 384 213 370 Q210 346 208 320 Z" fill="#f8f8f8" stroke="#333" strokeWidth="2" />
    </g>
  );
}

export function BackBodyOutline() {
  return (
    <g>
      {/* 頭部（背面） */}
      <ellipse cx="200" cy="60" rx="24" ry="28" fill="#f0f0f0" stroke="#333" strokeWidth="2" />
      {/* 首 */}
      <path d="M190 86 Q200 90 210 86 L210 102 Q200 106 190 102 Z" fill="#f0f0f0" stroke="#333" strokeWidth="2" />
      {/* 背面胴体 */}
      <path
        d="M155 108 Q172 100 184 105 Q200 112 216 105 Q228 100 245 108 L250 156 Q254 178 244 197 Q230 217 200 222 Q170 217 156 197 Q146 178 150 156 Z"
        fill="#f8f8f8"
        stroke="#333"
        strokeWidth="2"
      />
      {/* 左上腕（背面） */}
      <path d="M155 114 Q138 123 129 143 Q125 161 131 173 Q141 168 147 157 Q154 144 159 126 Z" fill="#f8f8f8" stroke="#333" strokeWidth="2" />
      {/* 右上腕（背面） */}
      <path d="M245 114 Q262 123 271 143 Q275 161 269 173 Q259 168 253 157 Q246 144 241 126 Z" fill="#f8f8f8" stroke="#333" strokeWidth="2" />
      {/* 左前腕（背面） */}
      <path d="M131 173 Q121 191 121 211 Q122 226 132 232 Q141 223 144 208 Q146 190 146 176 Z" fill="#f8f8f8" stroke="#333" strokeWidth="2" />
      {/* 右前腕（背面） */}
      <path d="M269 173 Q279 191 279 211 Q278 226 268 232 Q259 223 256 208 Q254 190 254 176 Z" fill="#f8f8f8" stroke="#333" strokeWidth="2" />
      {/* 左大腿（背面） */}
      <path d="M182 222 Q168 252 166 286 Q166 306 178 317 Q190 306 192 286 Q194 254 196 226 Z" fill="#f8f8f8" stroke="#333" strokeWidth="2" />
      {/* 右大腿（背面） */}
      <path d="M218 222 Q232 252 234 286 Q234 306 222 317 Q210 306 208 286 Q206 254 204 226 Z" fill="#f8f8f8" stroke="#333" strokeWidth="2" />
      {/* 左下腿（背面） */}
      <path d="M178 317 Q168 340 166 368 Q166 384 175 392 Q184 386 187 372 Q190 348 192 321 Z" fill="#f8f8f8" stroke="#333" strokeWidth="2" />
      {/* 右下腿（背面） */}
      <path d="M222 317 Q232 340 234 368 Q234 384 225 392 Q216 386 213 372 Q210 348 208 321 Z" fill="#f8f8f8" stroke="#333" strokeWidth="2" />
    </g>
  );
}
