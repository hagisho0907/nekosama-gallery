# Cloudflare D1データベース設定手順

このアプリケーションをCloudflare D1データベースで動作させるための設定手順です。

## 前提条件

- Cloudflareアカウント
- Wrangler CLI（`npm install -g wrangler`）

## 1. Wrangler CLIの認証

```bash
wrangler login
```

## 2. D1データベースの作成

```bash
wrangler d1 create nekosama-gallery-db
```

実行後、以下のような出力が表示されます：
```
✅ Successfully created DB 'nekosama-gallery-db' in region APAC
Created your database using D1's new storage backend. The new storage backend is not yet recommended for production workloads, but backs up your data via point-in-time restore.

[[d1_databases]]
binding = "DB"
database_name = "nekosama-gallery-db"
database_id = "your-actual-database-id-here"
```

## 3. wrangler.tomlの更新

`wrangler.toml`ファイルの`database_id`を実際のIDに更新：

```toml
[[d1_databases]]
binding = "DB"
database_name = "nekosama-gallery-db"
database_id = "your-actual-database-id-here"  # ← ここを更新
```

## 4. データベーススキーマの適用

```bash
wrangler d1 execute nekosama-gallery-db --file=./schema.sql
```

## 5. 環境変数の設定（Cloudflare Pages）

Cloudflare Pagesのダッシュボードで以下の環境変数を設定：

```
R2_ACCESS_KEY_ID=your-r2-access-key
R2_SECRET_ACCESS_KEY=your-r2-secret-key
R2_BUCKET_NAME=nekosama-gallery
R2_ENDPOINT=https://your-account-id.r2.cloudflarestorage.com
R2_PUBLIC_URL=https://pub-your-bucket-id.r2.dev
ADMIN_PASSWORD=your-admin-password
```

## 6. デプロイ

Cloudflare Pagesで自動デプロイされるか、手動でデプロイ：

```bash
wrangler pages deploy
```

## 7. データベースの動作確認

デプロイ後、管理者ページ（/admin）でフォルダの作成・削除が正常に動作することを確認してください。

## ローカル開発

ローカル開発時は引き続きSQLiteデータベースが使用されます。D1をローカルで使用したい場合：

```bash
wrangler d1 execute nekosama-gallery-db --local --file=./schema.sql
wrangler pages dev
```

## トラブルシューティング

### データベース接続エラー
- `database_id`が正しく設定されているか確認
- Cloudflare Pagesの環境変数でD1バインディングが設定されているか確認

### 権限エラー
- WranglerでCloudflareアカウントにログインしているか確認
- D1データベースの作成権限があるか確認

### データが表示されない
- スキーマが正しく適用されているか確認：
  ```bash
  wrangler d1 execute nekosama-gallery-db --command="SELECT name FROM sqlite_master WHERE type='table';"
  ```