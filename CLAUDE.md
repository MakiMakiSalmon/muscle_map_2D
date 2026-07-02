# CLAUDE.md

このファイルはこのリポジトリで Claude Code / Claude が作業する際の運用ルールです。

---

## プロジェクト概要

筋肉疲労マップ 2D — 完全再設計 v2.0（2026-04-23 開始）

旧実装（v1.1）は Firebase quota 超過・疲労履歴のセッション限定などの問題があり、スキーマ・状態管理・テスト基盤を含めて作り直す。

## 設計ドキュメント（実装時の単一ソース）

**v3.0（現行）の単一ソースは `docs/v3/` 配下:**
- [docs/v3/function.md](./docs/v3/function.md) — v3.0 確定スコープ
- [docs/v3/design.md](./docs/v3/design.md) — v3.0 詳細設計（v2.0 との差分 D1〜D8）
- [docs/v3/02_work-plan.md](./docs/v3/02_work-plan.md) — ブランチ計画・統合順序

**v2.0（凍結・歴史的記録）:**
- [docs/function.md](./docs/function.md) / [docs/design_basic.md](./docs/design_basic.md) / [docs/design_detail.md](./docs/design_detail.md)
  — v3.0 の design.md で上書きされていない箇所のみ有効。

**迷ったら docs/v3/ を読む。CLAUDE.md より設計書が優先。**

## テックスタック

Next.js 14 (App Router) / TypeScript / Tailwind CSS / Firebase (Auth + Firestore) / TanStack Query + Zustand / Vitest + React Testing Library + MSW / Vercel (hnd1) / GitHub Actions

---

## 実装時に守る不変ルール

1. **16筋肉対称モデル** — `MUSCLE_IDS` に沿う（`shoulders_left`/`shoulders_right` 等）。種目カタログは `MuscleGroup` 型（左右未分化）で書く（設計書 §1）
2. **Firebase Admin SDK は singleton** — `src/lib/firebase/admin.ts` の `adminAuth`/`adminDb` を import。Route Handler から `initializeApp` を呼ばない（§19-2）
3. **API Route は全て `withAuth` 経由** — 認証ヘルパーを使わない Route Handler を作らない（§15）
4. **スライダーは `[確定]` ボタン保存のみ** — debounce 自動保存は実装しない（§12-2）
5. **体図の色はクライアント側で再計算** — `useFatigueWithDecay` を使い、Firestore read を増やさない（§12-5）
6. **Firestore 書き込みは batch** — リセット・ワークアウト保存は `writeBatch` 必須（§12-1）
7. **時刻の扱い** — 保存は UTC（Firestore `Timestamp`）、表示は JST 固定（`date-fns-tz`）（§14）
8. **Route Handler は必ず Node.js Runtime + 東京リージョン** — ファイル先頭に `export const runtime = 'nodejs'; export const preferredRegion = 'hnd1';`（§19-1）

---

## ディレクトリ規約

```
src/
├── app/              # Next.js App Router（ページ・Route Handler）
├── components/       # UI（layout/body-diagram/fatigue-panel/workout/ui）
├── hooks/            # TanStack Query カスタムフック
├── stores/           # Zustand（UI 状態のみ）
├── types/            # ドメイン型（domain.ts）
├── lib/
│   ├── firebase/     # admin singleton, client config
│   ├── auth/         # verifyUser, withAuth
│   ├── date/         # JST フォーマット
│   ├── fatigue/      # 回復計算・色マップ・筋肉定義
│   └── workout/      # 疲労値インパクト計算
└── test/             # Vitest setup, MSW handlers

data/                 # シードデータ（exercises.json）
scripts/              # seedExercises.ts
```

## よく使うコマンド

| 用途 | コマンド |
|------|---------|
| 開発サーバー | `npm run dev` |
| lint | `npm run lint` |
| テスト | `npm run test` |
| 型チェック | `npm run typecheck` |
| ビルド | `npm run build` |
| 種目シード投入 | `npm run seed:exercises` |
| Firestore ルール/インデックスデプロイ | `firebase deploy --only firestore:indexes,firestore:rules` |

---

## やらないこと

- debounce によるスライダー自動保存
- テストで Firestore を直接モック（MSW で API 層をモックする）
- Edge Runtime の使用（Admin SDK が動かない）
- Route Handler から `initializeApp` を直接呼ぶ
- localStorage/sessionStorage への疲労値保存（Firestore が単一ソース）
- ワークアウトの編集 API 実装（v3.1 以降）。※削除 API は v3.0 スコープ（docs/v3/function.md V-B6）
- 機能追加を勝手にスコープに入れる（`docs/function.md` に記載されたものが全て）

---

## Git 運用ルール

### ブランチ戦略

```
main            ← 本番（v1.1 が最後の稼働バージョン。完成時にここへマージ）
 └─ ver3.0      ← 再設計の統合先（長期ブランチ、develop 相当）
      ├─ feat/xxx
      ├─ fix/xxx
      ├─ chore/xxx
      ├─ test/xxx
      └─ docs/xxx
```

- 完成時に `ver3.0 → main` を PR 経由でマージ
- feat/* は短命（1機能 = 1ブランチ = 1PR）
- `ver2.0` は旧統合ブランチ（凍結）。新規の feat/* は `ver3.0` から切る

### コミットメッセージ（日本語統一）

- **日本語で簡潔に。1行目 50字以内。英語 prefix は付けない**
- 過去形ではなく現在形（「追加した」ではなく「追加」または「追加する」）
- 必要なら空行の後に本文で「なぜ」を書く

**例:**
```
ドメイン型と筋肉定数を追加

16筋肉の左右対称モデル（設計書 §1）に従う。
MuscleGroup は種目カタログ用の論理グループとして別型で定義。
```

```
applyWorkoutToFatigue の並列 read を実装
```

```
useFatigueWithDecay フックで体図の色をクライアント側再計算
```

### PR フロー

1. `ver3.0` から `feat/xxx` を切る（例: `feat/domain-types`, `feat/muscle-diagram`, `fix/slider-initial-value`）
2. 実装 → push → GitHub で **`feat/xxx → ver3.0`** の PR を作成
3. CI（lint + test + typecheck + build）パス確認
4. **squash merge** で `ver3.0` に取り込む（履歴を線形に保つ）
5. マージ後、feat ブランチは削除
6. Step 実装 PR の場合: `docs/step-status.md`（gitignore 対象）の当該 Step の状態を「完了」に更新する

### PR タイトル・本文テンプレート

タイトル: コミットメッセージと同じルール（日本語、prefix なし）

本文:
```markdown
## 概要
何をしたか（1-3行）

## 関連設計書
- docs/design_detail.md §X

## テスト
- [ ] unit
- [ ] component
- [ ] 手動確認（該当すれば）

## スクリーンショット
（UI 変更のみ）
```

### マージ済みブランチの掃除

```bash
git branch --merged ver3.0 | grep -E '^\s+(feat|fix|chore|test|docs)/' | xargs git branch -d
```

---

## 実装フェーズの大まかな順序

段階ごとにブランチ・PR を切る。順序は依存関係を反映。

| Step | 内容 | 関連設計書セクション |
|------|------|-------------------|
| 0 | 足場（Next.js 初期化・Tailwind・Vitest・Firebase 接続・リージョン設定） | §11, §19 |
| 1 | ドメイン型・定数・純粋関数（テスト先行） | §1, §4-1, §4-2, §8 |
| 2 | Firestore スキーマ・Rules・Indexes・Admin SDK singleton | §2, §19-2 |
| 3 | API Route（`withAuth` 共通化、各エンドポイント） | §3, §15 |
| 4 | Zustand ストア・TanStack Query フック・楽観的更新 | §5, §6, §16 |
| 5 | UI コンポーネント（体図・スライダー・モーダル・履歴） | §7, §17 |
| 6 | シードスクリプト・CI/CD・Vercel デプロイ | §11, §13 |

各 Step で §18 チェックリストの該当項目を消化していく。

---

## Claude が作業する際のルール

### 設計書は凍結（Frozen Specification）

**`docs/` 直下の v2.0 設計書 3 点（`function.md` / `design_basic.md` / `design_detail.md`）は凍結。変更しない。**
v3.0 の生きた仕様は `docs/v3/`（`function.md` / `design.md` / `02_work-plan.md`）で、実装中の仕様調整はこちらを更新する（living document。ただし docs 変更は実装コミットと分離）。

- v2.0 設計書 3 点を実装時に勝手に編集しない（typo 修正・リンク修正すら実装 PR に混ぜない）
- 設計書の内容と実装を合わせる方向は **設計書に実装を合わせる**。逆方向（実装に合わせて設計書を書き換える）は禁止
- 設計書の変更が必要になった場合:
  1. 作業を一度止めてユーザーに相談する
  2. 変更理由と影響範囲を明示して **専用の `docs/xxx` PR** を先に出す
  3. その PR がマージされた後で、該当する実装 PR を進める
- 軽微な typo 等も含め、設計書を触るコミットは **実装コミットと分離する**（レビューで差分が埋もれないため）

### 実装品質のルール

- v3.0 は `docs/v3/`（`function.md` / `design.md` / `02_work-plan.md`）を **実装の単一ソース**とする。CLAUDE.md はあくまで運用ルール
- テストなしの実装コミットを切らない（テスト対象は実装と同じ PR 内で書く）
- `npm run lint && npm run test && npm run typecheck` が通らないコミットをプッシュしない
- スコープ外機能（例: ワークアウト**編集** API は v3.1 以降）を勝手に実装しない。※削除 API は v3.0 スコープ（docs/v3/function.md V-B6）
- 機能追加のアイデアが湧いても `docs/v3/function.md` の範囲外なら **実装せずメモに留める**

### Step 着手前の確認ルール

> **【v3.0 での読み替え】** 以下の「Step 0〜6」は v2.0 実装時の工程・歴史的記録。v3.0 の作業単位は [docs/v3/02_work-plan.md](./docs/v3/02_work-plan.md) §2 の feat/* ブランチ計画。着手前の確認（対象ファイル列挙 → スコープ照合 → 承認）という手順自体は v3.0 でも踏襲し、照合先を Step 表ではなくブランチ計画の対象ファイルとする。

各 Step の実装を開始する前に、必ず次の順序で確認する:

1. **作成・変更予定ファイルを列挙する** — ゼロから書き出し、省略しない
2. **各ファイルが当該 Step のスコープ内であることを確認する** — 下の「Step ごとの対象ファイル」表と照合する
3. **スコープ外のファイルは絶対に作らない** — 「ついでに」は禁止。別 Step のファイルが必要と判断した場合は作業を止めてユーザーに相談する
4. **ユーザーに列挙内容を提示し、承認を得てから実装を開始する**

### Step ごとの対象ファイル（このStepで初めて作成するファイル）

実装着手前にこの表と照合すること。既存 Step で作成済みのファイルは別 Step で再作成しない。

現在の進捗は `docs/step-status.md`（gitignore 対象・ローカルのみ）を参照。
ファイルが存在しない場合は下記フォーマットで作成し、完了済み Step を「完了」に更新する。

```markdown
# Step 進捗（ローカル管理）
| Step | 状態 | 内容 |
|------|------|------|
| 0 | 完了 | 足場 |
| 1 | 完了 | ドメイン型・定数・純粋関数 |
| 2 | 完了 | Firestore スキーマ・Rules・Indexes |
| 3 | 未着手 | API Route |
| 4 | 未着手 | Zustand ストア・TanStack Query フック |
| 5 | 未着手 | UI コンポーネント |
| 6 | 未着手 | シードスクリプト・CI/CD・Vercel デプロイ |
```

| Step | 対象ファイル（初回作成） |
|------|----------------------|
| 0 | `next.config.mjs`, `tailwind.config.ts`, `postcss.config.mjs`, `tsconfig.json`, `vitest.config.ts`, `.eslintrc.json`, `vercel.json`, `.github/workflows/ci.yml`, `src/test/setup.ts`, `src/test/sanity.test.ts`, `src/test/mocks/handlers.ts`, `src/test/mocks/server.ts`, `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/globals.css` |
| 1 | `src/types/domain.ts`, `src/types/__tests__/domain.test.ts`, `src/lib/fatigue/decay.ts`, `src/lib/fatigue/colorMap.ts`, `src/lib/fatigue/getLatestSnapshot.ts`, `src/lib/fatigue/__tests__/decay.test.ts`, `src/lib/fatigue/__tests__/colorMap.test.ts`, `src/lib/workout/fatigueImpact.ts`, `src/lib/workout/applyWorkoutToFatigue.ts`, `src/lib/workout/__tests__/fatigueImpact.test.ts`, `src/lib/workout/__tests__/applyWorkoutToFatigue.test.ts` |
| 2 | `firebase.json`, `firestore.rules`, `firestore.indexes.json`, `src/lib/firebase/admin.ts`, `src/lib/firebase/client.ts`, `.env.example` |
| 3 | `src/lib/auth/verifyUser.ts`, `src/app/api/fatigue/current/route.ts`, `src/app/api/fatigue/history/route.ts`, `src/app/api/fatigue/reset/route.ts`, `src/app/api/workout/route.ts`, `src/app/api/exercises/route.ts` |
| 4 | `src/stores/uiStore.ts`, `src/hooks/useFatigue.ts`, `src/hooks/useFatigueWithDecay.ts`, `src/hooks/useWorkout.ts`, `src/hooks/useExercises.ts` |
| 5 | `src/components/layout/` 配下, `src/components/body-diagram/` 配下, `src/components/fatigue-panel/` 配下, `src/components/workout/` 配下, `src/components/ui/` 配下 |
| 6 | `data/exercises.json`, `scripts/seedExercises.ts`, `.github/workflows/deploy.yml` |

※ Step 2 のファイル群は Step 0 で先行作成・実装済み（実装完了）。Step 2 での再作成は不要。
