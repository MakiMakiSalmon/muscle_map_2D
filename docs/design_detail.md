# 詳細設計書 — 筋肉疲労マップ 2D

最終更新: 2026-04-23（レビュー反映: 加算ロジック/左右対称/quota対策/seed/TZ/Auth共通化/楽観的更新/任意論点）  
前提: design_basic.md・function.md の内容に基づく

---

## 1. TypeScript 型定義

**ファイル: `src/types/domain.ts`**

```typescript
// ── 筋肉定義 ────────────────────────────────────────────────────────────────
// 設計方針: 左右対称筋はすべて _left / _right で分離する（16筋肉）。
// 旧モデルの shoulders/biceps/triceps が単一だった不整合を解消。

export const MUSCLE_IDS = [
  // 中央（4）
  'head', 'chest', 'back', 'abs',
  // 左右ペア（6×2 = 12）
  'shoulders_left', 'shoulders_right',
  'biceps_left',    'biceps_right',
  'triceps_left',   'triceps_right',
  'forearms_left',  'forearms_right',
  'thighs_left',    'thighs_right',
  'calves_left',    'calves_right',
] as const;

export type MuscleId = typeof MUSCLE_IDS[number];

export const MUSCLE_LABELS: Record<MuscleId, string> = {
  head:             '頭部',
  chest:            '胸部',
  back:             '背中',
  abs:              '腹部',
  shoulders_left:   '肩（左）',
  shoulders_right:  '肩（右）',
  biceps_left:      '上腕二頭筋（左）',
  biceps_right:     '上腕二頭筋（右）',
  triceps_left:     '上腕三頭筋（左）',
  triceps_right:    '上腕三頭筋（右）',
  forearms_left:    '前腕（左）',
  forearms_right:   '前腕（右）',
  thighs_left:      '太もも（左）',
  thighs_right:     '太もも（右）',
  calves_left:      'ふくらはぎ（左）',
  calves_right:     'ふくらはぎ（右）',
};

// 種目カタログ用の「論理筋肉グループ」— 左右を区別しない
// 例: ベンチプレスは両肩・両三頭筋を使う → 'shoulders', 'triceps' と記述すればよい
export const MUSCLE_GROUPS = [
  'head', 'chest', 'back', 'abs',
  'shoulders', 'biceps', 'triceps', 'forearms', 'thighs', 'calves',
] as const;

export type MuscleGroup = typeof MUSCLE_GROUPS[number];

// MuscleGroup → MuscleId[] への展開
// 中央筋は単一、左右ペア筋は両方を返す
export function expandMuscleGroup(group: MuscleGroup): MuscleId[] {
  switch (group) {
    case 'head':      return ['head'];
    case 'chest':     return ['chest'];
    case 'back':      return ['back'];
    case 'abs':       return ['abs'];
    case 'shoulders': return ['shoulders_left', 'shoulders_right'];
    case 'biceps':    return ['biceps_left',    'biceps_right'];
    case 'triceps':   return ['triceps_left',   'triceps_right'];
    case 'forearms':  return ['forearms_left',  'forearms_right'];
    case 'thighs':    return ['thighs_left',    'thighs_right'];
    case 'calves':    return ['calves_left',    'calves_right'];
  }
}

// 筋肉ごとの完全回復時間（時間）— 文献標準値ベース
export const MUSCLE_RECOVERY_HOURS: Record<MuscleId, number> = {
  head:             24,
  chest:            48,
  back:             72,
  abs:              48,
  shoulders_left:   48, shoulders_right:  48,
  biceps_left:      48, biceps_right:     48,
  triceps_left:     48, triceps_right:    48,
  forearms_left:    36, forearms_right:   36,
  thighs_left:      72, thighs_right:     72,
  calves_left:      48, calves_right:     48,
};

// ── 疲労スナップショット ─────────────────────────────────────────────────────

export interface FatigueSnapshot {
  id: string;
  muscleId: MuscleId;
  value: number;                    // 保存時点の疲労値（0-100）
  recordedAt: Date;
  source: 'manual' | 'workout';
  workoutSessionId: string | null;
}

// APIレスポンス: 現在の疲労値（回復計算済み）
export interface CurrentFatigueEntry {
  savedValue: number;               // 保存時の値
  currentValue: number;             // 回復計算後の現在値
  recordedAt: string;               // ISO 8601
  recoveryHoursRemaining: number;   // 完全回復までの残り時間（小数）
}

export type CurrentFatigueMap = Record<MuscleId, CurrentFatigueEntry>;

// ── トレーニング ─────────────────────────────────────────────────────────────

export interface Exercise {
  id: string;
  nameJa: string;
  nameEn: string;
  // 論理グループで記述。左右ペア筋は自動的に両方に展開される
  primaryMuscles: MuscleGroup[];
  secondaryMuscles: MuscleGroup[];
}

export interface WorkoutExerciseInput {
  exerciseId: string;
  sets: number;
  reps: number | null;
  weightKg: number | null;
}

export interface WorkoutSession {
  id: string;
  performedAt: string;              // ISO 8601
  exercises: WorkoutExerciseInput[];
}
// Note: notes フィールドは MVP では持たない。UI 入力欄を追加する段階で復活検討。

// POST /api/workout のレスポンス
export interface WorkoutSaveResult {
  session: WorkoutSession;
  fatigueImpacts: Partial<Record<MuscleId, number>>; // 加算された疲労値デルタ
}
```

---

## 2. Firestore スキーマ（詳細）

### コレクション構造

```
Firestore
│
├── exercises/{exerciseId}              # 種目カタログ（グローバル・読み取り専用）
│   ├── nameJa: string                  例) "ベンチプレス"
│   ├── nameEn: string                  例) "bench_press"
│   ├── primaryMuscles: string[]        MuscleGroup[] 例) ["chest", "triceps"]
│   └── secondaryMuscles: string[]      MuscleGroup[] 例) ["shoulders"]
│                                       ※ 論理グループで保存、API層で MuscleId[] に展開
│
└── users/{uid}/
    │
    ├── fatigueSnapshots/{snapshotId}   # 疲労値の全履歴（追記のみ）
    │   ├── muscleId: string
    │   ├── value: number               0-100
    │   ├── recordedAt: Timestamp
    │   ├── source: string              "manual" | "workout"
    │   └── workoutSessionId: string | null
    │
    └── workoutSessions/{sessionId}     # トレーニングセッション
        ├── performedAt: Timestamp
        └── exercises: array
              [ { exerciseId: string,
                  sets: number,
                  reps: number | null,
                  weightKg: number | null } ]
```

### クエリ設計

| 用途 | クエリ |
|------|--------|
| 現在疲労値（全筋肉の最新1件ずつ） | `fatigueSnapshots` を `recordedAt DESC` でソートし、muscleId ごとに先頭1件を取得（アプリ側でグループ化） |
| 特定筋肉の履歴 | `where muscleId == X, orderBy recordedAt DESC, limit 20` |
| トレーニングセッション一覧 | `workoutSessions orderBy performedAt DESC, limit 10` |
| 種目検索 | `where nameJa >= q, where nameJa <= q + '\uf8ff'`（Firestore prefix検索の定石。\uf8ffは私用面の末尾コードポイント） |

### Firestore セキュリティルール

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // 種目カタログ: 認証済みユーザーは読み取りのみ
    match /exercises/{exerciseId} {
      allow read: if request.auth != null;
      allow write: if false;
    }

    // ユーザーデータ: 本人のみフルアクセス
    // Note: MVP では {document=**} で全許可。production 化時はデータ型・値域の
    //       バリデーションルールを追加する（例: value は 0-100 の int のみ許可）
    match /users/{uid}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == uid;
    }
  }
}
```

### Firestore 複合インデックス定義 ★重要

以下のクエリは **複合インデックスが必須** で、未定義の場合 Firestore は初回実行時に `FAILED_PRECONDITION: The query requires an index` エラーを返す。デプロイ前に必ず `firestore.indexes.json` を用意し `firebase deploy --only firestore:indexes` でデプロイする。

| 必要なクエリ | 発行箇所 | 必要インデックス |
|-------------|---------|----------------|
| `where('muscleId', '==', X).orderBy('recordedAt', 'desc').limit(N)` | `getLatestSnapshot`, `GET /api/fatigue/history` | `fatigueSnapshots: (muscleId ASC, recordedAt DESC)` 複合 |
| `orderBy('performedAt', 'desc').limit(N)` | `GET /api/workout/history` | 単一フィールド（自動作成） |
| `where('nameJa', '>=', q).where('nameJa', '<=', q + '')` | `GET /api/exercises` | 単一フィールド（自動作成） |

**ファイル: `firestore.indexes.json`**

```json
{
  "indexes": [
    {
      "collectionGroup": "fatigueSnapshots",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "muscleId",   "order": "ASCENDING" },
        { "fieldPath": "recordedAt", "order": "DESCENDING" }
      ]
    }
  ],
  "fieldOverrides": []
}
```

**`firebase.json` の該当部分:**
```json
{
  "firestore": {
    "rules":   "firestore.rules",
    "indexes": "firestore.indexes.json"
  }
}
```

---

## 3. APIエンドポイント仕様

全エンドポイント共通:
- **認証**: `Authorization: Bearer {Firebase IDトークン}` ヘッダー必須
- **エラーレスポンス**: `{ "error": string, "code": string }`
- **HTTPステータス**: 401 未認証、400 バリデーションエラー、500 サーバーエラー

**MVP スコープ外（v1.3以降で検討）:**
- ワークアウトセッションの編集・削除 API（`PATCH/DELETE /api/workout/{id}`）
- 疲労スナップショットの個別削除 API
- 誤入力時の救済は、当面「手動スライダーで上書き保存」か「全リセット」で代替

---

### GET `/api/fatigue/current`

現在の疲労値を全筋肉分取得（回復計算済み）

**レスポンス 200:**
```json
{
  "data": {
    "chest": {
      "savedValue": 80,
      "currentValue": 55,
      "recordedAt": "2026-04-22T10:00:00.000Z",
      "recoveryHoursRemaining": 22.4
    },
    "back": {
      "savedValue": 0,
      "currentValue": 0,
      "recordedAt": "2026-04-01T00:00:00.000Z",
      "recoveryHoursRemaining": 0
    }
  }
}
```

※ 一度も保存していない筋肉は `savedValue: 0, currentValue: 0` で返す

---

### POST `/api/fatigue`

1筋肉の疲労値を手動保存

**リクエストボディ:**
```json
{ "muscleId": "chest", "value": 75 }
```

**バリデーション:**
- `muscleId`: MUSCLE_IDS に含まれる値であること
- `value`: 0 以上 100 以下の整数

**レスポンス 201:**
```json
{
  "snapshot": {
    "id": "abc123",
    "muscleId": "chest",
    "value": 75,
    "recordedAt": "2026-04-23T09:00:00.000Z",
    "source": "manual",
    "workoutSessionId": null
  }
}
```

---

### PUT `/api/fatigue/reset`

全筋肉に value=0 のスナップショットを一括挿入（履歴は消さない）

**レスポンス 200:**
```json
{
  "resetAt": "2026-04-23T09:00:00.000Z"
}
```

---

### GET `/api/fatigue/history`

特定筋肉の疲労値履歴を取得

**クエリパラメータ:**

| パラメータ | 型 | 必須 | 説明 |
|-----------|---|------|------|
| `muscleId` | string | ✓ | 対象筋肉ID |
| `limit` | number | — | 最大取得件数（デフォルト20、最大50） |

**レスポンス 200:**
```json
{
  "history": [
    {
      "id": "abc123",
      "muscleId": "chest",
      "value": 75,
      "recordedAt": "2026-04-23T09:00:00.000Z",
      "source": "manual",
      "workoutSessionId": null
    }
  ]
}
```

---

### GET `/api/exercises`

種目カタログを検索

**クエリパラメータ:**

| パラメータ | 型 | 必須 | 説明 |
|-----------|---|------|------|
| `q` | string | — | 検索キーワード（未指定時は全件） |
| `limit` | number | — | 最大取得件数（デフォルト20） |

**レスポンス 200:**
```json
{
  "exercises": [
    {
      "id": "bench_press",
      "nameJa": "ベンチプレス",
      "nameEn": "bench_press",
      "primaryMuscles": ["chest", "triceps"],
      "secondaryMuscles": ["shoulders"]
    }
  ]
}
```

---

### POST `/api/workout`

トレーニングセッションを保存 → 疲労値スナップショットを自動生成

**リクエストボディ:**
```json
{
  "performedAt": "2026-04-23T18:00:00.000Z",
  "exercises": [
    { "exerciseId": "bench_press", "sets": 3, "reps": 10, "weightKg": 60 },
    { "exerciseId": "squat",       "sets": 3, "reps": 8,  "weightKg": 80 }
  ]
}
```

**バリデーション（zod 等でサーバー側で厳密にチェック、違反時は 400）:**

| フィールド | 型 | 範囲 / 制約 |
|-----------|---|------------|
| `performedAt` | string | ISO 8601 形式。未来日時は拒否（現在時刻+5分まで許容） |
| `exercises` | array | **1〜50 件** |
| `exercises[].exerciseId` | string | `exercises` コレクションに存在する id |
| `exercises[].sets` | integer | **1〜99** |
| `exercises[].reps` | integer \| null | null または **1〜999** |
| `exercises[].weightKg` | number \| null | null または **0〜999**（負数不可、0.5 刻み程度を想定） |

※ `notes` フィールドは MVP スコープ外として削除（UI 入力欄なし、→ `WorkoutSession` 型からも削除済み）。

**レスポンス 201:**
```json
{
  "session": {
    "id": "session_xyz",
    "performedAt": "2026-04-23T18:00:00.000Z",
    "exercises": [...]
  },
  "fatigueImpacts": {
    "chest":         40,
    "triceps_left":  20,
    "triceps_right": 20,
    "thighs_left":   50,
    "thighs_right":  50,
    "calves_left":   15,
    "calves_right":  15
  }
}
```

---

### GET `/api/workout/history`

トレーニングセッション一覧を取得

**クエリパラメータ:**

| パラメータ | 型 | 必須 | 説明 |
|-----------|---|------|------|
| `limit` | number | — | 最大取得件数（デフォルト10） |
| `cursor` | string | — | ページネーション用カーソル（前回の最後の `documentId`）。タイブレーカー確保のため `performedAt` 文字列ではなく **ドキュメント ID** を渡し、サーバー側で `startAfter(docSnapshot)` に変換する |

**レスポンス 200:**
```json
{
  "sessions": [
    {
      "id": "session_xyz",
      "performedAt": "2026-04-23T18:00:00.000Z",
      "exercises": [...]
    }
  ],
  "nextCursor": "session_abc123"
}
```

---

## 4. ビジネスロジック仕様

### 4-1. 回復計算 (`src/lib/fatigue/recoveryCalc.ts`)

**モデル選択の理由:** 線形減衰（linear decay）を採用する。生理学的には指数減衰（DOMS は初期に速く、後半は緩やか）の方が近いが、以下の理由で MVP は線形を選ぶ:
- UI 上の体感差は軽微（48h 回復なら 24h 時点で 線形=50% vs 指数=~30% 程度）
- テストしやすい（残り時間の逆算が直観的）
- ユーザーへの説明が明確（"24時間で半分回復"）

将来、RPE やユーザー自己申告の回復感と実値が乖離する場合、`applyDecay` のみ差し替え可能な純粋関数として設計している。

```typescript
// 経過時間に応じた現在疲労値を返す
// formula: currentValue = savedValue × max(0, 1 - elapsedHours / recoveryHours)
export function applyDecay(
  savedValue: number,
  recordedAt: Date,
  muscleId: MuscleId,
  now = new Date()
): number {
  const recoveryHours = MUSCLE_RECOVERY_HOURS[muscleId];
  const elapsedHours = (now.getTime() - recordedAt.getTime()) / (1000 * 3600);
  const ratio = Math.max(0, 1 - elapsedHours / recoveryHours);
  return Math.round(savedValue * ratio);
}

// 完全回復までの残り時間（時間）を返す
export function calcRecoveryHoursRemaining(
  savedValue: number,
  recordedAt: Date,
  muscleId: MuscleId,
  now = new Date()
): number {
  if (savedValue === 0) return 0;
  const recoveryHours = MUSCLE_RECOVERY_HOURS[muscleId];
  const elapsedHours = (now.getTime() - recordedAt.getTime()) / (1000 * 3600);
  const remaining = Math.max(0, recoveryHours - elapsedHours);
  // 現在値がすでに0なら残り0
  const currentValue = applyDecay(savedValue, recordedAt, muscleId, now);
  return currentValue === 0 ? 0 : Math.round(remaining * 10) / 10;
}
```

### 4-2. 疲労値インパクト計算 (`src/lib/workout/fatigueImpact.ts`)

**MVP の単純化方針（将来改善予定）:**
- 本 MVP では `sets × reps`（ボリューム）のみ考慮し、`weightKg`（強度）は計算に反映しない
- 結果として「5×5×100kg（高強度低回数）」よりも「3×10×40kg（低強度高回数）」の方が疲労が高く算出される
- 生理学的には正確でないが、実装・テストの単純さを優先する。v1.3 以降で以下のいずれかの方向性で改善:
  - (a) 重量係数: `intensityFactor = min(2.0, weightKg / bodyweight * 0.02 + 0.5)`（ユーザー体重情報が必要）
  - (b) RPE（主観的強度 1-10）を UI に追加して係数化
- 現段階で実装者が迷わないよう、`weightKg` はストレージと履歴表示用途のみと位置づける

```typescript
// 種目・セット・回数から筋肉ごとの疲労値デルタを計算
// ベースライン: 3セット×10回 = 主筋肉40%、補助筋肉20%
// 種目カタログは MuscleGroup（論理グループ）で記述されているので、
// expandMuscleGroup で左右ペア筋を MuscleId[] に展開してから加算する。
export function computeFatigueImpact(
  exercise: Exercise,
  sets: number,
  reps: number | null,
): Partial<Record<MuscleId, number>> {
  const effectiveReps = reps ?? 10;
  const volume = sets * effectiveReps;
  const baseVolume = 30; // 3セット × 10回

  const primaryDelta   = Math.min(80, Math.round(40 * volume / baseVolume));
  const secondaryDelta = Math.min(40, Math.round(20 * volume / baseVolume));

  const impacts: Partial<Record<MuscleId, number>> = {};
  for (const group of exercise.primaryMuscles) {
    for (const muscleId of expandMuscleGroup(group)) {
      impacts[muscleId] = primaryDelta;
    }
  }
  for (const group of exercise.secondaryMuscles) {
    for (const muscleId of expandMuscleGroup(group)) {
      impacts[muscleId] = (impacts[muscleId] ?? 0) + secondaryDelta;
    }
  }
  return impacts;
}

// 複数種目のインパクトを合算（この段階では上限なし。加算は 4-3 で実施）
export function mergeImpacts(
  impacts: Partial<Record<MuscleId, number>>[]
): Partial<Record<MuscleId, number>> {
  const merged: Partial<Record<MuscleId, number>> = {};
  for (const impact of impacts) {
    for (const [muscleId, delta] of Object.entries(impact) as [MuscleId, number][]) {
      merged[muscleId] = (merged[muscleId] ?? 0) + delta;
    }
  }
  return merged;
}
```

### 4-3. トレーニング保存時の加算ロジック ★新規追加（レビュー #1 反映）

`POST /api/workout` の疲労値スナップショット生成は「デルタを現在の減衰済み値に加算」して新しい絶対値を書き込む。単純に delta を value として書くと過去の蓄積疲労が失われる。

**実装フロー（`src/lib/workout/applyWorkoutToFatigue.ts`）:**

```typescript
// 入力: ワークアウトのインパクト（MuscleId → delta%）
// 出力: 書き込むべきスナップショット群（既存減衰済み値 + delta、100上限）
export async function applyWorkoutToFatigue(
  uid: string,
  impacts: Partial<Record<MuscleId, number>>,
  workoutSessionId: string,
  db: Firestore,
  now = new Date(),
): Promise<Array<Pick<FatigueSnapshot, 'muscleId' | 'value' | 'source' | 'workoutSessionId'> & { recordedAt: Date }>> {
  // Firestore read を並列実行（シリアルだと影響筋肉数 × RTT になる）
  const entries = Object.entries(impacts) as [MuscleId, number][];

  const snapshots = await Promise.all(
    entries.map(async ([muscleId, delta]) => {
      // 1. 現在の最新スナップショットを取得
      const latest = await getLatestSnapshot(uid, muscleId, db);

      // 2. 回復計算を適用して現時点の疲労値を得る
      const currentValue = latest
        ? applyDecay(latest.value, latest.recordedAt, muscleId, now)
        : 0;

      // 3. デルタを加算して 100 上限でクランプ
      const nextValue = Math.min(100, currentValue + delta);

      return {
        muscleId,
        value: nextValue,
        recordedAt: now,
        source: 'workout' as const,
        workoutSessionId,
      };
    })
  );

  // 4. 12-1 の batch write でまとめて保存する
  return snapshots;
}
```

**`getLatestSnapshot` のシグネチャ:**

```typescript
// src/lib/fatigue/getLatestSnapshot.ts
// where('muscleId', '==', X).orderBy('recordedAt', 'desc').limit(1) を発行
// ※ 複合インデックス (muscleId, recordedAt) が必要 — §2 参照
export async function getLatestSnapshot(
  uid: string,
  muscleId: MuscleId,
  db: Firestore,
): Promise<FatigueSnapshot | null> {
  const snap = await db
    .collection(`users/${uid}/fatigueSnapshots`)
    .where('muscleId', '==', muscleId)
    .orderBy('recordedAt', 'desc')
    .limit(1)
    .get();
  if (snap.empty) return null;
  const doc = snap.docs[0];
  const data = doc.data();
  return {
    id: doc.id,
    muscleId: data.muscleId,
    value: data.value,
    recordedAt: data.recordedAt.toDate(),
    source: data.source,
    workoutSessionId: data.workoutSessionId,
  };
}
```

**Why この実装:**
- 現在の値 + delta で書くため、過去の疲労が保持される
- 回復計算を毎回かませることで「古い疲労値に新しい delta を足して過大評価」を防ぐ
- `GET /api/fatigue/current` と同じ `applyDecay` を再利用（計算式の単一ソース化）

**例:**
- 3日前に chest 80% を保存 → 今日の減衰済み現在値 ≈ 20%
- ベンチプレス 3×10 のインパクト +40%
- 新しいスナップショットの value = 20 + 40 = 60%（80 + 40 = 120 ではない）

---

## 5. Zustand Store 仕様

**ファイル: `src/stores/uiStore.ts`**

```typescript
interface UIStore {
  // 体図の表示面
  bodyView: 'front' | 'back';
  setBodyView: (view: 'front' | 'back') => void;

  // 選択中の筋肉
  selectedMuscle: MuscleId | null;
  setSelectedMuscle: (id: MuscleId | null) => void;

  // 右パネルのタブ
  activePanelTab: 'input' | 'history' | 'workout';
  setActivePanelTab: (tab: 'input' | 'history' | 'workout') => void;

  // M01: トレーニング入力モーダル
  isWorkoutModalOpen: boolean;
  openWorkoutModal: () => void;
  closeWorkoutModal: () => void;

  // M02: リセット確認モーダル
  isResetModalOpen: boolean;
  openResetModal: () => void;
  closeResetModal: () => void;
}
```

---

## 6. TanStack Query キー規約

```typescript
// src/lib/queryKeys.ts

export const queryKeys = {
  fatigue: {
    current:            ['fatigue', 'current']                          as const,
    // 筋肉単位キャッシュは持たない。楽観的更新は current マップへの部分更新で実現（§16）
    history:    (id: MuscleId) => ['fatigue', 'history', id]           as const,
  },
  workout: {
    history:            ['workout', 'history']                          as const,
  },
  exercises: {
    list: (q: string)   => ['exercises', q]                            as const,
  },
} as const;
```

※ 楽観的更新の詳細は §16 参照。

---

## 7. 主要コンポーネント Props 設計

### `MuscleDiagram`

```typescript
interface MuscleDiagramProps {
  // API が常に全16筋肉分を返す（未保存は savedValue=0）ので Partial にしない
  fatigueData: CurrentFatigueMap;
  selectedMuscle: MuscleId | null;
  onMuscleClick: (id: MuscleId) => void;
}
```

### `MuscleLayer`（SVG パスの1部位）

```typescript
interface MuscleLayerProps {
  muscleId: MuscleId;
  currentValue: number;     // 色の計算に使う（0-100）
  isSelected: boolean;
  onClick: () => void;
  pathData: string;         // SVG path の d 属性
}
```

### `FatigueSlider`

```typescript
interface FatigueSliderProps {
  muscleId: MuscleId;
  initialValue: number;     // 保存済みの値で初期化（C2の修正）
  onSave: (value: number) => void;
  isSaving: boolean;
}
```

### `FatigueHistoryChart`

```typescript
interface FatigueHistoryChartProps {
  muscleId: MuscleId;
  history: Pick<FatigueSnapshot, 'value' | 'recordedAt'>[];
}
```

### `WorkoutInputModal`（M01）

```typescript
interface WorkoutInputModalProps {
  isOpen: boolean;
  onClose: () => void;
}
// 内部で useWorkout mutation を呼ぶ。外部からデータは渡さない
//
// 疲労値プレビューの表示仕様:
// - 画面内の「疲労値プレビュー」セクションは "+40%" 形式でデルタを表示する
// - 理由: 入力中はまだ保存されていないので「現在値→次の値」は不安定。
//         デルタ表示なら入力内容の直接的なフィードバックになる
// - デルタの計算は useFatigueImpactPreview フックで computeFatigueImpact + mergeImpacts
//   をクライアント側で実行（APIコール不要、即時反映）
```

### `ResetConfirmModal`（M02）

```typescript
interface ResetConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;    // PUT /api/fatigue/reset を呼ぶ
  isResetting: boolean;
}
```

### `Modal`（ui/ 共通基盤）

```typescript
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}
// 背景暗転・×ボタン・オーバーレイ外クリックで onClose を呼ぶ
// focus trap を実装してアクセシビリティを確保
```

---

## 8. 色マッピング仕様

**ファイル: `src/lib/fatigue/colorMap.ts`**

```typescript
export function getFatigueColor(value: number): string {
  if (value === 0)   return '#dddddd'; // 灰色（未入力 or 完全回復）
  if (value < 30)    return '#90ee90'; // 薄緑（低疲労）
  if (value < 60)    return '#ffd700'; // 黄（中疲労）
  if (value < 80)    return '#ff8c00'; // 橙（高疲労）
  return               '#ff4500';      // 赤橙（最高疲労）
}
```

---

## 9. エラーハンドリング方針

| エラー種別 | 対処 |
|-----------|------|
| 401 Unauthorized | Firebase Auth で再認証 → `/login` へリダイレクト |
| 400 バリデーションエラー | フォームにインラインエラーメッセージ表示 |
| 500 サーバーエラー | Toast でエラー通知、TanStack Query が自動リトライ（最大2回） |
| ネットワーク断 | TanStack Query のオフライン検知でリトライキューに積む |
| Firebase quota 超過 | 503 として返し、既存の ServiceErrorScreen を継続使用 |

---

## 10. テスト仕様

### テスト対象と優先度

| 対象ファイル | テスト種別 | 優先度 | 確認内容 |
|-------------|-----------|--------|---------|
| `recoveryCalc.ts` | Unit | 高 | 0%・100%・境界値・完全回復後の挙動 |
| `fatigueImpact.ts` (computeFatigueImpact) | Unit | 高 | ベースラインのデルタ計算、MuscleGroup→左右ペア展開 |
| `fatigueImpact.ts` (mergeImpacts) | Unit | 高 | 複数種目合算（上限なし）、空配列の挙動 |
| `expandMuscleGroup` | Unit | 高 | 中央筋は単一、ペア筋は2要素を返す |
| `applyWorkoutToFatigue` | Unit | 高 | 現在値+delta・100上限クランプ・既存スナップショットなし=0+delta |
| `colorMap.ts` | Unit | 中 | 各閾値境界での色コード |
| `format.ts`（JST整形） | Unit | 中 | UTCタイムスタンプが JST で正しく整形される |
| `MuscleLayer` | Component | 高 | クリックで onMuscleClick が正しい id で呼ばれる |
| `FatigueSlider` | Component | 高 | initialValue で初期化、[確定]押下で onSave が呼ばれる、保存中はボタン disabled |
| `ResetConfirmModal` | Component | 高 | [キャンセル]→onClose、[リセットする]→onConfirm |
| `WorkoutInputModal` | Component | 中 | 種目追加・削除・保存フロー、プレビューがデルタ形式 |
| `useSaveFatigue` | Hook | 高 | 楽観的更新、失敗時の筋肉単位ロールバック |
| `verifyUser` / `withAuth` | Unit | 高 | Bearerトークン不正→401、正常系で uid を返す |
| `GET /api/fatigue/current` | API Route | 高 | 未認証401、正常系レスポンス形式 |
| `POST /api/fatigue` | API Route | 高 | バリデーションエラー400、正常系201 |
| `PUT /api/fatigue/reset` | API Route | 中 | batch write で16筋肉分のスナップショットが作成される |
| `POST /api/workout` | API Route | 高 | 加算ロジックが正しく機能する、batch write で原子性確保 |

### テスト設定ファイル

**`vitest.config.ts`:**
```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    globals: true,
  },
  resolve: { alias: { '@': path.resolve(__dirname, './src') } },
});
```

**`src/test/setup.ts`:**
```typescript
import '@testing-library/jest-dom';
import { beforeAll, afterAll, afterEach } from 'vitest';
import { server } from './mocks/server';

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

---

## 11. CI/CD パイプライン仕様

**`.github/workflows/ci.yml`（概要）:**

```yaml
name: CI
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - run: npm ci
      - run: npm run lint
      - run: npm run test        # vitest run
      - run: npm run build       # next build

  # main ブランチへのマージ時のみ Firestore ルールとインデックスをデプロイ
  deploy-firestore:
    needs: test
    if: github.ref == 'refs/heads/main' && github.event_name == 'push'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - run: npm ci
      - run: npx firebase-tools deploy --only firestore:indexes,firestore:rules --token "$FIREBASE_TOKEN"
        env:
          FIREBASE_TOKEN: ${{ secrets.FIREBASE_TOKEN }}

# Vercel へのデプロイは Vercel の GitHub 連携が自動実行
# CI が通った push のみデプロイされるよう Vercel の設定で制御
```

**初回セットアップで1回だけ実行するコマンド:**
```bash
firebase login
firebase init firestore   # firestore.rules と firestore.indexes.json を生成
firebase deploy --only firestore:indexes,firestore:rules
```

---

## 12. Firebase 書き込み削減対策 ★新規追加（レビュー #3 反映）

再設計の動機は quota 超過なので、新スキーマでは書き込みを意識的に抑える。

### 12-1. バッチ書き込み

| 操作 | 変更前（素直に書くと） | 対策後 |
|------|----------------------|--------|
| リセット | 16 書き込み（筋肉ごとに1件） | Firestore `writeBatch` で 1 バッチにまとめる |
| ワークアウト保存 | セッション1 + 筋肉ごと最大16 = 最大17 書き込み | `writeBatch` で1バッチ。原子性も確保 |

```typescript
// 例: リセット処理
const batch = db.batch();
for (const muscleId of MUSCLE_IDS) {
  const ref = db.collection(`users/${uid}/fatigueSnapshots`).doc();
  batch.set(ref, { muscleId, value: 0, recordedAt: now, source: 'manual', workoutSessionId: null });
}
await batch.commit(); // Firestore の課金は「1操作」ではなく「書き込んだドキュメント数」なので、
                      // 書き込み数そのものは変わらない。ただしネットワーク往復と失敗時の原子性の観点で必須
```

**Note:** Firestore の課金単位は書き込みドキュメント数なので batch にしても書き込みコスト自体は減らない。減るのはクライアント側の待ち時間と部分失敗リスク。**書き込み数を減らす本丸は §12-2（明示的確定ボタン）**。

### 12-2. 明示的な確定ボタンで書き込む（debounceなし）

スライダー操作ごとの自動保存（debounce 500ms）も検討したが、**確定ボタン方式を採用**する。

- **quota 安全性**: 1入力=1書き込みに確定。debounce だと入力途中のゴースト書き込みや「flush し忘れ」のリスクがゼロにはならない
- **誤入力防止**: ユーザーが意図的に保存するので、スライダーを触り損ねて保存される事故が起きない
- **実装の単純化**: ページ離脱・アンマウント時の flush 処理、debounce のテスト、フック責務の曖昧さがすべて不要

**実装指針:**
- `FatigueSlider` は内部ローカル state で値を保持（未保存状態）
- `[確定]` ボタン押下時にのみ `useSaveFatigue` を呼ぶ
- 保存中は確定ボタンを disabled + スピナー表示

```typescript
// FatigueSlider.tsx 内
const [draft, setDraft] = useState(initialValue);
const { mutate: save, isPending } = useSaveFatigue();

return (
  <>
    <input type="range" value={draft} onChange={(e) => setDraft(+e.target.value)} />
    <button onClick={() => save({ muscleId, value: draft })} disabled={isPending}>
      確定
    </button>
  </>
);
```

### 12-3. TanStack Query の staleTime 設定

不要な再フェッチを抑えることで「読み取り quota」も節約。

| クエリ | staleTime | 根拠 |
|--------|-----------|------|
| `queryKeys.fatigue.current` | **5分** | クライアント側 §12-5 で 1分ごとに減衰再計算するので、Firestore 同期は 5分で十分。ユーザー保存時は `invalidateQueries` で即反映される |
| `queryKeys.fatigue.history` | 5分 | 履歴は頻繁に変わらない。保存時のみ `invalidateQueries` |
| `queryKeys.exercises.list` | 24時間 | 種目カタログはほぼ不変、実質キャッシュ永続 |
| `queryKeys.workout.history` | 5分 | 保存時のみ `invalidateQueries` |

**背景:** 初版では `fatigue.current` を 30秒に設定していたが試算すると **32 reads/分 × 8h ≈ 15,360 reads/日（1ユーザー）** となり、free tier 50k/日 は 3ユーザーで到達する。再設計の動機そのものに反する数値設定だったため、5分に伸ばし + §12-5 のクライアント側減衰計算を併用する方針に変更。

**補足:** `refetchOnWindowFocus: false` を QueryClient のデフォルトに設定（タブ切替ごとの再フェッチを抑止）。

### 12-4. 読み取りクエリの最適化

- `GET /api/fatigue/current` は「筋肉ごとの最新1件」が必要だが、Firestore は `DISTINCT ON` が無いので工夫が必要
- アプローチA（推奨）: 各筋肉の最新スナップショット1件を `limit(1)` で取得（16回 × 1 read = 16 reads）。**§4-3 と同様に `Promise.all` で並列実行する**（シリアルにすると 16RTT になるため）
- アプローチB: 直近N件を一括取得してアプリ側でグループ化（読取 read 数は増える可能性あり）
- アプローチC: 別コレクション `users/{uid}/fatigueCurrent/{muscleId}` を denormalized として維持（書き込みが増える代わりに読取は1回）

**初期実装はAで十分。読取コストが問題になればCへの移行を検討。**

### 12-5. クライアント側での減衰再計算（quota 節約の主戦略）

**考え方:** サーバーは「生のスナップショット（savedValue + recordedAt）」を返すだけでよい。回復計算はクライアント側で時計の tick に合わせて回す。Firestore read を増やさずに UI のリアルタイム性を担保できる。

**利点:**
- staleTime を長く取っても、体図の色が「時間経過で徐々に緑に戻る」挙動は自然に維持される
- 1分ごとの再計算でも Firestore read はゼロ（純粋関数 `applyDecay` の再評価のみ）
- 複数タブを開いていても read 増加しない

**実装指針:**

```typescript
// src/hooks/useFatigueWithDecay.ts
export function useFatigueWithDecay() {
  const { data } = useQuery({
    queryKey: queryKeys.fatigue.current,
    queryFn: fetchCurrentFatigue,
    staleTime: 5 * 60 * 1000,
  });

  // 1分ごとの再描画トリガー（Firestore には触れない）
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  // data と tick から毎回再計算（純粋関数 applyDecay の再評価のみ）
  return useMemo(() => {
    if (!data) return null;
    const now = new Date();
    const result = {} as CurrentFatigueMap;
    for (const [muscleId, raw] of Object.entries(data) as [MuscleId, CurrentFatigueEntry][]) {
      const recordedAt = new Date(raw.recordedAt);
      result[muscleId] = {
        savedValue: raw.savedValue,
        currentValue: applyDecay(raw.savedValue, recordedAt, muscleId, now),
        recordedAt: raw.recordedAt,
        recoveryHoursRemaining: calcRecoveryHoursRemaining(raw.savedValue, recordedAt, muscleId, now),
      };
    }
    return result;
  }, [data, tick]);
}
```

**API レスポンス整合性:** `GET /api/fatigue/current` は引き続き `currentValue`・`recoveryHoursRemaining` も返す（サーバー計算は「初回表示の一貫性確認」とテスト用途で維持）。クライアントは受け取った `savedValue` + `recordedAt` から再計算する。

---

## 13. 種目カタログの初期データ ★新規追加（レビュー #4 反映）

### 13-1. シードデータ

**ファイル: `data/exercises.json`**

```json
[
  { "id": "bench_press",      "nameJa": "ベンチプレス",       "nameEn": "bench_press",
    "primaryMuscles": ["chest", "triceps"], "secondaryMuscles": ["shoulders"] },
  { "id": "squat",            "nameJa": "スクワット",         "nameEn": "squat",
    "primaryMuscles": ["thighs"],           "secondaryMuscles": ["calves", "abs"] },
  { "id": "deadlift",         "nameJa": "デッドリフト",       "nameEn": "deadlift",
    "primaryMuscles": ["back", "thighs"],   "secondaryMuscles": ["forearms"] },
  { "id": "overhead_press",   "nameJa": "オーバーヘッドプレス", "nameEn": "overhead_press",
    "primaryMuscles": ["shoulders"],        "secondaryMuscles": ["triceps"] },
  { "id": "lat_pulldown",     "nameJa": "ラットプルダウン",   "nameEn": "lat_pulldown",
    "primaryMuscles": ["back"],             "secondaryMuscles": ["biceps"] },
  { "id": "bicep_curl",       "nameJa": "バイセップカール",   "nameEn": "bicep_curl",
    "primaryMuscles": ["biceps"],           "secondaryMuscles": ["forearms"] },
  { "id": "tricep_extension", "nameJa": "トライセップエクステンション", "nameEn": "tricep_extension",
    "primaryMuscles": ["triceps"],          "secondaryMuscles": [] },
  { "id": "leg_press",        "nameJa": "レッグプレス",       "nameEn": "leg_press",
    "primaryMuscles": ["thighs"],           "secondaryMuscles": ["calves"] },
  { "id": "calf_raise",       "nameJa": "カーフレイズ",       "nameEn": "calf_raise",
    "primaryMuscles": ["calves"],           "secondaryMuscles": [] },
  { "id": "crunch",           "nameJa": "クランチ",           "nameEn": "crunch",
    "primaryMuscles": ["abs"],              "secondaryMuscles": [] },
  { "id": "neck_extension",   "nameJa": "ネックエクステンション", "nameEn": "neck_extension",
    "primaryMuscles": ["head"],             "secondaryMuscles": [] }
]
```

初期11種目（`head` 筋肉を使う種目を1つ含む。以前は10種のうち head を使う種目がなく `head` が「マップに存在するが入力不可」な状態だったため補完）。後から手動追加 or 別スクリプトで拡張可。

### 13-2. シードスクリプト

**ファイル: `scripts/seedExercises.ts`**

```typescript
// Firebase Admin SDK で data/exercises.json を読み込み、
// exercises/{id} コレクションに upsert する
// §19-2 の singleton (adminDb) を直接 import する
import { adminDb } from '../src/lib/firebase/admin';
import exercises from '../data/exercises.json';

async function main() {
  const batch = adminDb.batch();
  for (const ex of exercises) {
    const ref = adminDb.collection('exercises').doc(ex.id);
    batch.set(ref, ex);
  }
  await batch.commit();
  console.log(`Seeded ${exercises.length} exercises.`);
}

main().catch(e => { console.error(e); process.exit(1); });
```

**実行:**
```bash
npm run seed:exercises
# package.json: "seed:exercises": "tsx scripts/seedExercises.ts"
```

初回デプロイ前に1回実行すれば十分。

---

## 14. タイムゾーン方針 ★新規追加（レビュー #6 反映）

### 方針

| レイヤー | 扱い |
|----------|------|
| Firestore | UTC（`Timestamp` 型はUTC扱い）。全タイムスタンプはUTCで保存 |
| API レスポンス | ISO 8601 の UTC 形式（`...Z` 末尾）で返す |
| UI 表示 | JST（Asia/Tokyo）固定 |

### 根拠

- 日本語アプリなので JST 固定が自然
- ブラウザロケール依存にすると「23:30 に保存 → UTC 14:30 保存 → 翌日扱いされる」等の混乱が起きる

### 実装

**ファイル: `src/lib/date/format.ts`**

```typescript
import { formatInTimeZone } from 'date-fns-tz';

const TZ = 'Asia/Tokyo';

export function formatJstDate(iso: string): string {
  return formatInTimeZone(new Date(iso), TZ, 'yyyy-MM-dd');
}

export function formatJstDateTime(iso: string): string {
  return formatInTimeZone(new Date(iso), TZ, 'yyyy-MM-dd HH:mm');
}

export function formatJstTime(iso: string): string {
  return formatInTimeZone(new Date(iso), TZ, 'HH:mm');
}
```

S03 の日付グルーピング（「2026-04-23」）は `formatJstDate(performedAt)` でキー化。

---

## 15. 認証ミドルウェア共通化 ★新規追加（レビュー #8 反映）

全APIルートで Firebase IDトークン検証を繰り返すのは冗長かつ忘れやすい。ヘルパー関数で共通化する。

**ファイル: `src/lib/auth/verifyUser.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase/admin';  // §19-2 の singleton
import { handleFirebaseError } from '@/lib/firebase/errorHandler';

export class UnauthorizedError extends Error {
  constructor(message = 'Unauthorized') { super(message); }
}

// Bearer トークンを検証し、uid を返す。失敗時は UnauthorizedError を投げる。
export async function verifyUser(req: NextRequest): Promise<{ uid: string }> {
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    throw new UnauthorizedError('Missing Bearer token');
  }
  const idToken = authHeader.substring(7);
  const decoded = await adminAuth.verifyIdToken(idToken);
  return { uid: decoded.uid };
}

// API ルートの共通ラッパー。認証・エラーハンドリングをまとめる。
export function withAuth<T>(
  handler: (req: NextRequest, ctx: { uid: string }) => Promise<T>
) {
  return async (req: NextRequest) => {
    try {
      const { uid } = await verifyUser(req);
      return await handler(req, { uid });
    } catch (err) {
      if (err instanceof UnauthorizedError) {
        return NextResponse.json({ error: err.message, code: 'UNAUTHORIZED' }, { status: 401 });
      }
      // その他のエラーは 500 として返す（handleFirebaseError を再利用）
      return handleFirebaseError(err);
    }
  };
}
```

**使用例（各APIルートが1行で済む）:**

```typescript
// src/app/api/fatigue/current/route.ts
export const GET = withAuth(async (_req, { uid }) => {
  const data = await getCurrentFatigue(uid);
  return NextResponse.json({ data });
});
```

Next.js の Middleware ではなくヘルパー関数を使う理由: Middleware は Edge Runtime 前提で Firebase Admin SDK が使えない。Route Handler 内で Admin SDK を使えるヘルパーが自然。

---

## 16. 楽観的更新の詳細 ★新規追加（レビュー #7 反映）

`useSaveFatigue` のロールバック単位を筋肉単位に限定し、ある筋肉の保存失敗が他筋肉のキャッシュに影響しないようにする。

**ファイル: `src/hooks/useSaveFatigue.ts`**

```typescript
export function useSaveFatigue() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ muscleId, value }: { muscleId: MuscleId; value: number }) => {
      const res = await apiClient.post('/api/fatigue', { muscleId, value });
      return res.data.snapshot as FatigueSnapshot;
    },

    onMutate: async ({ muscleId, value }) => {
      // 関連クエリのみキャンセル
      await queryClient.cancelQueries({ queryKey: queryKeys.fatigue.current });

      // 現在のキャッシュ値をスナップショット（ロールバック用）
      const previous = queryClient.getQueryData<CurrentFatigueMap>(queryKeys.fatigue.current);

      // 楽観的に当該筋肉のみ更新
      queryClient.setQueryData<CurrentFatigueMap>(queryKeys.fatigue.current, (old) => ({
        ...old,
        [muscleId]: {
          savedValue: value,
          currentValue: value,  // 今保存したばかりなので減衰0
          recordedAt: new Date().toISOString(),
          recoveryHoursRemaining: MUSCLE_RECOVERY_HOURS[muscleId], // elapsed=0 なので残り=回復時間全体
        },
      }));

      // 失敗時のロールバックに必要な情報を context として返す
      return { previousEntry: previous?.[muscleId], muscleId };
    },

    onError: (_err, _vars, context) => {
      // 失敗した筋肉のキャッシュだけを元に戻す（他の筋肉は影響を受けない）
      if (context?.previousEntry) {
        queryClient.setQueryData<CurrentFatigueMap>(queryKeys.fatigue.current, (old) => ({
          ...old,
          [context.muscleId]: context.previousEntry,
        }));
      }
      toast.error('保存に失敗しました');
    },

    onSettled: (_data, _err, { muscleId }) => {
      // サーバー値で再フェッチして整合性を担保
      queryClient.invalidateQueries({ queryKey: queryKeys.fatigue.current });
      queryClient.invalidateQueries({ queryKey: queryKeys.fatigue.history(muscleId) });
    },
  });
}
```

**ポイント:**
- `onMutate` で部分的にキャッシュを更新（他筋肉は無変更）
- `onError` で当該筋肉のみロールバック
- `onSettled` でサーバー値に同期（別タブ・別端末の変更も取り込む）

### 16-2. POST /api/workout の楽観的更新（MVP は任意、v1.3 推奨）

`POST /api/workout` は最大16 reads + batch write で **300〜400ms** かかる。体感を軽くするには楽観的更新を入れる。

**MVP 方針:** 同期待ち + 保存中スピナー表示（300〜400ms はモーダル上で待てる範囲）。
**v1.3 方針:** 以下のパターンで楽観的更新を入れる。

```typescript
// src/hooks/useWorkout.ts（抜粋）
return useMutation({
  mutationFn: async (input: WorkoutSessionInput) => {
    const res = await apiClient.post('/api/workout', input);
    return res.data as WorkoutSaveResult;
  },

  onMutate: async (input) => {
    await queryClient.cancelQueries({ queryKey: queryKeys.fatigue.current });

    // クライアント側で impacts を計算（サーバーと同じ fatigueImpact.ts を使う）
    const predictedImpacts = mergeImpacts(
      input.exercises.map(ex =>
        computeFatigueImpact(findExercise(ex.exerciseId), ex.sets, ex.reps)
      )
    );

    const previous = queryClient.getQueryData<CurrentFatigueMap>(queryKeys.fatigue.current);

    // 現在値（減衰済み）+ predicted delta で即座に書き換え、モーダルを閉じる
    queryClient.setQueryData<CurrentFatigueMap>(queryKeys.fatigue.current, (old) => {
      if (!old) return old;
      const next = { ...old };
      for (const [muscleId, delta] of Object.entries(predictedImpacts) as [MuscleId, number][]) {
        const current = old[muscleId].currentValue;
        const nextValue = Math.min(100, current + delta);
        next[muscleId] = {
          savedValue: nextValue,
          currentValue: nextValue,
          recordedAt: new Date().toISOString(),
          recoveryHoursRemaining: MUSCLE_RECOVERY_HOURS[muscleId],
        };
      }
      return next;
    });

    return { previous };
  },

  onError: (_err, _vars, context) => {
    if (context?.previous) {
      queryClient.setQueryData(queryKeys.fatigue.current, context.previous);
    }
    toast.error('ワークアウトの保存に失敗しました');
  },

  onSettled: () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.fatigue.current });
    queryClient.invalidateQueries({ queryKey: queryKeys.workout.history });
  },
});
```

**Why v1.3 に回すか:**
- MVP でもモーダル即閉じは気持ちよいが、クライアント側 `computeFatigueImpact` がサーバー実装と微妙にズレるとユーザーが「保存したら値が変わった」と感じる
- まずサーバー同期で動作確認し、計算が完全に一致していることを確認してから楽観的更新を導入する方が安全

---

## 17. UI 挙動の詳細 ★新規追加（レビュー 任意論点）

### 17-1. S02 ボトムバー（全筋肉の疲労バッジ）

左右ペア筋（12筋肉）をそのまま全部並べると視認性が悪い。以下の方針で集約表示:

- **論理グループ単位で1バッジ**（10個: head, chest, back, abs, shoulders, biceps, triceps, forearms, thighs, calves）
- 左右ペア筋は **max(左, 右)** を表示値とする
- バッジをクリックすると右パネルで対応筋肉に切り替わる
  - ペア筋は左側の MuscleId を選択（例: `shoulders_left`）。ユーザーは SVG 体図で左右を明確に選び直せる

```
ボトムバー例:
  胸部65%  背中40%  肩(max)55%  腕(max)80%  腹部30%  脚(max)70%  [すべてリセット]
```

### 17-2. リセット後の履歴グラフ挙動

`PUT /api/fatigue/reset` は全筋肉に value=0 のスナップショットを追加する。履歴チャートでは:

- リセット時刻にすべての筋肉で 80%→0% の「段差」が見える（これは意図通り。ユーザーに「リセットされた」ことが一目でわかる）
- 将来的に「リセット」専用の視覚マーカー（縦線）を入れても良いが MVP ではシンプルに段差表示のみ

### 17-3. M01 疲労値プレビューの表示形式

§7 の `WorkoutInputModal` コメント参照。**デルタ形式（+40%）で表示**する。

- 理由: 保存前なので「現在値→次の値」は流動的。デルタなら入力の直接的なフィードバック
- 100%上限のクランプはプレビュー段階では適用しない（「+70% されるが現在90%なので実際は+10%」の挙動は加算ロジック側に任せる）

### 17-4. S03 履歴カードの影響表示（ペア筋の集約）

S02 ボトムバーと同じ方針（§17-1）を適用:

- **論理グループ単位で集約表示**（例: 「太もも+50%」）。`太もも（左）+50%, 太もも（右）+50%` と両方出さない
- 表示値は **max(左, 右)** とする
- 実装: `fatigueImpacts` を `MuscleId → number` から `MuscleGroup → number` に変換するユーティリティ（`collapseToGroups`）をUI層で使う

**シグネチャ:**
```typescript
// src/lib/workout/collapseToGroups.ts
export function collapseToGroups(
  impacts: Partial<Record<MuscleId, number>>
): Partial<Record<MuscleGroup, number>> {
  const result: Partial<Record<MuscleGroup, number>> = {};
  for (const group of MUSCLE_GROUPS) {
    const ids = expandMuscleGroup(group);
    const values = ids.map(id => impacts[id] ?? 0);
    const max = Math.max(...values);
    if (max > 0) result[group] = max;
  }
  return result;
}
```

```
S03 履歴カード例:
  影響: 胸部+40%, 三頭筋+20%, 太もも+50%, ふくらはぎ+15%
```

### 17-5. SVG hitbox と MuscleId のマッピング

既存 `src/app/svg/MuscleMapOutline.tsx` の path データは廃棄して、以下の新構造で再整理:

**ファイル: `src/lib/fatigue/muscleSvgPaths.ts`**

```typescript
// 16 筋肉 × (前面/背面のどちらに表示するか) を一元管理
export interface MuscleSvgEntry {
  muscleId: MuscleId;
  view: 'front' | 'back';
  pathData: string;     // SVG <path> の d 属性値
  label: { x: number; y: number };  // ラベル表示位置
}

export const MUSCLE_SVG_PATHS: MuscleSvgEntry[] = [
  { muscleId: 'chest',            view: 'front', pathData: 'M ...', label: { x: 150, y: 120 } },
  { muscleId: 'shoulders_left',   view: 'front', pathData: 'M ...', label: { x: 100, y: 100 } },
  { muscleId: 'shoulders_right',  view: 'front', pathData: 'M ...', label: { x: 200, y: 100 } },
  // ... 16 件
];
```

- 既存 `MuscleDiagram.tsx` の座標を新 ID マッピングに読み替える移植作業が発生
- 移植時に「どの領域がどの ID か」を人手で確認する必要がある（実装フェーズで1度だけ実施）

---

## 18. 実装時のチェックリスト（詳細設計のレビュー #🔴 対応確認）

実装ブランチを切る前に以下がすべて 'Yes' になっていることを確認:

- [ ] §4-3 の加算ロジックが `applyWorkoutToFatigue` として実装されている
- [ ] `MUSCLE_IDS` が16筋肉に更新されている（`_left/_right` 対称）
- [ ] `MuscleGroup` 型と `expandMuscleGroup` が実装されている
- [ ] §12 の batch write が `reset` と `workout` で使われている
- [ ] §12-2 の方針に従い、スライダーは `[確定]` ボタン押下時のみ保存する（debounce 自動保存にしない）
- [ ] §12-5 の `useFatigueWithDecay` フックが実装され、1分ごとにクライアント側で再計算される
- [ ] §2 の `firestore.indexes.json` がデプロイされている（`firebase deploy --only firestore:indexes`）
- [ ] §13 の seed スクリプトが動き、`exercises` コレクションに初期データが入っている
- [ ] §14 のタイムゾーン方針に従い JST 表示が一貫している
- [ ] §15 の `withAuth` ラッパーが全APIルートで使われている
- [ ] §16 の楽観的更新が筋肉単位でロールバックする
- [ ] §17-5 の SVG hitbox マッピングが16筋肉で正しく対応している
- [ ] §19-1 のリージョン設定（Vercel `hnd1` + Firestore `asia-northeast1`）が一致している
- [ ] §19-2 の Firebase Admin SDK シングルトン実装になっている（Route Handler ごとに `initializeApp` を呼んでいない）

---

## 19. デプロイ環境 / レイテンシ最適化 ★新規追加（レビュー: リージョン + コールドスタート対策）

サーバー負荷自体は MVP として余裕だが、**リージョン設定と Admin SDK の初期化パターンを誤ると本番で 300〜1500ms 体感が悪化する**。両方ともコードで確定させる論点なので設計書に明記する。

### 19-1. リージョン設定

| 項目 | 設定値 | 根拠 |
|------|-------|------|
| Vercel デプロイリージョン | **`hnd1`（東京）** | 日本ユーザー前提。デフォルト `iad1`（米国バージニア）だと日米往復 +150ms が毎APIコールに乗る |
| Firestore ロケーション | **`asia-northeast1`（東京）** | Vercel と同一リージョン。リージョン内通信で <10ms |
| Next.js Route Handler | `runtime = 'nodejs'`（Edge にしない） | Firebase Admin SDK は Node.js 専用。Edge Runtime だと動かない |

**`vercel.json`:**
```json
{
  "regions": ["hnd1"]
}
```

**各 Route Handler の先頭（App Router の場合）:**
```typescript
export const runtime = 'nodejs';
export const preferredRegion = 'hnd1';
```

**Firestore プロジェクト作成時の注意:**
- `firebase projects:create --location=asia-northeast1` で明示指定、または Console で東京を選ぶ
- ロケーションは **後から変更不可**。誤って `nam5` で作ると新プロジェクトを切り直すしかない

**誤設定時のレイテンシ試算:**
| 設定 | GET /api/fatigue/current の体感 |
|------|------------------------------|
| 全て東京（推奨） | 150〜250ms |
| Vercel 米国 + Firestore 東京 | 450〜550ms（Vercel-Firestore 間で太平洋横断2回） |
| Vercel 米国 + Firestore 米国 | 400〜500ms（ブラウザ-Vercel 間で太平洋横断1回） |

### 19-2. Firebase Admin SDK のシングルトン化

Vercel の serverless は個人用アプリの低頻度アクセスで **毎リクエストがコールドスタート**になりがち。Admin SDK 初期化は 500〜1000ms、JWKS 初回取得は 200〜500ms かかるため、Route Handler ごとに `initializeApp` を呼ぶと初回コールが 1〜1.5秒遅くなる。

**ファイル: `src/lib/firebase/admin.ts`**

```typescript
import { getApps, initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

// モジュールレベルで1度だけ初期化。
// Next.js のホットリロード・Vercel の warm instance で再利用される。
const app =
  getApps()[0] ??
  initializeApp({
    credential: cert({
      projectId:   process.env.FIREBASE_PROJECT_ID!,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL!,
      privateKey:  process.env.FIREBASE_PRIVATE_KEY!.replace(/\\n/g, '\n'),
    }),
  });

export const adminAuth = getAuth(app);
export const adminDb   = getFirestore(app);
```

**Route Handler 側の使い方（1行 import するだけ）:**
```typescript
// src/app/api/fatigue/current/route.ts
import { adminDb } from '@/lib/firebase/admin';
import { withAuth } from '@/lib/auth/verifyUser';

export const runtime = 'nodejs';
export const preferredRegion = 'hnd1';

export const GET = withAuth(async (_req, { uid }) => {
  // adminDb をそのまま使う。initializeApp は呼ばない
  ...
});
```

**§15 との整合:** `verifyUser` は §19-2 の `adminAuth`（singleton）を直接 import して利用する形で統一済み。§15 のコード例も同じ import パターン（`import { adminAuth } from '@/lib/firebase/admin'` + `adminAuth.verifyIdToken(...)`）になっている。Route Handler で `getAdminAuth()` 関数を呼ぶパターンは使わない。

**環境変数（Vercel プロジェクト設定に追加）:**
- `FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY`（改行を `\n` でエスケープして保存）

### 19-3. レイテンシ試算（リージョン適正 + singleton 済みの状態）

| エンドポイント | 推定レイテンシ | 内訳 |
|-------------|-------------|------|
| `GET /api/fatigue/current` | 150〜250ms | 認証50 + 16 reads 並列150 |
| `POST /api/fatigue` | 100〜150ms | 認証50 + 1 write 50 |
| `POST /api/workout` | 300〜400ms | 認証50 + 16 reads 並列150 + batch write 150 |
| `PUT /api/fatigue/reset` | 150〜250ms | 認証50 + batch write 16件 150 |
| `GET /api/fatigue/history` | ~100ms | 認証50 + limit20 50 |
| `GET /api/workout/history` | ~100ms | 認証50 + limit10 50 |
| `GET /api/exercises` | ~100ms（実質 staleTime 24h でキャッシュ） | — |

`POST /api/workout` の 300〜400ms が UX 上やや重いが、MVP では保存中スピナーで許容。v1.3 で §16-2 の楽観的更新を導入して体感0msにする。

---

*次のフェーズ: 実装（ブランチ: ver2.0 → 新ブランチを切って開始）*
