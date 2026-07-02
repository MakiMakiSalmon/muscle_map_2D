# 筋肉疲労マップ 2D

筋肉部位ごとの疲労値を記録・可視化する Web アプリ。トレーニング内容を記録すると、関連筋肉の疲労値が自動計算されます。時間経過に伴う自動回復を反映し、リアルタイムで体図の色が更新されます。

**現在 v2.0 再設計中**（2026-04-23 開始）。完全なスキーマ設計・テスト基盤の上に再実装しています。

## 主な機能

### 📊 疲労マップ表示
- **2D体図**（前面・背面）を SVG で表示
- **16筋肉の左右対称モデル** — 肩・背中・胸・腕・前腕・脚などを個別に追跡
- **疲労値に応じた色分け** — 緑（0-29%）→ 黄（30-59%）→ オレンジ（60-79%）→ 赤（80-100%）

### 💪 トレーニング記録
- **種目入力による疲労自動計算** — ベンチプレス・スクワットなどを記録すると、関連筋肉に疲労値を自動加算
- **手動入力（スライダー）** — 部位をクリックして手動で疲労値を設定（0-100%）
- **明示的な保存** — `[確定]` ボタンで保存（debounce 自動保存なし）

### ⏳ 自動回復システム
- **時間経過による自動減衰** — 最終保存時刻からの経過時間に基づいて疲労値が自動で減少
- **筋肉ごとの回復率**
  - 胸・肩・上腕: 約 48時間
  - 背中・太もも: 約 72時間
  - ふくらはぎ・前腕: 約 36-48時間
- **リアルタイムで色反映** — ページをリロードしなくても回復進捗を体図で確認

### 📈 履歴・分析
- **永続化された時系列履歴** — Firestore に保存された疲労値の履歴を参照
- **回復タイムライン** — 各筋肉の完全回復までの残り時間を表示
- **トレーニング履歴** — 過去のトレーニングセッションを日時順に閲覧

### 🔐 ユーザー管理
- **Google Sign-in** で簡単ログイン
- Firebase Auth で安全に管理

## ドキュメント

| ドキュメント | 対象 |
|-------------|------|
| [CLAUDE.md](./CLAUDE.md) | 運用ルール・Git フロー・実装ルール・不変ルール |
| [docs/function.md](./docs/function.md) | 機能スコープ（確定版・MVP 範囲） |
| [docs/design_basic.md](./docs/design_basic.md) | 基本設計（構成図・画面設計・データフロー） |
| [docs/design_detail.md](./docs/design_detail.md) | 詳細設計（型定義・API仕様・実装パターン） |

## クイックスタート

### 前提条件
- Node.js 18+
- npm または yarn
- Firebase プロジェクト（認証情報設定済み）

### セットアップ

```bash
# リポジトリをクローン
git clone <repository-url>
cd muscle_map_2D

# 依存関係をインストール
npm install

# 環境変数を設定（.env.local を作成）
# Firebase の認証情報を設定します
cp .env.example .env.local
# .env.local を編集して Firebase 認証情報を入力
```

### 開発サーバーを起動

```bash
npm run dev
```

ブラウザで http://localhost:3000 を開きます。

## 開発コマンド

```bash
# 開発サーバー
npm run dev

# Lint チェック
npm run lint

# TypeScript 型チェック
npm run typecheck

# テスト実行（watch モード）
npm run test

# テスト実行（単一実行）
npm run test:run

# 本番ビルド
npm run build

# 本番ビルドの検証
npm run start

# 種目カタログを Firestore に投入
npm run seed:exercises

# Firestore ルール・インデックスをデプロイ
firebase deploy --only firestore:indexes,firestore:rules
```

## プロジェクト構成

```
src/
├── app/                          # Next.js App Router
│   ├── (auth)/
│   │   └── login/                # ログイン画面
│   ├── api/
│   │   ├── fatigue/              # 疲労値 API
│   │   │   ├── current/          # 現在の疲労値
│   │   │   ├── history/          # 履歴
│   │   │   └── reset/            # リセット
│   │   ├── workout/              # トレーニング API
│   │   └── exercises/            # 種目カタログ API
│   ├── layout.tsx
│   ├── page.tsx                  # ダッシュボード（メイン画面）
│   └── workout/
│       └── history/              # トレーニング履歴画面
│
├── components/                   # UI コンポーネント
│   ├── layout/                   # ページレイアウト
│   ├── body-diagram/             # 2D 体図（SVG）
│   ├── fatigue-panel/            # 右パネル（タブ）
│   ├── workout/                  # トレーニング関連
│   └── ui/                       # 汎用 UI（モーダル・ボタン等）
│
├── hooks/                        # カスタムフック
│   ├── useFatigue.ts             # 疲労データ取得
│   ├── useFatigueWithDecay.ts    # 回復計算を含む疲労取得
│   ├── useWorkout.ts             # トレーニング操作
│   └── useExercises.ts           # 種目カタログ取得
│
├── stores/                       # Zustand ストア
│   └── uiStore.ts               # UI 状態管理
│
├── types/
│   └── domain.ts                # ドメイン型定義（筋肉・疲労・トレーニング）
│
├── lib/
│   ├── firebase/
│   │   ├── admin.ts             # Admin SDK singleton
│   │   └── client.ts            # クライアント SDK 初期化
│   ├── auth/
│   │   ├── verifyUser.ts        # JWT 検証
│   │   └── withAuth.ts          # 認証 HOC
│   ├── date/                    # 日付ユーティリティ（JST フォーマット）
│   ├── fatigue/                 # 疲労計算ロジック
│   │   ├── decay.ts             # 回復減衰計算
│   │   ├── colorMap.ts          # 疲労値 → 色マップ
│   │   └── getLatestSnapshot.ts # 最新スナップショット取得
│   └── workout/                 # トレーニングロジック
│       ├── fatigueImpact.ts     # 種目 → 疲労値インパクト計算
│       └── applyWorkoutToFatigue.ts  # 疲労値への適用
│
└── test/                        # テスト基盤
    ├── setup.ts                 # Vitest 設定
    ├── mocks/                   # MSW ハンドラー
    └── *.test.ts               # テストファイル

data/
└── exercises.json              # 種目カタログ（シード用）

scripts/
└── seedExercises.ts           # Firestore シードスクリプト
```

## アーキテクチャ

### システム構成

```
ユーザー（ブラウザ）
    ↓ HTTPS
Vercel (Next.js)
├─ React コンポーネント（Tailwind CSS）
├─ TanStack Query（サーバー状態）
├─ Zustand（UI 状態）
└─ API ルート（/api/*)
    ↓ Firebase Admin SDK
Firebase (Google Cloud)
├─ Auth（Google Sign-in）
└─ Firestore（東京リージョン）
```

### データフロー

1. **ユーザーがアクション** → TanStack Query が API を呼び出し
2. **API ルート** → Firebase Admin SDK で認証・DB 操作
3. **Firestore から取得** → クライアントで回復計算・色付け
4. **UI 更新** → コンポーネントが新しい疲労値・色を反映

### 主要な設計原則

- **16筋肉の左右対称モデル** — `MUSCLE_IDS` に沿った実装（shoulders_left/shoulders_right など）
- **Firestore が単一ソース** — クライアント側に疲労値を保存しない
- **回復計算はクライアント側** — `useFatigueWithDecay` で保存時刻から現在の疲労値を再計算
- **Batch 書き込み** — リセット・ワークアウト保存は `writeBatch` 使用
- **時刻は UTC 保存・JST 表示** — `date-fns-tz` で管理

## API 概要

### 認証

すべての API エンドポイントは `withAuth` ラッパーで認証が必須です。リクエストヘッダに `Authorization: Bearer <idToken>` が必要。

### エンドポイント

| メソッド | パス | 説明 |
|---------|------|------|
| GET | `/api/fatigue/current` | 現在の疲労値（16筋肉全て） |
| GET | `/api/fatigue/history` | 疲労値履歴 |
| POST | `/api/fatigue/reset` | 全筋肉をリセット |
| POST | `/api/workout` | トレーニング記録・疲労値加算 |
| GET | `/api/exercises` | 種目カタログ取得 |

詳細は [docs/design_detail.md](./docs/design_detail.md) §15 を参照。

## テスト

```bash
# 全テスト実行
npm run test

# 特定ファイルのテスト
npm run test -- decay.test.ts

# coverage 確認
npm run test -- --coverage
```

テスト戦略:
- **ユニットテスト** — 疲労計算・色マップなどの純粋関数
- **コンポーネントテスト** — React Testing Library
- **API テスト** — MSW で HTTP モック

## 環境変数

`.env.local` を作成して以下を設定：

```
NEXT_PUBLIC_FIREBASE_API_KEY=<API_KEY>
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=<AUTH_DOMAIN>
NEXT_PUBLIC_FIREBASE_PROJECT_ID=<PROJECT_ID>
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=<STORAGE_BUCKET>
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=<MESSAGING_SENDER_ID>
NEXT_PUBLIC_FIREBASE_APP_ID=<APP_ID>

FIREBASE_ADMIN_SDK_KEY=<admin-sdk-json-key>
```

詳細は `.env.example` を参照。

## テックスタック

| レイヤー | 技術 |
|---------|------|
| フレームワーク | **Next.js 14** (App Router) |
| 言語 | **TypeScript** |
| スタイル | **Tailwind CSS** |
| 認証 | **Firebase Auth** (Google Sign-in) |
| データベース | **Firestore** (asia-northeast1) |
| サーバー状態 | **TanStack Query v5** |
| UI 状態 | **Zustand** |
| テスト | **Vitest** + **React Testing Library** + **MSW** |
| Linter/Formatter | **ESLint** + **Prettier** |
| CI/CD | **GitHub Actions** (lint + test + build) |
| デプロイ | **Vercel** (hnd1・東京) |

## 開発ワークフロー

### ブランチ戦略

```
main            ← 本番リリース
└─ ver3.0       ← 再設計統合ブランチ（長期、develop 相当）
    ├─ feat/xxx
    ├─ fix/xxx
    ├─ chore/xxx
    └─ test/xxx
```

### コミットメッセージ

- **日本語で簡潔に**（1行目 50字以内）
- **現在形で書く**（「追加した」ではなく「追加」）
- **英語 prefix は不要**

例:
```
ドメイン型と筋肉定数を追加

16筋肉の左右対称モデルに従う。
```

### PR フロー

1. `ver3.0` から `feat/xxx` を切る
2. 実装 → CI パス確認 → `feat/xxx → ver3.0` で PR 作成
3. Squash merge で統合
4. マージ後、feat ブランチを削除

詳細は [CLAUDE.md](./CLAUDE.md) のGit運用ルールを参照。

## トラブルシューティング

### 開発サーバーが起動しない

```bash
# Node.js バージョン確認
node -v  # 18+ 必須

# キャッシュクリア
rm -rf .next node_modules
npm install
npm run dev
```

### Firebase 認証エラー

- `.env.local` が存在し、すべての認証情報が正しく設定されているか確認
- Firebase コンソールで該当プロジェクトの Google Sign-in が有効か確認
- リダイレクト URI に `http://localhost:3000` が登録されているか確認

### テストが失敗する

```bash
# MSW がサーバーを起動しているか確認
# テストから詳細なログを確認
npm run test -- --reporter=verbose
```

## ステップ進捗

現在の実装進捗（詳細は [CLAUDE.md](./CLAUDE.md) の「実装フェーズの大まかな順序」を参照）：

| Step | 内容 | 状態 |
|------|------|------|
| 0 | 足場（Next.js・Tailwind・Vitest・Firebase） | ✅ 完了 |
| 1 | ドメイン型・定数・純粋関数 | ✅ 完了 |
| 2 | Firestore スキーマ・Rules・Indexes | ✅ 完了 |
| 3 | API Route（認証・各エンドポイント） | ✅ 完了 |
| 4 | Zustand・TanStack Query・楽観的更新 | ✅ 完了 |
| 5 | UI コンポーネント（体図・スライダー・モーダル） |  ✅ 完了 |
| 6 | シードスクリプト・CI/CD・デプロイ |  ✅ 完了 |

## 参考リンク

- [Next.js ドキュメント](https://nextjs.org/docs)
- [Firebase ドキュメント](https://firebase.google.com/docs)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [TanStack Query](https://tanstack.com/query/latest)
- [Zustand](https://github.com/pmndrs/zustand)
- [Vitest](https://vitest.dev/)
