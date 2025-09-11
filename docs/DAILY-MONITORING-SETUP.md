# 📅 日次使用量監視の設定方法

## 概要
Cloudflare Pages Functionsでは直接Cron Triggersが使用できないため、外部のCronサービスを使用して1日1回の使用量チェックを実行します。

## 🔧 設定手順

### 1. 環境変数の設定

#### Cloudflare Pages（本番環境）
1. Cloudflare Dashboard → Pages → プロジェクト選択
2. 「Settings」→「Environment variables」
3. 以下の変数を追加：
   ```
   SLACK_WEBHOOK_URL=https://hooks.slack.com/services/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
   DAILY_CHECK_SECRET=your_random_secret_key_here_32_chars_min
   ```

#### ローカル開発
`.env.local`に追加：
```env
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/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
DAILY_CHECK_SECRET=your_random_secret_key_here_32_chars_min
```

### 2. 外部Cronサービスの設定

以下のサービスから選択して設定してください：

#### オプション1: GitHub Actions（推奨・無料）

`.github/workflows/daily-usage-check.yml`を作成：

```yaml
name: Daily Usage Check
on:
  schedule:
    - cron: '0 0 * * *'  # 毎日UTC 0時（日本時間9時）
  workflow_dispatch:     # 手動実行も可能

jobs:
  usage-check:
    runs-on: ubuntu-latest
    steps:
      - name: Call Daily Usage Check
        run: |
          curl -X POST "https://your-domain.pages.dev/api/daily-usage-check" \
            -H "Content-Type: application/json" \
            -H "User-Agent: github-actions" \
            -d '{"secret": "${{ secrets.DAILY_CHECK_SECRET }}"}'
```

**GitHub Secretsに追加：**
1. リポジトリの「Settings」→「Secrets and variables」→「Actions」
2. 「New repository secret」をクリック
3. Name: `DAILY_CHECK_SECRET`, Value: 設定した秘密キー

#### オプション2: cron-job.org（無料）

1. https://cron-job.org にアクセスして登録
2. 「Create cronjob」をクリック
3. 以下を設定：
   ```
   Title: Nekosama Gallery Daily Check
   URL: https://your-domain.pages.dev/api/daily-usage-check
   Schedule: 0 0 * * * (Daily at midnight UTC)
   HTTP Method: POST
   Headers: Content-Type: application/json
   Data: {"secret": "your_secret_key_here"}
   ```

#### オプション3: UptimeRobot（無料・5分間隔制限あり）

1. https://uptimerobot.com にアクセスして登録
2. 「Add New Monitor」をクリック
3. Monitor Type: HTTP(s)
4. URL: `https://your-domain.pages.dev/api/daily-usage-check`
5. Monitoring Interval: 1440 minutes (24時間)

#### オプション4: EasyCron（無料枠あり）

1. https://www.easycron.com にアクセスして登録
2. 「Add Cron Job」をクリック
3. 以下を設定：
   ```
   URL: https://your-domain.pages.dev/api/daily-usage-check
   Cron Expression: 0 0 * * *
   HTTP Method: POST
   Post Data: {"secret": "your_secret_key_here"}
   Content-Type: application/json
   ```

### 3. 手動実行とテスト

#### APIエンドポイントのテスト
```bash
# 基本的な日次チェック
curl -X POST "https://your-domain.pages.dev/api/daily-usage-check" \
  -H "Content-Type: application/json" \
  -d '{"secret": "your_secret_key"}'

# 強制的にサマリー送信
curl -X POST "https://your-domain.pages.dev/api/daily-usage-check" \
  -H "Content-Type: application/json" \
  -d '{"secret": "your_secret_key", "forceDaily": true}'

# 週次サマリーのみ
curl -X POST "https://your-domain.pages.dev/api/daily-usage-check" \
  -H "Content-Type: application/json" \
  -d '{"secret": "your_secret_key", "summaryOnly": true}'
```

#### ヘルスチェック
```bash
curl "https://your-domain.pages.dev/api/daily-usage-check"
```

## 📊 通知スケジュール

### 平日（月〜土）
- **アラートあり**: 中程度以上の警告がある場合のみ通知
- **アラートなし**: 通知なし（サイレント）

### 日曜日
- **毎週**: 使用量サマリーを自動送信
- **内容**: 全サービスの使用状況一覧

### 手動実行オプション
- `forceDaily: true`: 強制的に日次サマリー送信
- `summaryOnly: true`: 週次サマリーのみ送信

## 🔒 セキュリティ

### 認証方法
1. **Secret Key**: リクエストボディまたはAuthorizationヘッダー
2. **User-Agent認証**: 以下のUser-Agentは自動承認
   - `github-actions`
   - `cron-job.org`
   - `UptimeRobot`
   - `EasyCron`

### 推奨事項
- 秘密キーは32文字以上のランダム文字列を使用
- 定期的に秘密キーを変更
- GitHub Secretsなど安全な場所に保管

## 🛠️ トラブルシューティング

### Q: 通知が送信されない
A: 以下を確認：
1. Slack Webhook URLが正しく設定されているか
2. 秘密キーが環境変数とリクエストで一致しているか
3. Cronサービスが正常に動作しているか

### Q: 認証エラーが発生する
A: 以下を確認：
1. `DAILY_CHECK_SECRET`環境変数が設定されているか
2. リクエストの秘密キーが正しいか
3. User-Agentが認証済みのものか

### Q: Cronサービスの設定方法が分からない
A: GitHub Actionsの使用を推奨：
- 無料でGitHubアカウントがあれば利用可能
- 設定ファイルをリポジトリで管理
- 実行ログを確認可能

## 📈 監視内容

### 送信されるデータ
- R2ストレージ使用量とClass A操作数
- D1データベースの読み取り/書き込み回数
- Workers/Pagesのリクエスト数
- アラートの数と重要度

### 履歴データ（KV使用時）
- 90日間の使用量履歴
- 通知送信ログ
- アラート発生履歴

## 🎯 次のステップ

1. **監視の確認**: 最初の数日は手動でエンドポイントを呼び出してテスト
2. **アラート調整**: 必要に応じて警告レベルの閾値を調整  
3. **追加通知**: 必要に応じて他の通知チャンネルを追加