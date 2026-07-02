# v3.0 改修計画 — Phase 計画・feat/* ブランチ分割・確認事項の記録

作成日: 2026-07-02 / 最終更新: 2026-07-02（設計者回答 Q1〜Q9 を反映し**確定版**に更新）
前提: [00_current-state-review.md](./00_current-state-review.md)（問題点 P0〜P3）/ [01_spec-v3.md](./01_spec-v3.md)（仕様 A1〜D4）/ [function.md](./function.md)（確定版機能一覧）/ [design.md](./design.md)（詳細設計差分）

---

## 1. 優先度付き改修計画（Phase 0〜6）

### Phase 0: 調査・棚卸し【完了】

- [x] リポジトリ構成・実装・既存ドキュメント・テストの棚卸し（→ 00_current-state-review.md）
- [x] ドキュメントと実装の差分一覧化（G1〜G12）
- [x] 問題点の深刻度・優先度整理（P0〜P3）
- [x] 設計者確認事項の解消（2026-07-02 回答受領、→ §4 に記録）

### Phase 1: v3.0 仕様策定・ドキュメント更新【ドラフト完了・正式化待ち】

- [x] スコープ確定（Q1〜Q9 の回答反映）
- [x] `docs/v3/function.md`（確定版機能一覧）・`docs/v3/design.md`（詳細設計差分）のドラフト作成
- [ ] `docs/v3-spec` ブランチで上記を正式化: README / CLAUDE.md / AGENTS.md の v3.0 運用への更新、v2.0 設計書 3 点への凍結注記追加、PR → ver3.0 マージ
- 完了条件: docs PR のマージ（マージはユーザーの明示指示で実施）

### Phase 2: データモデル / API / 状態管理の設計整理【design.md に反映済み】

- [x] DTO 型の分離方針（`src/types/api.ts`）→ design.md D1
- [x] `state/fatigueCurrent` 単一ドキュメントのスキーマ・rules 差分 → design.md D2（Q2 により移行なし）
- [x] A1（performedAt 減衰）の計算仕様・境界条件 → design.md D4
- [x] A4（RPE）の係数と型拡張 → design.md D1/D4
- [x] B6（削除）の整合性手順 → design.md D3
- 残: 実装中に判明した設計課題は design.md を更新してから実装（凍結ではなく living document として扱う）

### Phase 3: UI/UX 設計

- モバイルレイアウトのワイヤー（design.md D6 の記述をベースに、`feat/mobile-layout` 着手前に必要ならスケッチ追加）
- Toast・エラー状態 UI・チャート・おすすめバナーの表示仕様 → design.md D6 に確定済み（数値は実装後調整前提）
- 完了条件: 実装者が迷わない粒度の挙動定義（現時点でほぼ充足）

### Phase 4: テスト・品質保証計画

- 既存 20 ファイル・約 108 ケースは全て維持（退行ゲート）。「実装と同一 PR にテスト」の現行ルールを継続
- 追加テストの重点 → design.md D7 の表
- Playwright（Q6 採用）: `test/e2e-smoke` ブランチの最初に認証モック方針の PoC を行い、方針決定後に本実装
- 手動確認チェックリスト → design.md D8（Phase 6 の統合検証で使用）

### Phase 5: feat/* ブランチ単位の実装（→ §2）

- 統合順序どおりに 1 ブランチ = 1 PR = squash merge で進める
- 各 PR: `npm run lint && npm run test && npm run typecheck && npm run build` パス + CI パスが必須

### Phase 6: ver3.0 統合と main 反映【一括リリース（Q1）】

中間リリースは行わない。Vercel の本番デプロイ対象は main（Q9）のため、ver3.0 への feat マージは本番に影響しない。動作確認は Vercel のプレビューデプロイ + ローカルで行う。

1. 全 feat/* 統合後、ver3.0 上で全体整合性確認（design.md D8 の手動チェックリスト + 全自動テスト + E2E）
2. **`package.json` の version を `3.0.0` に更新するコミットを ver3.0 に入れる**（→ 次の PR のマージコミットが 3.0.0 を含む状態になり、タグが正しいコミットを指す。P2 指摘対応）
3. シード再投入（カタログ拡充分、upsert なので安全）: `npm run seed:exercises`
4. Vercel 環境変数の確認 → プレビューデプロイで最終動作確認
5. `ver3.0 → main` PR 作成（version 3.0.0 を含む。v1.1 → v3.0 の一括更新になる点を PR 本文に明記）
6. main マージ → deploy.yml（rules/indexes）自動実行 → Vercel 本番デプロイ確認 → 本番スモーク（ログイン・保存・記録）
   - Firestore rules/indexes（C1 の rules 差分・C2 のルール強化）は deploy.yml による自動反映。旧ルールでも新アプリは動作する（API は Admin SDK 経由でルールをバイパス）ため先行デプロイ不要
7. **main の 3.0.0 マージコミットにタグ `v3.0.0` を付与**（version bump 済みコミットを指す）
- **注意（保存済みメモリより）**: PR のマージ等の共有リポジトリ操作は、ユーザーの明示的な指示があるまで実行しない

---

## 2. feat/* ブランチ分割案（確定版）

命名は CLAUDE.md の規約（`feat/` `fix/` `chore/` `docs/` `test/`）に従う。すべて `ver3.0` から分岐し、`ver3.0` へ squash merge。

### 一覧（統合順序順）

| 順 | ブランチ | 対応項目 | 規模 | 依存 |
|----|---------|---------|------|------|
| 1 | `chore/v3-ci-branches` | D1 | S | なし |
| 2 | `fix/workout-datetime-jst` | P0-1 | S | なし |
| 3 | `docs/v3-spec` | D4 / Phase 1 | M | なし（内容は確定済み） |
| 4 | `feat/api-dto-types` | D2 | M | 3 |
| 5 | `feat/error-feedback` | B2 | M | 3（4 と独立） |
| 6 | `feat/workout-decay-at-performed` | A1 | M | 3 |
| 7 | `feat/workout-impacts-persist` | A3 | S | 3 |
| 8 | `feat/exercises-catalog` | C3 + A5 | M | 3 |
| 9 | `feat/fatigue-current-doc` | C1 | M | 4, 6, 7（batch 書き込み箇所が確定してから） |
| 10 | `feat/firestore-rules-v3` | C2 | S | 9（state/fatigueCurrent の rules を含めるため） |
| 11 | `feat/slider-current-value` | A2 | S | 3 |
| 12 | `feat/mobile-layout` | B1 | L | 5, 11（UI 面の前提を先に安定させる） |
| 13 | `feat/history-chart-v2` | B3 | M〜L | 4 |
| 14 | `feat/workout-optimistic` | B4 | S〜M | 6, 7 |
| 15 | `feat/workout-rpe` | A4 | M | 6, 7 |
| 16 | `feat/today-recommend` | B5 | S〜M | 11 |
| 17 | `feat/workout-delete` | B6（削除のみ） | M〜L | 9 |
| 18 | `test/e2e-smoke` | D3 | L | 12（パッケージ追加を伴う） |

並行可能: 1〜3 は即時並行可。4〜8 は 3 のマージ後に相互独立で並行可。12 以降の UI 系はコンフリクトを避けるため直列推奨。

### 各ブランチの詳細

#### 1. `chore/v3-ci-branches`（D1）
- **目的**: 統合ブランチの品質ゲート回復。
- **対象**: `.github/workflows/ci.yml`（push 対象を `[main, ver3.0]` に変更。ver2.0 は凍結済みのため除外）。deploy.yml は変更しない（main 限定を維持、Q1/Q9 の一括リリース方針と整合）。
- **完了条件**: ver3.0 への push で CI が実行されることを確認。
- **テスト観点**: WF 構文の確認・実 push での動作確認。

#### 2. `fix/workout-datetime-jst`（P0-1）
- **目的**: 実施日時初期値の 9 時間ズレ修正。
- **対象**: `src/components/workout/WorkoutInputModal.tsx`（ローカル時刻で `datetime-local` 初期値を組み立てる純粋関数に切り出し）。
- **完了条件**: JST 環境で初期値が現在時刻と一致。保存値（UTC ISO）が正しい。
- **テスト観点**: 初期値組み立て関数のユニットテスト（テストランナーの TZ 環境変数で JST 固定）。

#### 3. `docs/v3-spec`（D4）
- **目的**: v3.0 仕様の正式化。以降の実装 PR はすべて docs/v3 を参照する。
- **状態（2026-07-02）**: 本ブランチは 2 コミットに分割して PR #18 で運用中（未マージ）。
  - 第1コミット: `docs/v3/` の計画5点を追加
  - 第2コミット（P1-c 対応）: 既存運用ルールと v3 仕様の矛盾を解消 — AGENTS.md / CLAUDE.md の「単一ソース」記述に docs/v3 を追加、ワークアウト削除 API を禁止扱いから v3.0 スコープへ変更、README の API 表修正、v2.0 設計書3点へ凍結注記
- **対象**: `docs/v3/`、`README.md`（API 表修正・進捗・バージョン）、`CLAUDE.md`・`AGENTS.md`（v3.0 運用への反映）、v2.0 設計書 3 点への凍結注記追記（本文は変更しない）。
- **完了条件**: マージ時点で AGENTS.md / CLAUDE.md が v3.0 仕様と矛盾しないこと（特に「削除 API 禁止」が残っていないこと）。G1/G2/G4/G10/G12 の差分解消。**このブランチはワークアウト削除実装（ブランチ17）より前にマージ必須**。
- **テスト観点**: リンク切れ確認のみ。

#### 4. `feat/api-dto-types`（D2）
- **目的**: API レスポンス型（DTO）とドメイン型の分離。`recordedAt: Date` の型の嘘を解消。
- **対象**: `src/types/api.ts`（新規、design.md D1）、`src/hooks/useFatigue.ts`・`useWorkout.ts`・`useExercises.ts`・`useSaveFatigue.ts`、`src/components/fatigue-panel/FatigueHistoryChart.tsx`（`Date | string` 防御の削減）、関連テスト。※ `createdAt` フィールドはブランチ6で追加（本ブランチには含めない）。
- **完了条件**: `FatigueSnapshot`（ドメイン型）を fetch 層で使う箇所が 0。typecheck パス。
- **テスト観点**: 既存フック/コンポーネントテストが型変更後も全パス。

#### 5. `feat/error-feedback`（B2）
- **目的**: 失敗の可視化（P0-3/P0-5）。
- **対象**: `src/components/ui/Toast.tsx`（新規）、`src/stores/uiStore.ts`（通知キュー）、`src/hooks/useSaveFatigue.ts`・`useFatigue.ts`・`useWorkout.ts`（onError 通知）、`src/app/(dashboard)/page.tsx`（エラー状態 + 再試行 UI）、`src/hooks/useFatigueWithDecay.ts`（isError/refetch の公開）。
- **完了条件**: 保存/リセット失敗で Toast 表示。current 取得失敗で再試行 UI。401 で `/login` 誘導。
- **テスト観点**: MSW で 500/401 を返すケース。ロールバックと通知の両立。

#### 6. `feat/workout-decay-at-performed`（A1 + D2-0 タイブレーク導入）
- **目的**: 過去日時ワークアウトの正しい疲労反映。performedAt 由来の recordedAt 同値衝突に備えた `createdAt` タイブレークの導入。
- **対象**: `src/lib/workout/applyWorkoutToFatigue.ts`（performedAt 引数。「①既存値を performedAt まで減衰 → ②デルタ加算＋100 クランプ → ③`recordedAt=performedAt`・`createdAt=now` で保存」。design.md D4-1）、`src/app/api/workout/route.ts`・`src/app/api/fatigue/route.ts`・`src/app/api/fatigue/reset/route.ts`（全書き込みで `createdAt` を設定）、`src/lib/fatigue/getLatestSnapshot.ts`（`orderBy(recordedAt desc).orderBy(createdAt desc)` の 2 段ソート）、`src/types/domain.ts`（`FatigueSnapshot`/`FatigueSnapshotInput` に `createdAt: Date`）、`src/types/api.ts`（`FatigueSnapshotDto` に `createdAt: string`。ブランチ4が先行済みなら追記）、`firestore.indexes.json`（`(muscleId ASC, recordedAt DESC, createdAt DESC)` へ拡張）、関連テスト。
- **完了条件**: design.md D4-1 の検算どおり（既存80%＋40 を 24h 前・回復48h → 現在 50%）。performedAt 時点でクランプが効く。combined 0 なら書き込みなし。**同一 recordedAt の 2 件は createdAt で最新が一意に決まる（D2-0）**。
- **テスト観点**（D0 の必須テストを含む）: performedAt 時点クランプの検算、now/+5 分、過去（回復時間内）、**順序逆転＝INV-2（その筋肉の snapshot を作らない・current 不変。session と impacts は保存）**、**同一分 2 回記録の createdAt タイブレーク（D2-0）**。100 クランプの不変。
- **注**: 本ブランチ時点では current 反映は既存 getLatestSnapshot（`(recordedAt, createdAt)` 最大）に依存。ブランチ9で `buildCurrentMerge` へ移行。
- **注（インデックス）**: `firestore.indexes.json` の変更はデプロイを伴うが、反映は Phase 6（main マージ時 deploy.yml）。ローカル/エミュレータ確認時は手動デプロイ。

#### 7. `feat/workout-impacts-persist`（A3）
- **目的**: 履歴表示の不変性。A4（計算式変更）の前提。
- **対象**: `src/app/api/workout/route.ts`（セッション doc に `fatigueImpacts`＝減衰前の生デルタを保存）、`src/app/api/workout/history/route.ts`（レスポンスに含める）、`src/app/(dashboard)/workout/history/page.tsx`（保存値優先・欠落時フォールバック）、`src/types/domain.ts` / `api.ts`、関連テスト。
- **完了条件**: 新規セッションは保存値で表示。旧セッションは従来のクライアント再計算で表示。
- **テスト観点**: フォールバック分岐。API レスポンスの後方互換（フィールド追加のみ）。

#### 8. `feat/exercises-catalog`（C3 + A5）
- **目的**: limit 時限バグ解消 + カタログ拡充 + 筋肉ラベルの是正。
- **対象**: `src/app/api/exercises/route.ts`（q 未指定時は全件・上限 200 の仕様化）、`src/hooks/useExercises.ts`（名前解決用の全件キャッシュ）、`data/exercises.json`（30〜40 種目へ拡充）、`src/types/domain.ts`（`MUSCLE_LABELS.head`・`MUSCLE_GROUP_LABELS.head` を「首」へ = A5）、名前解決を使う `workout/history/page.tsx`・`WorkoutTab.tsx`、関連テスト。
- **完了条件**: カタログ件数が 20 件を超えても名前解決・影響表示が欠落しない。体図・ボトムバー・パネルの表示が「首」になる。シード再実行で反映。
- **テスト観点**: 21 件以上のモックカタログでの名前解決。prefix 検索の既存挙動維持。ラベル文字列を参照する既存テストの追随。

#### 9. `feat/fatigue-current-doc`（C1）
- **目的**: 現在値取得の read 16→1・レイテンシ短縮。
- **対象**: `src/lib/fatigue/currentDoc.ts`（新規: 単一 doc の read/merge ヘルパー。`buildCurrentMerge` は `(recordedAt, createdAt)` タプル比較。current ミラーに `createdAt` を保存。design.md D2/D4-4）、`src/app/api/fatigue/current/route.ts`（1 doc read + 欠落時デフォルト）、`src/app/api/fatigue/route.ts`・`src/app/api/fatigue/reset/route.ts`・`src/app/api/workout/route.ts`（batch に current merge を追加）、`src/lib/workout/applyWorkoutToFatigue.ts`（現在値の read 元を current doc に変更）、関連テスト。
- **完了条件**: current GET が 1 read。書き込み 3 経路すべてで snapshot と current が同一 batch。doc 欠落ユーザーは全 16 筋肉デフォルト値（移行処理なし、Q2）。**`buildCurrentMerge` が `(recordedAt, createdAt)` 最大ルール（design.md D0 INV-1・D2-0）で、順序逆転時に current を上書きしない（INV-2）こと。**
- **テスト観点**（D0 の必須テストを含む）: 3 書き込み経路の batch 内容検証（原子性）。doc 欠落時のデフォルト補完。既存レスポンス形状の不変。**INV-1: `(recordedAt, createdAt)` 最大のみ current 採用（同一 recordedAt は createdAt で決定）。INV-2: 順序逆転入力ではその筋肉の snapshot を作らず current 不変。**

#### 10. `feat/firestore-rules-v3`（C2）
- **目的**: クライアント直アクセスの遮断。
- **対象**: `firestore.rules` のみ（design.md D2 のルール差分。`state/fatigueCurrent` を含む users/** 全体を遮断）。
- **完了条件**: users/** のクライアント read/write が拒否される（手動確認）。アプリ全機能が API 経由で動作継続。
- **テスト観点**: 本番デプロイは Phase 6 の deploy.yml 実行に任せる（旧ルールでも新アプリは動作するため先行反映不要）。PR に「ルールファイル変更のみ・デプロイは main マージ時」と明記。

#### 11. `feat/slider-current-value`（A2）
- **目的**: 表示値とスライダーの一致。
- **対象**: `src/components/fatigue-panel/FatigueInputTab.tsx`（initialValue = currentValue・remount 条件の変更）、`FatigueSlider.tsx`、関連テスト。
- **完了条件**: 選択直後のスライダー位置 = 表示中の currentValue。減衰 tick で操作中の draft がリセットされない。
- **テスト観点**: 減衰ありエントリでの初期値。tick 経過時の draft 維持。保存後の再初期化。

#### 12. `feat/mobile-layout`（B1）
- **目的**: モバイルファースト UI（レスポンシブのみ、PWA は v3.1: Q7）。
- **対象**: `src/app/(dashboard)/page.tsx`・`layout.tsx`、`src/components/layout/`（Header/BottomBar 横スクロール化）、`src/components/ui/Modal.tsx`（モバイル全画面シート + focus trap）、`src/components/fatigue-panel/`・`body-diagram/` のレイアウト調整、`src/app/(auth)/login/page.tsx`（`signInWithRedirect` フォールバック）。ロジック（hooks/stores/lib/api）には触れない。
- **完了条件**: 375px 幅で全機能が操作可能。md 以上は現行レイアウト維持。focus trap 動作。ポップアップブロック時もログイン可能。
- **テスト観点**: 既存コンポーネントテスト全パス（ロジック不変）。focus trap のユニットテスト。実機/エミュレータでの手動チェックリスト。

#### 13. `feat/history-chart-v2`（B3）
- **目的**: 履歴の分析価値の回復。
- **対象**: `src/components/fatigue-panel/FatigueHistoryChart.tsx`（時間軸チャートへ書き換え）、`src/lib/fatigue/chartGeometry.ts`（新規: 座標計算の純粋関数）、`FatigueInputTab.tsx`・`FatiguePanel.tsx`（受け渡し調整）、関連テスト。
- **完了条件**: 実時間軸（直近 7 日）で描画。現在→完全回復の予測破線表示。記録 0 件・1 件の縮退表示。
- **テスト観点**: `chartGeometry` のユニットテスト。境界（同時刻複数記録・リセット段差）。

#### 14. `feat/workout-optimistic`（B4）
- **目的**: ワークアウト保存の体感 0ms。
- **対象**: `src/hooks/useWorkout.ts`（§16-2 パターン + A1 の減衰込み予測）、`src/components/workout/WorkoutInputModal.tsx`（即時クローズ）、関連テスト。
- **完了条件**: 保存押下で即時反映・モーダル閉。失敗時ロールバック + Toast。
- **テスト観点**: 予測値とサーバー計算の一致（同一純粋関数の使用）。ロールバック。

#### 15. `feat/workout-rpe`（A4）
- **目的**: 強度（RPE）の疲労反映。
- **対象**: `src/types/domain.ts`（`WorkoutExerciseInput.rpe: number | null`）、`src/lib/workout/fatigueImpact.ts`（`intensityFactor = rpe == null ? 1.0 : 0.6 + rpe * 0.06`、design.md D4）、`src/app/api/workout/route.ts`（zod: 1〜10 整数 or null）、`src/components/workout/ExerciseRow.tsx`（任意入力 UI）、`FatiguePreview.tsx`、関連テスト。
- **完了条件**: RPE 未入力は現行と同一結果（係数 1.0）。RPE 10 で 1.2 倍・上限クランプ維持。プレビューとサーバーが一致。
- **テスト観点**: 係数の境界（null / 1 / 10）。既存テストの結果不変（rpe なし）。

#### 16. `feat/today-recommend`（B5）
- **目的**: 「今日どこを鍛えるか」の提示。
- **対象**: `src/lib/fatigue/recommend.ts`（新規: グループ値 = 左右 max、currentValue < 30 のグループを返す純粋関数）、`src/components/layout/RecommendBanner.tsx`（新規、ダッシュボード上部）、`src/app/(dashboard)/page.tsx`、関連テスト。
- **完了条件**: 回復済みグループがバッジ表示され、タップで該当筋肉が選択される。全グループ疲労中は非表示 or 「休養日」表示。
- **テスト観点**: 閾値境界（29/30）。左右非対称時の max 判定。0 件時の縮退。

#### 17. `feat/workout-delete`（B6・削除のみ）
- **目的**: 誤記録の救済。編集は実装しない（Q5、削除+再入力で代替）。
- **前提**: ブランチ3（docs/v3-spec）マージ後に着手（AGENTS.md の「削除 API 禁止」が解除済みであること）。
- **対象**: `src/app/api/workout/[id]/route.ts`（新規 DELETE、design.md D3 の手順: 削除可能条件チェックは `(recordedAt, createdAt)` 2 段ソート＝D2-0 → セッション+由来スナップショット削除+current を直前値へ更新を単一 batch で）、`src/hooks/useDeleteWorkout.ts`（新規）、`src/app/(dashboard)/workout/history/page.tsx`（削除ボタン + 確認モーダル + 409 案内）、関連テスト。
- **完了条件**: 削除可能な場合、履歴から消え、影響筋肉の現在値が直前スナップショット基準に戻る。存在しない id は 404。**影響筋肉に新しい記録がある場合は 409 で拒否**し、UI が案内を表示。
- **テスト観点**（D0 の必須テストを含む）: 404・**409（より新しい記録あり＝INV-3。同一 recordedAt で createdAt がより新しい場合も含む）**・削除対象スナップショットの特定（workoutSessionId 一致）・current の直前値復元・batch の原子性。

#### 18. `test/e2e-smoke`（D3）
- **目的**: 主要フローの退行検知。
- **対象**: `@playwright/test` の devDependency 追加（**このブランチでのみパッケージ追加**）、`e2e/smoke.spec.ts`、`playwright.config.ts`、`.github/workflows/ci.yml`（e2e ジョブ追加・chromium のみ）、認証モック（Firebase Auth エミュレータ or カスタムトークン — 着手時に PoC で決定）。
- **完了条件**: ログイン→スライダー保存→体図色変化→ワークアウト記録→履歴表示のスモークが CI でパス。
- **テスト観点**: フレーク耐性（リトライ 1 回まで許容）。CI 実行時間 5 分以内。

---

## 3. 統合順序とマイルストーン

```
M0: 品質ゲート回復        1 chore/v3-ci-branches, 2 fix/workout-datetime-jst
M1: 仕様正式化           3 docs/v3-spec
M2: 正しさ               4 dto, 5 error-feedback, 6 decay-at-performed, 7 impacts-persist, 8 catalog+labels
M3: 性能・防御           9 fatigue-current-doc, 10 firestore-rules-v3
M4: UX                  11 slider, 12 mobile-layout, 13 chart, 14 optimistic
M5: 拡張                15 rpe, 16 recommend, 17 delete, 18 e2e
M6: 統合検証・一括リリース  Phase 6（ver3.0 → main、rules/indexes デプロイ、seed、本番スモーク）
```

リリースは **M6 での一括リリースのみ**（Q1）。中間リリースは行わない。開発中の動作確認は Vercel プレビューデプロイとローカルで実施する（本番 = main のみ: Q9）。

---

## 4. 設計者確認事項と回答の記録（2026-07-02 確定）

| # | 確認事項 | 回答 | 計画への反映 |
|---|---------|------|-------------|
| Q1 | リリース戦略 | **v3.0 一括リリース** | 中間リリース削除。M6 で一括（§3） |
| Q2 | 本番 Firebase の実データ | **なし** | C1 の lazy migration を廃止（欠落時デフォルト + 初回書き込みで生成）。全項目マイグレーション不要 |
| Q3 | A4（RPE 強度反映） | **入れる** | ブランチ 15 を確定スコープ化 |
| Q4 | B5（今日のおすすめ） | **入れる** | ブランチ 16 を確定スコープ化 |
| Q5 | B6（編集・削除） | **削除のみ** | ブランチ 17 を `feat/workout-delete` に確定。編集は v3.1 以降 |
| Q6 | D3（Playwright E2E） | **入れる** | ブランチ 18 を確定スコープ化（パッケージ追加は同ブランチ内） |
| Q7 | モバイル対応の程度 | **レスポンシブのみ。PWA は v3.1 以降** | B1 はレスポンシブに限定。PWA を v3.1 候補として function.md のスコープ外に記載 |
| Q8 | `head` の扱い | **ラベルのみ「首」へ変更** | A5 として仕様化。ブランチ 8 に同梱 |
| Q9 | Vercel 本番デプロイブランチ | **main** | Phase 6 の手順を確定。ver3.0 マージは本番非影響と明記 |

### 実装中に design.md を更新すべき事項（残る仮決め値）

- Toast の表示秒数（4 秒）・チャート期間（7 日）・おすすめ閾値（30%）・RPE 係数（0.6 + 0.06×RPE）・カタログ上限（200）— いずれも実装後に調整前提の初期値
- E2E の認証モック方式（エミュレータ or カスタムトークン）— ブランチ 18 着手時の PoC で決定
- カタログ拡充の種目リスト — ブランチ 8 の PR でユーザーレビューを依頼

---

## 5. 作業記録

- 2026-07-02（第1ターン）: リポジトリ・実装・ドキュメントの調査、docs/v3/ に計画 3 ドキュメントを新規作成（コード・設定・コミットなし）
- 2026-07-02（第2ターン）: 設計者回答 Q1〜Q9 を受領。計画 3 ドキュメントを確定版へ更新し、`function.md`（確定版機能一覧）・`design.md`（詳細設計差分）を新規作成（コード・設定・コミットなし）
- 未実施: コミット・ブランチ作成・PR — `docs/v3-spec` ブランチの正式化から、ユーザーの指示を受けて開始する
