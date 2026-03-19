# 筋肉疲労マップ 2D

手動入力による筋肉疲労度管理アプリケーション

## 概要

このアプリケーションは、ユーザーが各筋肉部位の疲労度を手動で入力し、リアルタイムで体図面に反映させるNEXTアプリケーションです。

### 主な機能

- 🦵 **インタラクティブな体図面**: 7つの主要筋肉部位をクリックして選択
- 📊 **疲労度入力**: スライダーで 0-100% の範囲で疲労度を設定
- 🎨 **ビジュアルフィードバック**: 疲労度に応じた色の段階的表示
  - 緑: 0-29% (低疲労)
  - 黄: 30-59% (中疲労)
  - オレンジ: 60-79% (高疲労)
  - 赤: 80-100% (最高疲労)
- 💾 **データ永続化**: API経由でデータを保存
- 🔄 **リセット機能**: すべてのデータを一度にクリア

## システムアーキテクチャ

```
Frontend (Next.js + React + TypeScript)
    ↓
API Route (/api/fatigue)
    ↓
In-Memory Storage (本番環境ではDB推奨)
```

## 技術スタック

### フロントエンド
- Next.js 14.0.0
- React 18.2.0
- TypeScript 5.3.3
- Tailwind CSS 3.3.6

### バックエンド
- Next.js API Routes
- TypeScript

## インストール

```bash
# 依存パッケージのインストール
npm install

# 開発サーバー起動
npm run dev

# ブラウザで以下にアクセス
# http://localhost:3000
```

## Docker での実行

```bash
# アプリケーションをビルドして起動
docker-compose up --build

# デタッチモードで実行
docker-compose up -d --build

# 停止
docker-compose down
```

## 使用方法

1. **体図面から部位を選択**: 体図面の任意の部位（胸部、背中、肩など）をクリック
2. **疲労度を入力**: スライダーで疲労度を 0～100% の範囲で設定
3. **保存**: 「保存」ボタンをクリックしてデータを保存
4. **確認**: 体図面の色がリアルタイムで更新されて疲労度が可視化される

## API エンドポイント

### GET /api/fatigue
```bash
# すべての疲労度データを取得
curl http://localhost:3000/api/fatigue
```

レスポンス:
```json
{
  "chest": 50,
  "back": 30,
  "shoulders": 0,
  "arms": 80,
  "forearms": 0,
  "abs": 40,
  "legs": 60
}
```

### POST /api/fatigue
```bash
# 特定の部位の疲労度を更新
curl -X POST http://localhost:3000/api/fatigue \
  -H "Content-Type: application/json" \
  -d '{"muscle": "chest", "tire": 75}'
```

### PUT /api/fatigue
```bash
# すべてのデータをリセット
curl -X PUT http://localhost:3000/api/fatigue
```

## ファイル構成

```
src/
├── app/
│   ├── api/
│   │   └── fatigue/
│   │       └── route.ts          # API エンドポイント
│   ├── components/
│   │   ├── MuscleDiagram.tsx      # 体図面コンポーネント
│   │   └── FatigueForm.tsx        # 疲労度入力フォーム
│   ├── globals.css                # グローバルスタイル
│   ├── layout.tsx                 # ルートレイアウト
│   └── page.tsx                   # メインページ
├── types.ts                       # TypeScript 型定義
└── server.ts                      # (従来の Express サーバー)

設定ファイル:
├── next.config.js                 # Next.js 設定
├── tailwind.config.ts             # Tailwind CSS 設定
├── tsconfig.json                  # TypeScript 設定
├── postcss.config.js              # PostCSS 設定
└── .env.local                     # 環境変数
```

## 開発コマンド

```bash
# 開発サーバー起動
npm run dev

# 本番ビルド
npm run build

# 本番環境で実行
npm start

# コード整形（ESLint）
npm run lint
```

## 次のステップ（推奨）

- [ ] データベース統合（MongoDB, PostgreSQL等）
- [ ] 疲労度の時系列グラフ表示
- [ ] ユーザー認証・管理機能
- [ ] レスポンシブデザインの改良
- [ ] PWA化（オフライン対応）
- [ ] Docker環境での整備
- [ ] テストスイートの追加
- [ ] CI/CDパイプラインの構築

## ライセンス

MIT


### Dockerコマンド

- イメージビルド: `docker-compose build`
- 起動: `docker-compose up -d`
- 停止: `docker-compose down`
- ログ表示: `docker-compose logs -f`

### 環境の停止とクリーンアップ

#### Docker環境の停止
ローカル開発環境を停止するには:
```bash
docker-compose down
```

コンテナ、ネットワーク、ボリュームを完全に削除するには:
```bash
docker-compose down -v --rmi all
```

#### GKEデプロイの削除
GKE上のデプロイを削除するには:
```bash
# サービスとデプロイメントを削除
kubectl delete -f k8s/

# または個別に削除
kubectl delete service muscle-map-2d-lb
kubectl delete deployment muscle-map-2d
```

#### イメージのクリーンアップ
使用していないDockerイメージを削除するには:
```bash
# ローカルイメージ削除
docker image prune -f

# 特定のイメージ削除
docker rmi asia-northeast1-docker.pkg.dev/docker-repo-490401/muscle-repo/my-app:v2-amd64
```

### プロジェクト構造

- `src/`: TypeScriptソースファイル
- `dist/`: コンパイルされたJavaScriptファイル
- `k8s/`: Kubernetesマニフェストファイル
- `Dockerfile`: Dockerイメージ定義
- `docker-compose.yml`: 開発環境設定

### GKEへのデプロイ

1. イメージをビルドしてプッシュ:
   ```bash
   docker build --platform linux/amd64 -t asia-northeast1-docker.pkg.dev/docker-repo-490401/muscle-repo/my-app:v2-amd64 .
   docker push asia-northeast1-docker.pkg.dev/docker-repo-490401/muscle-repo/my-app:v2-amd64
   ```

2. Kubernetesマニフェストを適用:
   ```bash
   kubectl apply -f k8s/
   ```

3. 外部アクセスURLを確認:
   ```bash
   kubectl get services muscle-map-2d-lb
   ```

   EXTERNAL-IP が表示されたら、http://[EXTERNAL-IP] でアクセス可能

### GKEデプロイの再公開

デプロイを削除した後に再度公開する場合、またはコードを更新して再デプロイする場合の手順です。

#### コード変更がない場合（同じイメージを使用）
1. Kubernetesマニフェストを再適用:
   ```bash
   kubectl apply -f k8s/
   ```

2. 外部アクセスURLを確認:
   ```bash
   kubectl get services muscle-map-2d-lb
   ```

#### コードを変更した場合（新しいイメージを使用）
1. イメージを再ビルド（タグを更新）:
   ```bash
   # 例: v3-amd64 としてビルド
   docker build --platform linux/amd64 -t asia-northeast1-docker.pkg.dev/docker-repo-490401/muscle-repo/my-app:v3-amd64 .
   docker push asia-northeast1-docker.pkg.dev/docker-repo-490401/muscle-repo/my-app:v3-amd64
   ```

2. マニフェストを更新（イメージタグを変更）:
   ```yaml
   # k8s/deployment.yaml の image 行を更新
   image: asia-northeast1-docker.pkg.dev/docker-repo-490401/muscle-repo/my-app:v3-amd64
   ```

3. Kubernetesマニフェストを適用:
   ```bash
   kubectl apply -f k8s/
   ```

4. 外部アクセスURLを確認:
   ```bash
   kubectl get services muscle-map-2d-lb
   ```

**注意**: LoadBalancerのEXTERNAL-IPは削除後も同じIPが割り当てられる場合がありますが、変更される可能性もあります。`kubectl get services` で確認してください。