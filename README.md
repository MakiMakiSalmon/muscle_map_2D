# Muscle Map 2D

2D筋肉マッピング用のTypeScriptベースのNode.jsアプリケーション。

## ローカル開発環境のセットアップ

### 前提条件
- DockerおよびDocker Composeがインストールされていること

### アプリケーションの実行

1. アプリケーションをビルドして起動:
   ```bash
   docker-compose up --build
   ```

2. または、デタッチモードで実行:
   ```bash
   docker-compose up -d --build
   ```

3. アプリケーションにアクセス: http://localhost:3000

### 開発

- nodemonとts-nodeを使用したホットリロード対応のTypeScriptを使用しています。
- `src/` 内のソースコード変更が即座に反映されます。
- アプリケーションを停止するには:
  ```bash
  docker-compose down
  ```

### ローカル開発（Dockerなし）

1. 依存関係をインストール:
   ```bash
   npm install
   ```

2. 開発モードで実行:
   ```bash
   npm run dev
   ```

3. または、ビルドしてから実行:
   ```bash
   npm run build
   npm start
   ```

### Dockerコマンド

- イメージビルド: `docker-compose build`
- 起動: `docker-compose up -d`
- 停止: `docker-compose down`
- ログ表示: `docker-compose logs -f`

### プロジェクト構造

- `src/`: TypeScriptソースファイル
- `dist/`: コンパイルされたJavaScriptファイル
- `Dockerfile`: Dockerイメージ定義
- `docker-compose.yml`: 開発環境設定