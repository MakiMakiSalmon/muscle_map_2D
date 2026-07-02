# 詳細設計 v3.0 — v2.0 設計書（design_detail.md）との差分

スコープ確定日: 2026-07-02
形式: **差分形式**。本書に記載のない節は v2.0 の [design_detail.md](../design_detail.md) がそのまま有効。節番号 D1〜D8 は本書の章、§n は v2.0 設計書の節を指す。
実装順序は [02_work-plan.md](./02_work-plan.md) §2 のブランチ計画に従う。本書は living document とし、実装中の仕様調整は該当節を更新してから実装する。

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

---

## D2. Firestore スキーマ・Rules の差分（対 §2）

### D2-1. 現在疲労値の単一ドキュメント（C1）

```
users/{uid}/state/fatigueCurrent          # 単一ドキュメント（コレクション state に doc ID 固定 "fatigueCurrent"）
├── muscles: map
│     {muscleId}: {
│        value: number            # 保存時点の疲労値（減衰は読み取り側で計算）
│        recordedAt: Timestamp
│        source: "manual" | "workout"
│        workoutSessionId: string | null
│     }
└── updatedAt: Timestamp
```

- **単一 doc とした根拠**: Firestore の read 課金は返却ドキュメント数単位。筋肉ごとの 16 doc 構成では 1 クエリでも 16 reads。単一 doc なら 1 read。サイズは 16 筋肉 × 約 100B で上限 1MB に対し余裕。書き込みは個人利用で単一 doc の目安（秒間 1 sustained write）に届かない
- **意味論**: `muscles[id]` は「その筋肉の最新スナップショット」のミラー。減衰計算は従来どおり読み取り側（クライアント/サーバー）で行う
- **更新規則**: `fatigueSnapshots` への追記と**同一 batch** で `set(ref, { muscles: {...}, updatedAt }, { merge: true })`。原子性を担保し、二重管理の不整合を防ぐ
- **移行**: 不要（Q2: 本番データなし）。doc 欠落・エントリ欠落時は該当筋肉をデフォルト値（value 0）として扱い、初回書き込みで自然に生成される
- **インデックス**: 追加不要（doc 直接参照のみ）。`firestore.indexes.json` は v2.0 のまま

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
2. **A1**: スナップショット生成時、デルタを `performedAt` 起点で減衰させてから現在値に加算（D4-1）。**減衰後デルタが 0 の筋肉はスナップショット・current 更新をスキップ**する（0 加算の無意味な書き込みを避ける）
3. **C1**: 現在値の取得は `state/fatigueCurrent` の 1 read（16 クエリを廃止）
4. **A3**: セッション doc に `fatigueImpacts`（**減衰前の生デルタ** = レスポンスと同一値）を保存
5. batch: セッション + スナップショット群 + current merge を一括コミット

**レスポンス**: 不変（`fatigueImpacts` は従来どおり生デルタ。プレビュー表示との一致を維持）。

### GET `/api/workout/history`【変更: フィールド追加】

- 各セッションに `fatigueImpacts` を含める（doc に存在する場合のみ。v2.0 期のセッションは undefined）

### DELETE `/api/workout/[id]`【新規（B6）】

- **404**: セッションが存在しない場合
- **処理手順**:
  1. セッション doc を取得（存在確認）
  2. `fatigueSnapshots` を `where('workoutSessionId', '==', id)` で取得（単一フィールドの自動インデックスで可）。影響筋肉集合を得る。同一セッションは筋肉ごとに最大 1 スナップショットしか書かないため、影響筋肉数 = 取得件数
  3. 影響筋肉ごとに「削除対象を除く直近スナップショット」を特定: `where('muscleId','==',X).orderBy('recordedAt','desc').limit(2)` を発行し、`workoutSessionId !== id` の先頭を採用。該当なしなら デフォルト（value 0, recordedAt = now, source 'manual', workoutSessionId null）
  4. **単一 batch**: セッション delete + 該当スナップショット delete + `state/fatigueCurrent` の影響筋肉を手順 3 の値で merge 更新
- **割り切り仕様**: 削除対象セッションより**後**に保存されたスナップショット（手動保存・別セッション）には触れない。その筋肉の最新が削除対象でない場合、current は変化しない（手順 3 の limit(2) 先頭がそのまま最新）
- **レスポンス 200**: `{ "deletedSessionId": string, "affectedMuscles": MuscleId[] }`
- **副作用の注記**: 削除されたセッション ID を cursor に使っていたページネーションは無効になる（再取得でリカバリ、許容）

### GET `/api/exercises`【変更: 全件モード】

- `q` 未指定時: `limit` パラメータの既定を撤廃し**全件返却**（カタログ件数の上限 200 件を仕様として定める。超過が見えたら再設計）
- `q` 指定時: 従来どおり prefix 検索 + limit（既定 20・最大 50）
- 名前解決用途（履歴・WorkoutTab）はクライアント側で全件キャッシュ（`queryKeys.exercises.all`・staleTime 24h）を用いる

---

## D4. ビジネスロジックの差分（対 §4）

### D4-1. 過去日時ワークアウトの減衰適用（A1・§4-3 の差し替え）

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
    const base = entry
      ? applyDecay(entry.value, entry.recordedAt, muscleId, now)
      : 0;

    // A1: デルタ自体を performedAt → now で減衰。
    // applyDecay は「値 delta を performedAt 時点で保存したとみなした現在値」を返す。
    // performedAt が now より未来（+5分許容内）の場合は applyDecay 内の
    // Math.min(savedValue, ...) ガードにより delta のまま（減衰 0）。
    const effectiveDelta = applyDecay(delta, performedAt, muscleId, now);
    if (effectiveDelta === 0) continue;   // 回復時間超の過去日時 → 書き込みスキップ

    snapshots.push({
      muscleId,
      value: Math.min(100, base + effectiveDelta),
      recordedAt: now,                    // 履歴の並び順・監査性のため now を維持
      source: 'workout',
      workoutSessionId,
    });
  }
  return snapshots;
}
```

**境界条件（確定）:**

| performedAt | 挙動 |
|-------------|------|
| now（即時記録） | 減衰 0（従来どおり満額加算） |
| now + 5分以内（zod 許容範囲） | 減衰 0（`applyDecay` のクランプで delta のまま） |
| 過去（回復時間内） | `delta × (1 - 経過h / 回復h)` を四捨五入して加算 |
| 過去（回復時間超） | effectiveDelta = 0 → **スナップショット書き込み自体をスキップ**（セッションと fatigueImpacts は保存される） |

**注**: ブランチ 6（A1）の時点では現在値の read 元は従来の `getLatestSnapshot`。ブランチ 9（C1）で `readFatigueCurrent` に差し替える。

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
// - buildCurrentMerge(snapshots): FatigueSnapshotInput[] → merge 用の { muscles: {...}, updatedAt } を構築
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

- v2.0 設計 §16-2 のパターンを採用。予測計算は **A1 と同じ減衰込み**:
  `predicted = min(100, current + applyDecay(rawDelta, performedAt, muscleId, now))`
- サーバーと同一の純粋関数（`computeFatigueImpact`・`mergeImpacts`・`applyDecay`）を使い、`onSettled` の invalidate で必ず収束

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
| SessionCard（B6） | 削除ボタン → 確認モーダル（共通 `Modal` 再利用）→ `useDeleteWorkout` |
| 履歴ページ（A3） | `fatigueImpacts` があれば保存値で表示、なければ従来のクライアント再計算（フォールバック） |
| 日時初期値（P0-1） | `datetime-local` の初期値はローカル時刻で組み立てる純粋関数 `toDatetimeLocalValue(date)` に切り出し |
| ラベル（A5） | `MUSCLE_LABELS` 経由のため UI コード変更不要（定数変更のみで「首」が反映される） |

---

## D7. テスト計画の差分（対 §10）

既存 20 ファイル・約 108 ケースは全て維持（退行ゲート）。追加テスト対象:

| 対象 | 種別 | 優先度 | 確認内容 |
|------|------|--------|---------|
| `applyWorkoutToFatigue`（A1） | Unit | 高 | performedAt = now / 過去 / +5分 / 回復時間超（スキップ）。100 クランプ不変 |
| `computeFatigueImpact`（A4） | Unit | 高 | rpe null = 従来値と一致・rpe 1/10 の境界・上限クランプ |
| `recommend.ts`（B5） | Unit | 高 | 閾値境界（29/30）・左右非対称の max・0 件 |
| `chartGeometry.ts`（B3） | Unit | 高 | 時間→座標変換・予測破線の終点・縮退（0/1 件） |
| `currentDoc.ts` + 各 Route（C1） | Unit/API | 高 | 3 書き込み経路の batch 内容（snapshot + current 同時）・doc 欠落時のデフォルト補完 |
| `DELETE /api/workout/[id]`（B6） | API | 高 | 404・スナップショット削除・current 復元・後続手動保存の非影響 |
| `toDatetimeLocalValue`（P0-1） | Unit | 高 | TZ 固定（JST）での初期値 |
| Toast / エラー UI（B2） | Component | 高 | MSW 500/401 → 通知表示・再試行・ロールバック共存 |
| `FatigueSlider` 初期値（A2） | Component | 高 | currentValue 初期化・tick 中の draft 維持・保存後の再初期化 |
| `useWorkout` 楽観的更新（B4） | Hook | 中 | 予測値 = サーバー計算・失敗ロールバック |
| フォールバック表示（A3） | Component | 中 | fatigueImpacts あり/なしの分岐 |
| Modal focus trap（B1） | Component | 中 | Tab 循環・フォーカス復帰 |
| E2E スモーク（D3） | E2E | 中 | ログイン→保存→色変化→記録→履歴の 1 本道（chromium のみ） |

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
