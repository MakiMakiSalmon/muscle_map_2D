# 筋肉疲労マップ 2D

筋肉部位ごとの疲労値を記録・可視化する Web アプリ。

**現在 v2.0 再設計中**（2026-04-23 開始）。設計書・運用ルール・実装フェーズの進め方は [CLAUDE.md](./CLAUDE.md) を参照。

## ドキュメント

- [CLAUDE.md](./CLAUDE.md) — 運用ルール・Git フロー・実装ルール
- [docs/function.md](./docs/function.md) — 機能スコープ（確定版）
- [docs/design_basic.md](./docs/design_basic.md) — 基本設計
- [docs/design_detail.md](./docs/design_detail.md) — 詳細設計

## 開発

```bash
npm install
npm run dev          # 開発サーバー（http://localhost:3000）
npm run lint         # ESLint
npm run typecheck    # TypeScript チェック
npm run build        # 本番ビルド
```

## テックスタック

Next.js 14 (App Router) / TypeScript / Tailwind CSS / Firebase (Auth + Firestore) / TanStack Query + Zustand / Vitest + RTL + MSW / Vercel (hnd1) / GitHub Actions
