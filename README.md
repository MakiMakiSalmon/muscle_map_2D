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