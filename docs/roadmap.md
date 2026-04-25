# 実装工程表

筋肉疲労マップ 2D — v2.0 再設計（2026-04-23 開始）

各 Step は `feat/xxx` ブランチ → PR → squash merge into `ver2.0` の単位。
依存順に並んでいる（後の Step が前の Step の成果物に依存）。

---

## 工程一覧

| Step | ブランチ名 | 内容 | 設計書参照 |
|------|-----------|------|-----------|
| 0 | `feat/step-0-scaffold` | 足場 | §11, §19 |
| 1 | `feat/step-1-domain` | ドメイン型・定数・純粋関数 | §1, §4-1, §4-2, §8 |
| 2 | `feat/step-2-firestore` | Firestoreスキーマ・Rules・Indexes | §2, §19-2 |
| 3 | `feat/step-3-api` | API Route（withAuth・各エンドポイント） | §3, §15 |
| 4 | `feat/step-4-state` | Zustand ストア・TanStack Query フック | §5, §6, §16 |
| 5 | `feat/step-5-ui` | UI コンポーネント（体図・スライダー・モーダル・履歴） | §7, §17 |
| 6 | `feat/step-6-ops` | シードスクリプト・CI/CD・Vercel デプロイ | §11, §13 |

---

## 各 Step の詳細

### Step 0 — 足場

**ブランチ**: `feat/step-0-scaffold`

**主な成果物**:
- Next.js 14 + TypeScript + Tailwind + ESLint スキャフォールド
- Vitest + React Testing Library + MSW テスト基盤
- Firebase client/admin SDK + TanStack Query + Zustand + date-fns-tz + zod
- `src/lib/firebase/admin.ts`（Admin SDK singleton）
- `src/lib/firebase/client.ts`（クライアント設定）
- `firestore.rules` / `firestore.indexes.json` / `firebase.json`（雛形）
- `vercel.json`（hnd1 リージョン）
- `.github/workflows/ci.yml`（lint → typecheck → test → build）
- サニティテスト 2本

---

### Step 1 — ドメイン型・定数・純粋関数

**ブランチ**: `feat/step-1-domain`

**主な成果物**:
- `src/types/domain.ts` — `MuscleId`・`MuscleGroup`・`FatigueSnapshot`・`CurrentFatigue`・`WorkoutSet`・`WorkoutExercise`・`WorkoutSession`・`MUSCLE_IDS`・`MUSCLE_RECOVERY_HOURS`・`MUSCLE_GROUP_MAP` 等
- `src/lib/fatigue/decay.ts` — `calcDecayedValue(snapshot, now)` 純粋関数
- `src/lib/fatigue/colorMap.ts` — `fatigueToColor(value)` 純粋関数
- `src/lib/fatigue/getLatestSnapshot.ts` — 筋肉ごとの最新スナップショット取得
- `src/lib/workout/fatigueImpact.ts` — 種目の疲労インパクト計算
- `src/lib/workout/applyWorkoutToFatigue.ts` — ワークアウトを疲労値に適用する純粋関数

**テスト対象**（同 PR 内）:
- `decay.ts`・`colorMap.ts`・`fatigueImpact.ts`・`applyWorkoutToFatigue.ts` の各純粋関数に対する Vitest ユニットテスト

**依存**: Step 0（Vitest 基盤）

---

### Step 2 — Firestoreスキーマ・Rules・Indexes

**ブランチ**: `feat/step-2-firestore`

**主な成果物**:
- `firestore.rules` — 本番ルール（exercises 読み取り専用・users/{uid}/** 本人のみ）
- `firestore.indexes.json` — 複合インデックス（`fatigueSnapshots: muscleId ASC, recordedAt DESC`）
- `firebase.json` — rules/indexes のデプロイ設定
- Admin SDK singleton の動作確認（env var なし時のエラーメッセージ整備）

**依存**: Step 0（Admin SDK singleton）

---

### Step 3 — API Route

**ブランチ**: `feat/step-3-api`

**主な成果物**:
- `src/lib/auth/verifyUser.ts` — ID トークン検証・`uid` 取得（§15）
- `src/lib/auth/withAuth.ts` — Route Handler ラッパー（認証失敗時 401）（§15）
- `src/app/api/fatigue/current/route.ts` — GET（全筋肉の最新疲労値）
- `src/app/api/fatigue/history/route.ts` — GET（特定筋肉の履歴）
- `src/app/api/fatigue/reset/route.ts` — POST（疲労値リセット、`writeBatch`）
- `src/app/api/workout/route.ts` — POST（ワークアウト保存）・GET（セッション一覧）
- `src/app/api/exercises/route.ts` — GET（種目カタログ）
- 全 Route Handler に `export const runtime = 'nodejs'; export const preferredRegion = 'hnd1';`

**テスト対象**（同 PR 内）:
- MSW で各エンドポイントをモックし、正常系・異常系（401・400・500）を網羅

**依存**: Step 1（ドメイン型）、Step 2（Firestore Rules）

---

### Step 4 — Zustand ストア・TanStack Query フック

**ブランチ**: `feat/step-4-state`

**主な成果物**:
- `src/stores/uiStore.ts` — Zustand（selectedMuscle・sliderOpen・sliderValue）（§5）
- `src/hooks/useFatigue.ts` — 現在疲労値の取得・保存・リセット（§6）
- `src/hooks/useFatigueWithDecay.ts` — 1分ごとに減衰再計算するフック（§16）
- `src/hooks/useWorkout.ts` — ワークアウト保存・セッション一覧（§6）
- `src/hooks/useExercises.ts` — 種目カタログ取得（§6）

**テスト対象**（同 PR 内）:
- `useFatigueWithDecay` のユニットテスト（decay 計算が正しく更新されること）

**依存**: Step 1（ドメイン型）、Step 3（API エンドポイント）

---

### Step 5 — UI コンポーネント

**ブランチ**: `feat/step-5-ui`

**主な成果物**:
- `src/components/body-diagram/` — 前面・背面 SVG + ヒットエリア
- `src/components/fatigue-panel/FatigueSlider.tsx` — 確定ボタン保存
- `src/components/fatigue-panel/ResetButton.tsx` — インライン確認付きリセット
- `src/components/workout/WorkoutForm.tsx` — 種目入力フォーム
- `src/components/workout/WorkoutHistory.tsx` — セッション一覧
- `src/components/layout/AuthGate.tsx` — Google サインイン
- `src/app/page.tsx` — 全体を組み合わせた画面

**テスト対象**（同 PR 内）:
- `FatigueSlider` のコンポーネントテスト（確定ボタンで保存・初期値が保存済み値）
- `MuscleDiagram` のコンポーネントテスト（疲労値に応じた色クラスが付与）

**依存**: Step 4（フック群）

---

### Step 6 — シード・CI/CD・Vercel デプロイ

**ブランチ**: `feat/step-6-ops`

**主な成果物**:
- `data/exercises.json` — 種目カタログシードデータ（§13-1）
- `scripts/seedExercises.ts` — Firestore へのシード投入スクリプト
- CI に Firestore ルール/インデックスのデプロイジョブを追加
- Vercel 環境変数の設定確認・本番デプロイ

**依存**: Step 1（ドメイン型 `MuscleGroup`）、Step 2（Firestore 接続）

---

## 完了定義（全 Step 共通）

- `npm run lint && npm run typecheck && npm run test` がローカルでパス
- GitHub Actions CI がパス
- PR レビューで Approve を取得
- `ver2.0` へ squash merge 済み

---

## v2.0 完成後

`ver2.0 → main` を PR 経由でマージし、Vercel の本番デプロイを確認する。

---

*最終更新: 2026-04-24*
