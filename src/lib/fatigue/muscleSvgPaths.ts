import type { MuscleId } from '@/types/domain';

export interface MuscleSvgEntry {
  muscleId: MuscleId;
  view: 'front' | 'back';
  pathData: string;
  label: { x: number; y: number };
}

// ViewBox: "0 0 200 420"
// Human figure centered at x=100, total height ~400px
// Left/right in viewer's perspective (figure's right arm is on viewer's left)
export const MUSCLE_SVG_PATHS: MuscleSvgEntry[] = [
  // ── Front view ─────────────────────────────────────────────────────────
  {
    muscleId: 'head',
    view: 'front',
    pathData: 'M 100,38 m -26,0 a 26,26 0 1,0 52,0 a 26,26 0 1,0 -52,0',
    label: { x: 100, y: 38 },
  },
  {
    muscleId: 'shoulders_left',
    view: 'front',
    pathData: 'M 28,72 L 62,70 L 58,106 L 18,110 Z',
    label: { x: 40, y: 90 },
  },
  {
    muscleId: 'shoulders_right',
    view: 'front',
    pathData: 'M 138,70 L 172,72 L 182,110 L 142,106 Z',
    label: { x: 160, y: 90 },
  },
  {
    muscleId: 'chest',
    view: 'front',
    pathData: 'M 62,70 L 138,70 L 140,140 L 60,140 Z',
    label: { x: 100, y: 105 },
  },
  {
    muscleId: 'abs',
    view: 'front',
    pathData: 'M 60,142 L 140,142 L 138,196 L 62,196 Z',
    label: { x: 100, y: 169 },
  },
  {
    muscleId: 'biceps_left',
    view: 'front',
    pathData: 'M 16,112 L 52,108 L 50,162 L 14,166 Z',
    label: { x: 33, y: 137 },
  },
  {
    muscleId: 'biceps_right',
    view: 'front',
    pathData: 'M 148,108 L 184,112 L 186,166 L 150,162 Z',
    label: { x: 167, y: 137 },
  },
  {
    muscleId: 'forearms_left',
    view: 'front',
    pathData: 'M 12,168 L 48,164 L 46,218 L 8,220 Z',
    label: { x: 28, y: 193 },
  },
  {
    muscleId: 'forearms_right',
    view: 'front',
    pathData: 'M 152,164 L 188,168 L 192,220 L 154,218 Z',
    label: { x: 172, y: 193 },
  },
  {
    muscleId: 'thighs_left',
    view: 'front',
    pathData: 'M 60,198 L 100,196 L 100,296 L 58,298 Z',
    label: { x: 79, y: 247 },
  },
  {
    muscleId: 'thighs_right',
    view: 'front',
    pathData: 'M 100,196 L 140,198 L 142,298 L 100,296 Z',
    label: { x: 121, y: 247 },
  },
  {
    muscleId: 'calves_left',
    view: 'front',
    pathData: 'M 58,300 L 98,300 L 96,380 L 57,380 Z',
    label: { x: 77, y: 340 },
  },
  {
    muscleId: 'calves_right',
    view: 'front',
    pathData: 'M 102,300 L 142,300 L 143,380 L 104,380 Z',
    label: { x: 123, y: 340 },
  },

  // ── Back view ──────────────────────────────────────────────────────────
  {
    muscleId: 'head',
    view: 'back',
    pathData: 'M 100,38 m -26,0 a 26,26 0 1,0 52,0 a 26,26 0 1,0 -52,0',
    label: { x: 100, y: 38 },
  },
  {
    muscleId: 'shoulders_left',
    view: 'back',
    pathData: 'M 28,72 L 62,70 L 58,106 L 18,110 Z',
    label: { x: 40, y: 90 },
  },
  {
    muscleId: 'shoulders_right',
    view: 'back',
    pathData: 'M 138,70 L 172,72 L 182,110 L 142,106 Z',
    label: { x: 160, y: 90 },
  },
  {
    muscleId: 'back',
    view: 'back',
    pathData: 'M 62,70 L 138,70 L 140,196 L 60,196 Z',
    label: { x: 100, y: 133 },
  },
  {
    muscleId: 'triceps_left',
    view: 'back',
    pathData: 'M 16,112 L 52,108 L 50,162 L 14,166 Z',
    label: { x: 33, y: 137 },
  },
  {
    muscleId: 'triceps_right',
    view: 'back',
    pathData: 'M 148,108 L 184,112 L 186,166 L 150,162 Z',
    label: { x: 167, y: 137 },
  },
  {
    muscleId: 'forearms_left',
    view: 'back',
    pathData: 'M 12,168 L 48,164 L 46,218 L 8,220 Z',
    label: { x: 28, y: 193 },
  },
  {
    muscleId: 'forearms_right',
    view: 'back',
    pathData: 'M 152,164 L 188,168 L 192,220 L 154,218 Z',
    label: { x: 172, y: 193 },
  },
  {
    muscleId: 'thighs_left',
    view: 'back',
    pathData: 'M 60,198 L 100,196 L 100,296 L 58,298 Z',
    label: { x: 79, y: 247 },
  },
  {
    muscleId: 'thighs_right',
    view: 'back',
    pathData: 'M 100,196 L 140,198 L 142,298 L 100,296 Z',
    label: { x: 121, y: 247 },
  },
  {
    muscleId: 'calves_left',
    view: 'back',
    pathData: 'M 58,300 L 98,300 L 96,380 L 57,380 Z',
    label: { x: 77, y: 340 },
  },
  {
    muscleId: 'calves_right',
    view: 'back',
    pathData: 'M 102,300 L 142,300 L 143,380 L 104,380 Z',
    label: { x: 123, y: 340 },
  },
];
