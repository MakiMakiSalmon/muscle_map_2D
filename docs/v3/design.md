# 詳細設計 v3.0 — v2.0 設計書（design_detail.md）との差分

スコープ確定日: 2026-07-02
形式: **差分形式**。本書に記載のない節は v2.0 の [design_detail.md](../design_detail.md) がそのまま有効。節番号 D1〜D8 は本書の章、§n は v2.0 設計書の節を指す。
実装順序は [02_work-plan.md](./02_work-plan.md) §2 のブランチ計画に従う。本書は living document とし、実装中の仕様調整は該当節を更新してから実装する。

疲労値の記録は `recordedAt=performedAt`（保存時刻ではなくワークアウト実施時刻）で行う。減衰計算の起点が `recordedAt` であるため、performedAt で保存することで回復曲線が一貫する（`now` へ再減衰して保存すると以後の曲線がずれる）。これに伴う「順序逆転」への対処を D0 の不変条件として固定する。

---

## D0. v3.0 の不変条件（必ず仕様・テストで担保する）

以下は実装・レビュー・テストで**必達**の不変条件。各実装ブランチの完了条件に含め、対応するテストを必須（省略不可）とする。

| # | 不変条件 | 実装箇所 | 必須テスト |
|---|---------|---------|-----------|
| INV-1 | **current は「最大 recordedAt のスナップショット」のみを採用する。同一 recordedAt は `createdAt`（書き込み時刻）で決定する**（D2-0 タイブレーク）。ワークアウト・手動保存・リセットいずれの経路でも、既存 current より `(recordedAt, createdAt)` が新しい場合にのみ current を更新する | `buildCurrentMerge`（D4-4）。GET current・`getLatestSnapshot` も `(recordedAt DESC, createdAt DESC)` で解決 | `buildCurrentMerge` の Unit: 新しい方が採用／古い方は無視／**同一 recordedAt は createdAt で決定** |
| INV-2 | **順序逆転時に current を上書きしない。** performedAt が既存 current.recordedAt より前の遡及ワークアウトは、履歴（`fatigueSnapshots`）にのみ追加し、current は既存値を維持する（INV-1 の帰結） | `applyWorkoutToFatigue`（D4-1）＋ `buildCurrentMerge`（D4-4） | Unit: 順序逆転入力で「履歴に1件追加・current 不変」を検証 |
| INV-3 | **ワークアウト削除は「影響筋肉すべてで最新のセッション」のときのみ許可し、それ以外は 409 を返す。** 削除しても後続スナップショットに影響を残さない | `DELETE /api/workout/[id]`（D3） | API: 最新→削除成功＋current 直前値復元／新しい記録あり→409 |

これらは「絶対値スナップショット × 順序逆転」という単一の制約に由来する。将来フル・リプレイを導入すれば緩和できるが、v3.0 では上記で固定する。

---

## D1. 型定義の差分（対 §1）

### D1-1. ラベル変更（A5）

```typescript
// src/types/domain.ts
export const MUSCLE_LABELS: Record<MuscleId, string> = {
  head: '首',   // 変更: '頭部' → '首'（MuscleId は不変）
  // ... 他は変更なし
};
export const MUSCLE_GROUP_LABELS: Record<MuscleGroup, string> = {
  head: '首',   // 変更: '頭部' → '首'
  // ... 他は変更なし
};
```

### D1-2. RPE の追加（A4）

```typescript
export interface WorkoutExerciseInput {
  exerciseId: string;
  sets: number;
  reps: number | null;
  weightKg: number | null;
  rpe: number | null;        // 追加: 主観的強度 1〜10 の整数。null = 未入力（係数 1.0）
}
```

### D1-3. セッションへの疲労インパクト永続化（A3）

```typescript
export interface WorkoutSession {
  id: string;
  performedAt: string;
  exercises: WorkoutExerciseInput[];
  // 追加: 保存時に計算した「減衰前の生デルタ」。v3.0 以降のセッションのみ存在。
  // 欠落時（v2.0 期のセッション）はクライアント側で従来どおり再計算して表示する
  fatigueImpacts?: Partial<Record<MuscleId, number>>;
}
```

### D1-4. API DTO 型の分離（D2 / P1-2）

**ファイル: `src/types/api.ts`（新規）**

原則: **`Date` 型を含む型はサーバー内部専用。ワイヤを越える型は api.ts の Dto（日時は ISO 8601 UTC 文字列）**。`CurrentFatigueEntry` / `CurrentFatigueMap` は既に文字列ベースのため domain.ts に残置する。

```typescript
import type { MuscleId } from './domain';
import type { WorkoutExerciseInput, WorkoutSession } from './domain';

// GET /api/fatigue/history のレスポンス要素（FatigueSnapshot のワイヤ表現）
export interface FatigueSnapshotDto {
  id: string;
  muscleId: MuscleId;
  value: number;
  recordedAt: string;                 // ISO 8601 UTC（domain の Date と区別）
  createdAt: string;                  // ISO 8601 UTC（D2-0 タイブレーク・並び安定用。フィールド追加はブランチ6）
  source: 'manual' | 'workout';
  workoutSessionId: string | null;
}

// WorkoutSession はもともと performedAt: string のため Dto を兼ねる（別名 export で意図を明示）
export type WorkoutSessionDto = WorkoutSession;

export interface WorkoutHistoryResponse {
  sessions: WorkoutSessionDto[];
  nextCursor: string | null;
}
```

`useFatigue.ts` の `fetchFatigueHistory` 戻り型を `FatigueSnapshotDto[]` に修正し、`FatigueHistoryChart` の `Date | string` 両対応（防御コード）を string 前提に整理する。

ドメイン型 `FatigueSnapshot`（`src/types/domain.ts`）にも `createdAt: Date` を追加する（`getLatestSnapshot` が `(recordedAt, createdAt)` タプルで最新を決めるため）。`FatigueSnapshotInput` にも `createdAt: Date` を含める。

---

## D2. Firestore スキーマ・Rules の差分（対 §2）

### D2-0. `createdAt` タイブレークキー（P1-a 対応・INV-1/2/3 の前提）

A1 でワークアウトのスナップショットは `recordedAt = performedAt`（`datetime-local` 由来で**分精度**）になるため、同一筋肉を同じ分に複数回記録すると `recordedAt` が同値になり得る。この状態だと「最大 recordedAt」だけでは最新が一意に定まらず、`buildCurrentMerge`・`getLatestSnapshot`・削除判定の `orderBy('recordedAt','desc')` がどちらを採るか不定になる。

**対策**: `fatigueSnapshots` に **`createdAt: Timestamp`（サーバ書き込み時刻＝ハンドラの `now`。ミリ秒精度）を必須フィールドとして追加**し、**すべての「最新」解決を `(recordedAt DESC, createdAt DESC)` の 2 段ソートで行う**。`createdAt` は書き込み順を表すため、同一 `recordedAt`（同じ実施分）内では「後に記録したものが新しい」という直感どおりに決まる。

- 対象フィールド追加: `fatigueSnapshots.createdAt`（manual / workout / reset すべての書き込みで設定）
- 対象クエリ（すべて 2 段ソート）: `getLatestSnapshot`（D4-1）、`GET /api/fatigue/history` の並び、`DELETE` の直近2件取得（D3）
- current ミラー（D2-1）にも `createdAt` を保持し、`buildCurrentMerge`（D4-4）は `(recordedAt, createdAt)` タプルで比較する
- **複合インデックス変更**（`firestore.indexes.json`）:
  `fatigueSnapshots: (muscleId ASC, recordedAt DESC, createdAt DESC)` に拡張する（既存の `(muscleId, recordedAt)` を置き換え）
- 導入ブランチ: フィールドと index、`getLatestSnapshot` の 2 段ソートは**ブランチ6（A1）**で導入（performedAt により衝突が発生し得るため）。current ミラーへの `createdAt` 反映と `buildCurrentMerge` のタプル比較は**ブランチ9（C1）**。DELETE の 2 段ソートは**ブランチ17**。

### D2-1. 現在疲労値の単一ドキュメント（C1）

```
users/{uid}/state/fatigueCurrent          # 単一ドキュメント（コレクション state に doc ID 固定 "fatigueCurrent"）
├── muscles: map
│     {muscleId}: {
│        value: number            # 保存時点の疲労値（減衰は読み取り側で計算）
│        recordedAt: Timestamp    # イベント時刻（workout は performedAt）
│        createdAt: Timestamp     # 書き込み時刻（recordedAt 同値時のタイブレーク＝D2-0）
│        source: "manual" | "workout"
│        workoutSessionId: string | null
│     }
└── updatedAt: Timestamp
```

- **単一 doc とした根拠**: Firestore の read 課金は返却ドキュメント数単位。筋肉ごとの 16 doc 構成では 1 クエリでも 16 reads。単一 doc なら 1 read。サイズは 16 筋肉 × 約 100B で上限 1MB に対し余裕。書き込みは個人利用で単一 doc の目安（秒間 1 sustained write）に届かない
- **意味論**: `muscles[id]` は「その筋肉の最新スナップショット」のミラー。減衰計算は従来どおり読み取り側（クライアント/サーバー）で行う
- **更新規則**: `fatigueSnapshots` への追記と**同一 batch** で `set(ref, { muscles: {...}, updatedAt }, { merge: true })`。原子性を担保し、二重管理の不整合を防ぐ
- **移行**: 不要（Q2: 本番データなし）。doc 欠落・エントリ欠落時は該当筋肉をデフォルト値（value 0）として扱い、初回書き込みで自然に生成される
- **インデックス**: current doc 自体は直接参照のみでインデックス不要。ただし `fatigueSnapshots` の複合インデックスは D2-0 のとおり `(muscleId ASC, recordedAt DESC, createdAt DESC)` へ拡張する

### D2-2. workoutSessions への追加フィールド（A3 / A4）

```
users/{uid}/workoutSessions/{sessionId}
├── performedAt: Timestamp
├── exercises: array [{ exerciseId, sets, reps, weightKg, rpe }]   # rpe 追加
└── fatigueImpacts: map { {muscleId}: number }                     # 追加（減衰前の生デルタ）
```

### D2-3. セキュリティルール（C2）

全操作が API（Admin SDK）経由のため、クライアント直接アクセスを全遮断する。Admin SDK はルールをバイパスするため API の動作に影響しない。

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // 種目カタログ: 現状維持（認証済み read のみ。ExerciseSearch 等は API 経由だが、
    // 公開読み取り専用データのため read 許可を残しても攻撃面にならない）
    match /exercises/{exerciseId} {
      allow read: if request.auth != null;
      allow write: if false;
    }
    // ユーザーデータ: クライアント直接アクセスを全遮断（v3.0 変更点）
    match /users/{uid}/{document=**} {
      allow read, write: if false;
    }
  }
}
```

デプロイ: main マージ時の deploy.yml による自動反映（Q1/Q9 の一括リリース方針）。旧ルールのままでも v3.0 アプリは全機能動作するため先行デプロイ不要。

---

## D3. API エンドポイントの差分（対 §3）

レスポンス形状は**既存フィールドを変更せず、追加のみ**（後方互換）。

### GET `/api/fatigue/current`【変更: 読み取り経路】

- `state/fatigueCurrent` を 1 read。`MUSCLE_IDS` 全 16 筋肉について、`muscles[id]` があれば従来どおり減衰計算、なければデフォルト（savedValue 0 / currentValue 0 / recoveryHoursRemaining 0）で補完
- レスポンス形状は不変。`getLatestSnapshot` の 16 並列クエリは廃止（履歴 API と削除 API でのみ継続使用）

### POST `/api/fatigue`【変更: batch 化】

- 単発 write → **batch**: ①スナップショット追記 ②`state/fatigueCurrent` の該当筋肉を merge 更新。レスポンス不変

### PUT `/api/fatigue/reset`【変更: current 併記】

- batch: 16 スナップショット追記 + `state/fatigueCurrent` を全筋肉 value 0 で set（merge 不要、全置換で可）。レスポンス不変

### POST `/api/workout`【変更: A1 / A3 / A4 / C1】

**バリデーション差分（zod）:**

| フィールド | 型 | 制約 |
|-----------|---|------|
| `exercises[].rpe` | integer \| null（省略時 null に正規化） | null または **1〜10** |

**処理フロー差分:**

1. 種目取得・生デルタ計算は従来どおり（ただし `computeFatigueImpact` に rpe を渡す — D4-2）
2. **A1**: スナップショット生成は D4-1 のモデル（既存値を performedAt まで減衰 → デルタ加算 → 100 クランプ → `recordedAt = performedAt`・`createdAt = now` で保存）。current 更新は `(recordedAt, createdAt)` 最大ルール（D4-4・D2-0）に従う
3. **C1**: 現在値の取得は `state/fatigueCurrent` の 1 read（16 クエリを廃止）
4. **A3**: セッション doc に `fatigueImpacts`（**減衰前の生デルタ** = レスポンスと同一値）を保存
5. batch: セッション + スナップショット群 + current merge を一括コミット

**レスポンス**: 不変（`fatigueImpacts` は従来どおり生デルタ。プレビュー表示との一致を維持）。

### GET `/api/workout/history`【変更: フィールド追加】

- 各セッションに `fatigueImpacts` を含める（doc に存在する場合のみ。v2.0 期のセッションは undefined）

### DELETE `/api/workout/[id]`【新規（B6）】

**設計上の制約（P1-b 対応）**: スナップショットは**絶対値**で、後続ワークアウトはその値を土台に計算されている（後続の手動保存は上書きなので影響しないが、区別せず保守的に扱う）。そのため、削除できるのは「影響筋肉すべてについて、そのセッションのスナップショットが最新である」場合に限定する。後続スナップショットの再計算（リプレイ）は複雑で MVP スコープ外とし、代わりに削除条件を制限する。想定用途は「直近に記録したワークアウトの取り消し」であり、この制限で実用上十分。

- **404**: セッションが存在しない場合
- **409 Conflict（`code: 'HAS_NEWER_SNAPSHOT'`）**: 影響筋肉のいずれかに、削除対象セッションのスナップショットより新しい `(recordedAt, createdAt)` のスナップショットが存在する場合
- **処理手順**（削除可能な場合）:
  1. セッション doc を取得（存在確認・なければ 404）
  2. `fatigueSnapshots` を `where('workoutSessionId', '==', id)` で取得。影響筋肉集合を得る（同一セッションは筋肉ごとに最大 1 スナップショット）
  3. 各影響筋肉で「削除対象を除く最新2件」を確認: `where('muscleId','==',X).orderBy('recordedAt','desc').orderBy('createdAt','desc').limit(2)`（D2-0 の 2 段ソート・複合インデックス）。先頭が削除対象**でない**（= より新しい記録がある）筋肉が 1 つでもあれば **409 で中断**
  4. 各影響筋肉の復元先を決定: 手順 3 で得た「削除対象の 1 つ前」のスナップショット。無ければデフォルト（value 0）
  5. **単一 batch**: セッション delete + 当該スナップショット delete + `state/fatigueCurrent` の影響筋肉を手順 4 の値へ更新
- **レスポンス 200**: `{ "deletedSessionId": string, "affectedMuscles": MuscleId[] }`
- **409 時のユーザー導線（UI）**: 「この記録より新しい記録があるため削除できません。手動調整または全リセットをご利用ください」と案内（Toast + モーダル内メッセージ）
- **副作用の注記**: 削除されたセッション ID を cursor に使っていたページネーションは無効になる（再取得でリカバリ、許容）

> 補足: A1（遡及記録）と本削除仕様は、いずれも「絶対値スナップショット × 順序逆転」に由来する同じ制約を共有する。将来フル・リプレイ（後続スナップショットの再計算）を導入すれば両方の制限を外せるが、v3.0 では扱わない。

### GET `/api/exercises`【変更: 全件モード】

- `q` 未指定時: `limit` パラメータの既定を撤廃し**全件返却**（カタログ件数の上限 200 件を仕様として定める。超過が見えたら再設計）
- `q` 指定時: 従来どおり prefix 検索 + limit（既定 20・最大 50）
- 名前解決用途（履歴・WorkoutTab）はクライアント側で全件キャッシュ（`queryKeys.exercises.all`・staleTime 24h）を用いる

---

## D4. ビジネスロジックの差分（対 §4）

### D4-1. 過去日時ワークアウトの減衰適用（A1・§4-3 の差し替え）

**モデル（正）**: ワークアウトは `performedAt` 時点で疲労を発生させる。したがって「①既存値を performedAt まで減衰 → ②デルタを加算して performedAt 時点で 100 クランプ → ③その値を performedAt に記録された値として保存」する。現在値・履歴は `recordedAt = performedAt` からの減衰として読み取り側で計算されるため、**保存時に now へ再減衰しない**（線形減衰では `recordedAt = now` で保存すると回復クロックが再スタートし、完全回復時刻を過大評価するため）。

```typescript
// src/lib/workout/applyWorkoutToFatigue.ts（v3.0 最終形 = C1 適用後）
export async function applyWorkoutToFatigue(
  uid: string,
  impacts: Partial<Record<MuscleId, number>>,
  workoutSessionId: string,
  db: Firestore,
  performedAt: Date,                 // 追加
  now = new Date(),
): Promise<FatigueSnapshotInput[]> {
  const current = await readFatigueCurrent(uid, db);   // C1: 1 read（D4-4）
  const snapshots: FatigueSnapshotInput[] = [];

  for (const [muscleId, delta] of Object.entries(impacts) as [MuscleId, number][]) {
    const entry = current?.muscles[muscleId];

    // ① 既存値を performedAt 時点まで減衰させて base を得る（now までではない）。
    //    entry.recordedAt > performedAt（後述の順序逆転）のときは applyDecay 内の
    //    Math.min(savedValue, ...) ガードにより base = entry.value にクランプされる。
    const baseAtPerformed = entry
      ? applyDecay(entry.value, entry.recordedAt, muscleId, performedAt)
      : 0;

    // ② performedAt 時点でデルタを加算し 100 でクランプ（← 修正点。従来はここを通していなかった）
    const combined = Math.min(100, baseAtPerformed + delta);

    // ③ combined を「performedAt に記録された絶対値」として保存。
    //    GET current / 履歴は recordedAt=performedAt から減衰を計算するため、
    //    now への再減衰は不要で、回復曲線もそのまま正しく延長される。
    //    combined が 0（既存 0 かつ delta 0）なら書き込み不要。
    if (combined === 0) continue;

    snapshots.push({
      muscleId,
      value: combined,
      recordedAt: performedAt,            // ← now ではなく performedAt（曲線を延長）
      createdAt: now,                     // 書き込み時刻。recordedAt 同値時のタイブレーク（D2-0）
      source: 'workout',
      workoutSessionId,
    });
  }
  return snapshots;
}
```

（`getLatestSnapshot` は `where('muscleId','==',X).orderBy('recordedAt','desc').orderBy('createdAt','desc').limit(1)` に変更。複合インデックスは D2-0 のとおり。）

**検算（レビュー指摘の例）**: 既存 80% / 回復 48h、ワークアウト +40 を 24h 前（performedAt）に記録。
- ① baseAtPerformed = 80（既存値の recordedAt = performedAt なら減衰 0）
- ② combined = min(100, 80 + 40) = **100**（クランプが効く）
- 現在値（GET current）= applyDecay(100, performedAt, 48h, now=+24h) = 100 × (1 − 24/48) = **50%** ✓（従来式の 60% は誤り）

**fatigueCurrent の更新（順序逆転の扱い）**: 書き込み側（`buildCurrentMerge`・D4-4）は筋肉ごとに **`(recordedAt, createdAt)` が最大のスナップショットを current とする**（D2-0 タイブレーク）。したがって:
- 通常ケース（新スナップショットの `(recordedAt, createdAt)` が既存 current 以上、＝「昨晩のトレを翌朝記録」や同分の追記）: 新スナップショットが最新となり current を更新。
- 順序逆転（影響筋肉に `performedAt` より新しい記録が既にある）: 新スナップショットは **履歴（fatigueSnapshots）にのみ追加**し、current は既存の新しい値を維持する。この場合、遡及ワークアウトは current に反映されない（**既知の割り切り**。D3 のワークアウト削除と同じ「絶対値スナップショット × 順序逆転」制約に由来する）。

**境界条件（確定）:**

| performedAt | 挙動 |
|-------------|------|
| now（即時記録） | baseAtPerformed = 現在値、combined を now に記録（従来どおり満額加算・クランプあり） |
| now + 5分以内（zod 許容範囲） | performedAt ≈ now として同上（`applyDecay` のクランプで減衰 0） |
| 過去（回復時間内・順序逆転なし） | 上記モデルどおり。current は performedAt から減衰して表示 |
| 過去（回復時間超） | current 読み取り時に 0 まで減衰（履歴には残る）。current 更新は `(recordedAt, createdAt)` 最大ルールに従う |
| 同一分に同筋肉を複数記録（recordedAt 同値） | `createdAt`（書き込み順）で後勝ち＝2 回目が current。D2-0 タイブレーク |
| 順序逆転（新しい記録が既存） | 履歴のみ追加、current は据え置き（既知の割り切り） |

**注**: ブランチ 6（A1）の時点では現在値 read は従来の `getLatestSnapshot`（筋肉ごと最新 = `(recordedAt, createdAt)` 最大。2 段ソート＋複合インデックスを本ブランチで導入）。ブランチ 9（C1）で `readFatigueCurrent` + `buildCurrentMerge`（`(recordedAt, createdAt)` 最大ルール）に差し替える。

### D4-2. RPE 係数（A4・§4-2 の拡張）

```typescript
// src/lib/workout/fatigueImpact.ts
export function computeFatigueImpact(
  exercise: Exercise,
  sets: number,
  reps: number | null,
  rpe: number | null = null,         // 追加
): Partial<Record<MuscleId, number>> {
  const effectiveReps = reps ?? 10;
  const volume = sets * effectiveReps;
  const baseVolume = 30;
  const intensityFactor = rpe == null ? 1.0 : 0.6 + rpe * 0.06;  // RPE1=0.66, RPE10=1.2

  const primaryDelta   = Math.min(80, Math.round(40 * (volume / baseVolume) * intensityFactor));
  const secondaryDelta = Math.min(40, Math.round(20 * (volume / baseVolume) * intensityFactor));
  // 以降は従来どおり（expandMuscleGroup で展開して加算）
}
```

- 未入力（null）= 1.0 で **v2.0 と完全互換**（既存テストの期待値は不変）
- 係数は調整前提の初期値。変更時は A3 により過去履歴の表示に影響しない

### D4-3. 「今日のおすすめ」判定（B5・新規）

```typescript
// src/lib/fatigue/recommend.ts（新規・純粋関数）
const RECOMMEND_THRESHOLD = 30;   // currentValue がこの値未満なら「回復済み」

// グループ値はボトムバー（§17-1）と同じ max(左, 右) 集約
export function getRecommendedGroups(map: CurrentFatigueMap): MuscleGroup[] {
  return MUSCLE_GROUPS.filter((group) =>
    Math.max(...expandMuscleGroup(group).map((id) => map[id]?.currentValue ?? 0))
      < RECOMMEND_THRESHOLD
  );
}
```

### D4-4. 現在値ドキュメントのヘルパー（C1・新規）

```typescript
// src/lib/fatigue/currentDoc.ts（新規）
// - readFatigueCurrent(uid, db): doc を 1 read。欠落時は null（呼び出し側でデフォルト補完）
// - buildCurrentMerge(existing, snapshots): 既存 current と新スナップショット群から
//     merge 用の { muscles: {...}, updatedAt } を構築する。
//     筋肉ごとに (recordedAt, createdAt) が最大のものを current とする（D2-0 タイブレーク）。
//       比較: a が新しい ⇔ a.recordedAt > b.recordedAt
//              || (a.recordedAt == b.recordedAt && a.createdAt > b.createdAt)
//     → performedAt 遡及ワークアウト（D4-1）で既存 current の方が新しい場合、その筋肉は
//       既存値を維持し、遡及分は履歴（fatigueSnapshots）にのみ残る。
//     manual 保存・reset は recordedAt=now なので常に current を更新する。
//     current ミラーにも createdAt を保存する（次回比較のため）。
// - batch への組み込みは各 Route Handler 側で行う（batch.set(ref, merge, { merge: true })）
```

---

## D5. 状態管理・フックの差分（対 §5・§6・§16）

### D5-1. Toast キュー（B2）

```typescript
// src/stores/uiStore.ts に追加
interface ToastItem { id: number; type: 'error' | 'success'; message: string }
// toasts: ToastItem[] / pushToast(type, message) / dismissToast(id)
// 表示は 4 秒で自動消滅（初期値・調整可）。同時表示は最新 3 件まで
```

- `useSaveFatigue` / `useResetFatigue` / `useWorkout` / `useDeleteWorkout` の `onError` で `pushToast('error', ...)` を呼ぶ（ロールバック処理は現行維持）

### D5-2. useFatigueWithDecay の返却形（B2）

- 現行 `CurrentFatigueMap | null` → `{ data: CurrentFatigueMap | null; isError: boolean; refetch: () => void }` に変更し、ダッシュボードでエラー UI（メッセージ + 再試行）を出せるようにする。401 検知時は `/login` へ誘導

### D5-3. ワークアウト楽観的更新（B4・§16-2 の実施）

- v2.0 設計 §16-2 のパターンを採用。予測は **D4-1 と同一の計算**でなければ「保存後に値が跳ねる」ため、キャッシュの `savedValue` + `recordedAt` から再現する:
  ```
  baseAtPerformed = applyDecay(entry.savedValue, entry.recordedAt, muscleId, performedAt)
  combined        = min(100, baseAtPerformed + rawDelta)
  predictedNow    = applyDecay(combined, performedAt, muscleId, now)  // 表示用の currentValue
  ```
  （`CurrentFatigueEntry` は `savedValue` と `recordedAt` を保持しているのでクライアントで正確に再現できる）
- サーバーと同一の純粋関数（`computeFatigueImpact`・`mergeImpacts`・`applyDecay`）を使い、`onSettled` の invalidate で必ず収束。順序逆転ケース（D4-1）はサーバーが履歴のみ更新するため、`onSettled` 後に予測が取り消されることがある点は許容（まれ）

### D5-4. クエリキー追加

```typescript
exercises: {
  list: (q: string) => ['exercises', q] as const,
  all:               ['exercises', 'all'] as const,   // 追加: 名前解決用の全件キャッシュ（staleTime 24h）
},
```

- `useDeleteWorkout`（新規）: 成功時に `fatigue.current`・`workout.history`・影響筋肉の `fatigue.history` を invalidate

---

## D6. UI の差分（対 §7・§17）

### D6-1. レスポンシブレイアウト（B1・Q7: レスポンシブのみ）

```
モバイル（< md / 基準 375px）:
┌────────────────────────┐
│ Header（現行・displayName は非表示済み） │
│ RecommendBanner（B5）   │
│ [前面|背面] トグル       │
│ SVG 体図（幅いっぱい）   │
│ 色凡例                  │
│ ┌─ タブ: 疲労入力|履歴|トレーニング ─┐ │
│ │ パネル（縦積み・スクロール）        │ │
│ └──────────────────────┘ │
│ BottomBar（バッジ横スクロール）│
└────────────────────────┘
- M01/M02 モーダルは全画面シート（inset-0・上部にタイトル+閉じる）
- md 以上: 現行 2 カラム + 通常モーダルを維持
```

- `Modal` に focus trap を実装（Tab/Shift+Tab をモーダル内で循環、閉時に呼び出し元へフォーカス復帰）— G5 解消
- ログイン: `signInWithPopup` 失敗（`auth/popup-blocked` 等）時に `signInWithRedirect` へフォールバック

### D6-2. 履歴チャート v2（B3）

- X 軸 = 実時間（既定: 直近 7 日、右端 = now）、Y 軸 = 0〜100%
- スナップショット点を結ぶステップ折れ線（保存値ベース）+ 最新点から「現在の減衰値 → 完全回復時刻（値 0）」への予測破線
- リセット（value 0 保存）は段差として自然に表現される（§17-2 の方針維持）
- 座標計算は `src/lib/fatigue/chartGeometry.ts`（純粋関数）に分離してユニットテスト対象とする
- 縮退: 記録 0 件 = 「記録がありません」、1 件 = 点 + 予測破線のみ

### D6-3. その他 UI

| 項目 | 内容 |
|------|------|
| RecommendBanner（B5） | ダッシュボード上部。回復済みグループをバッジ表示、タップで該当筋肉（ペア筋は左）を選択。0 件時は「今日は休養日 💤」表示 |
| ExerciseRow（A4） | RPE 入力（1〜10 のセレクト、既定「未入力」）。プレビューは rpe 込みで再計算 |
| SessionCard（B6） | 削除ボタン → 確認モーダル（共通 `Modal` 再利用）→ `useDeleteWorkout`。409（新しい記録あり）時は「削除できない」案内を表示 |
| 履歴ページ（A3） | `fatigueImpacts` があれば保存値で表示、なければ従来のクライアント再計算（フォールバック） |
| 日時初期値（P0-1） | `datetime-local` の初期値はローカル時刻で組み立てる純粋関数 `toDatetimeLocalValue(date)` に切り出し |
| ラベル（A5） | `MUSCLE_LABELS` 経由のため UI コード変更不要（定数変更のみで「首」が反映される） |

---

## D7. テスト計画の差分（対 §10）

既存 20 ファイル・約 108 ケースは全て維持（退行ゲート）。追加テスト対象:

| 対象 | 種別 | 優先度 | 確認内容 |
|------|------|--------|---------|
| `applyWorkoutToFatigue`（A1） | Unit | 高 | performedAt 時点クランプの検算（80%+40→24h前→現在50%）・now/+5分・過去・順序逆転（履歴のみ）・combined 0 スキップ |
| `buildCurrentMerge`（C1/A1） | Unit | 高 | `(recordedAt, createdAt)` 最大ルール（遡及分は current を上書きしない・manual/reset は常に上書き・**同一 recordedAt は createdAt で決定＝D2-0**） |
| `getLatestSnapshot` タイブレーク（D2-0） | Unit | 高 | 同一 recordedAt の 2 件で createdAt の大きい方が最新になる |
| `computeFatigueImpact`（A4） | Unit | 高 | rpe null = 従来値と一致・rpe 1/10 の境界・上限クランプ |
| `recommend.ts`（B5） | Unit | 高 | 閾値境界（29/30）・左右非対称の max・0 件 |
| `chartGeometry.ts`（B3） | Unit | 高 | 時間→座標変換・予測破線の終点・縮退（0/1 件） |
| `currentDoc.ts` + 各 Route（C1） | Unit/API | 高 | 3 書き込み経路の batch 内容（snapshot + current 同時）・doc 欠落時のデフォルト補完 |
| `DELETE /api/workout/[id]`（B6） | API | 高 | 404・**409（より新しい記録あり・同一 recordedAt で createdAt がより新しい場合も含む）**・スナップショット削除・current が直前値へ復元・batch 原子性 |
| `toDatetimeLocalValue`（P0-1） | Unit | 高 | TZ 固定（JST）での初期値 |
| Toast / エラー UI（B2） | Component | 高 | MSW 500/401 → 通知表示・再試行・ロールバック共存 |
| `FatigueSlider` 初期値（A2） | Component | 高 | currentValue 初期化・tick 中の draft 維持・保存後の再初期化 |
| `useWorkout` 楽観的更新（B4） | Hook | 中 | 予測値 = サーバー計算・失敗ロールバック |
| フォールバック表示（A3） | Component | 中 | fatigueImpacts あり/なしの分岐 |
| Modal focus trap（B1） | Component | 中 | Tab 循環・フォーカス復帰 |
| E2E スモーク（D3） | E2E | 中 | ログイン→保存→色変化→記録→履歴の 1 本道（chromium のみ） |

**D0 不変条件のテストは省略不可**: 上表の `applyWorkoutToFatigue`（順序逆転＝INV-2）・`buildCurrentMerge`（最大 recordedAt＝INV-1）・`DELETE /api/workout/[id]`（最新限定＋409＝INV-3）の各ケースは D0 の必達条件であり、該当ブランチのマージ条件とする。

**E2E（Playwright）方針**: `test/e2e-smoke` ブランチ内で `@playwright/test` を devDependency 追加（採用確定済み: Q6）。認証は Firebase Auth エミュレータ or テスト用カスタムトークンのどちらかを着手時に PoC で決定し、本節を更新してから本実装する。CI では PR 時にスモークのみ・リトライ 1 回・5 分以内を目標。

---

## D8. CI/CD・運用の差分（対 §11・§19）

### D8-1. CI（D1）

```yaml
# .github/workflows/ci.yml 差分
on:
  push:
    branches: [main, ver3.0]   # 変更: ver2.0（凍結）を外し ver3.0 を追加
  pull_request:
```

E2E 導入後（ブランチ 18）に `e2e` ジョブを追加（`verify` と並列、chromium のみ）。

### D8-2. デプロイ・リリース（Q1/Q9 反映）

- Vercel 本番 = **main のみ**。ver3.0 への push はプレビューデプロイのみで本番非影響
- `deploy.yml`（Firestore rules/indexes、main push 時）は現行維持。v3.0 の rules 変更（D2-3）は main マージ時に自動反映される
- **リリース手順**は [02_work-plan.md](./02_work-plan.md) Phase 6 を正とする

### D8-3. 統合検証の手動チェックリスト（Phase 6 で使用）

- [ ] Google ログイン（ポップアップブロック環境で redirect フォールバック）
- [ ] 体図クリック → パネル表示値とスライダー位置が一致 → 確定 → 色変化・Toast なし（成功時）
- [ ] ネットワーク遮断状態で確定 → エラー Toast + 値ロールバック
- [ ] ワークアウト記録（即時日時）→ 体図即時反映（楽観的更新）→ 履歴に fatigueImpacts 表示
- [ ] ワークアウト記録（昨日の日時）→ 減衰済みの加算値になっている
- [ ] RPE あり/なしでプレビューと保存結果が一致
- [ ] セッション削除 → 履歴から消え、体図の色が直前状態に戻る
- [ ] すべてリセット → 全バッジ 0%・履歴に段差
- [ ] 履歴チャート: 時間軸・回復予測破線・リセット段差
- [ ] おすすめバナー: 回復済みグループの表示・タップで選択
- [ ] 375px 幅（実機 or DevTools）で上記すべて操作可能
- [ ] 「首」ラベルが体図・ボトムバー・パネルに反映
- [ ] `GET /api/fatigue/current` が 1 read であること（Firestore コンソールの使用量で確認）

---

*本書は v3.0 実装の単一ソース。無記載の設計は v2.0 [design_detail.md](../design_detail.md) を参照。実装中の仕様変更は本書を先に更新する（`docs/` 変更は実装コミットと分離する運用は v2.0 から継続）。*
