import { NextRequest, NextResponse } from 'next/server';

// in-memory storage (本番環境ではデータベースを使用)
const fatigueData: { [key: string]: number } = {
  head: 0,
  shoulders: 0,
  chest: 0,
  back: 0,
  abs: 0,
  biceps: 0,
  triceps: 0,
  forearms: 0,
  forearms_right: 0,
  thighs: 0,
  calves: 0,
  thighs_right: 0,
  calves_right: 0,
};

// GET: 疲労度データを取得
export async function GET() {
  return NextResponse.json(fatigueData);
}

// POST: 疲労度データを保存
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // 特定の筋肉グループの疲労度を更新
    if (body.muscle && typeof body.tire === 'number') {
      fatigueData[body.muscle] = Math.min(100, Math.max(0, body.tire));
    }
    
    return NextResponse.json({ success: true, data: fatigueData });
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}

// PUT: すべての疲労度データをリセット
export async function PUT() {
  Object.keys(fatigueData).forEach(key => {
    fatigueData[key] = 0;
  });
  return NextResponse.json({ success: true, data: fatigueData });
}
