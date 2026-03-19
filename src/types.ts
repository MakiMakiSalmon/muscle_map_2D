// 筋肉部位のデータ型
export interface MuscleGroup {
  id: string;
  name: string;
  fatigue: number; // 0-100
}

// API レスポンス型
export interface FatigueData {
  tire: number; // 疲労度
}
