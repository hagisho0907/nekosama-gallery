# 📊 Cloudflare使用量監視システム

## 概要
このシステムは、Cloudflareの無料枠内でアプリケーションを運用できるよう、使用量を監視し、Slackに通知する機能を提供します。

## 🚨 無料枠の制限

| サービス | 無料枠 | 監視対象 |
|---------|--------|---------|
| **Cloudflare Pages** | 500ビルド/月 | ビルド回数 |
| **Cloudflare R2** | 10GB保存、100万操作/月 | ストレージ使用量、操作回数 |
| **Cloudflare D1** | 5GB保存、500万読取/日、10万書込/日 | ストレージ使用量、DB操作回数 |
| **Cloudflare Workers** | 10万リクエスト/日 | APIリクエスト数 |

## 🔧 セットアップ

### 1. Slack Webhookの設定

1. **Slackアプリを作成**
   - https://api.slack.com/apps にアクセス
   - 「Create New App」→「From scratch」
   - アプリ名とワークスペースを選択

2. **Incoming Webhookを有効化**
   - 左サイドバーで「Incoming Webhooks」を選択
   - 「Activate Incoming Webhooks」をオンにする
   - 「Add New Webhook to Workspace」をクリック
   - 通知を送信するチャンネルを選択

3. **Webhook URLをコピー**
   ```
   https://hooks.slack.com/services/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
   ```

### 2. 環境変数の設定

#### Cloudflare Pages（本番環境）
1. Cloudflare Dashboard → Pages → プロジェクト選択
2. 「Settings」→「Environment variables」
3. 以下の変数を追加：
   ```
   SLACK_WEBHOOK_URL=https://hooks.slack.com/services/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
   ```

#### ローカル開発
`.env.local`に追加：
```env
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/XXXXXXXXX/YYYYYYY/ZZZZZZZZZZZZZZ
```

### 3. 日次監視の設定

**🎯 1日1回の自動監視を設定する場合：**

詳細な設定方法は [`docs/DAILY-MONITORING-SETUP.md`](./DAILY-MONITORING-SETUP.md) をご覧ください。

**簡易設定（GitHub Actions推奨）：**

1. **GitHub Secretsに秘密キーを追加**
   - リポジトリの Settings → Secrets → Actions
   - `DAILY_CHECK_SECRET` を追加

2. **GitHub Actions ワークフローが自動実行**
   - 毎日UTC 0時（日本時間9時）に実行
   - 日曜日は週次サマリーも送信

**手動実行：**
```bash
curl -X POST "https://your-domain.pages.dev/api/daily-usage-check" \
  -H "Content-Type: application/json" \
  -d '{"secret": "your_secret_key"}'
```

## 📱 使用方法

### 管理画面での監視

1. `/admin`にアクセス
2. 「使用量モニター」セクションで現在の使用状況を確認
3. 🔄ボタンで手動更新
4. 📧ボタンでSlackにサマリーを送信

### API経由での監視

```bash
# 使用量取得
GET /api/usage

# 手動でSlack通知送信
POST /api/usage
Content-Type: application/json
{
  "forceSlackNotification": true
}
```

### 通知の種類

#### アラート通知（自動）
- **条件**: 使用量が閾値を超えた時
- **閾値**: 50%, 75%, 90%, 95%
- **頻度**: 閾値到達時のみ

#### 週次サマリー（自動）
- **タイミング**: 毎週日曜日
- **内容**: 全サービスの使用量一覧

#### 手動通知
- **トリガー**: 管理画面の📧ボタン
- **内容**: 現在の使用量サマリー

## ⚠️ アラートレベル

| レベル | 閾値 | 色 | 説明 |
|--------|------|----|----|
| 🟢 Safe | 0-49% | 緑 | 正常範囲 |
| 🔵 Low | 50-74% | 青 | 注意レベル |
| 🟡 Medium | 75-89% | 黄 | 警告レベル |
| 🟠 High | 90-94% | オレンジ | 高警告レベル |
| 🔴 Critical | 95-99% | 赤 | 緊急警告 |
| 🚨 Exceeded | 100%+ | 赤点滅 | 制限超過 |

## 🛠️ トラブルシューティング

### Q: Slack通知が届かない
A: 以下を確認してください：
1. Webhook URLが正しく設定されているか
2. Slackアプリの権限が適切に設定されているか
3. 環境変数が正しく設定されているか

### Q: 使用量が正確でない
A: 
- 現在の実装は推定値を使用しています
- 正確な値はCloudflareダッシュボードで確認してください
- より精度の高い監視には、Cloudflare Analytics APIの実装が必要です

### Q: アラートが多すぎる
A: 
- 閾値を調整してください（環境変数で設定可能）
- Cronの頻度を変更してください
- 特定のサービスの監視を無効にすることも可能です

## 📈 使用量最適化のヒント

### R2ストレージ
- 画像の自動圧縮を強化
- 古い画像の定期削除
- CDN効率化

### D1データベース
- クエリの最適化
- インデックスの活用
- 不要なデータの削除

### Pages/Workers
- デプロイ頻度の見直し
- 不要なAPIコールの削減
- キャッシュの活用

## 🔮 今後の改善予定

1. **Cloudflare Analytics API統合**
   - より正確な使用量取得
   - リアルタイム監視

2. **予測分析**
   - 月末使用量予測
   - アラート予告機能

3. **カスタムアラート**
   - サービス別の個別設定
   - 複数通知チャンネル対応

4. **使用量履歴**
   - 月次/年次レポート
   - トレンド分析