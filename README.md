# 🐱 拝啓ねこ様フォトギャラリー

阿佐ヶ谷の誇る名所「拝啓ねこ様」のねこちゃん達の写真ギャラリー

## 📋 機能

- 🗂️ **フォルダ管理**: 猫の名前別にフォルダを作成・管理
- 📸 **写真アップロード**: 各フォルダに複数の写真をアップロード
- 🎨 **レスポンシブUI**: スマホ・タブレット・PC対応の美しいデザイン
- ⚙️ **管理者機能**: パスワード認証による安全なフォルダ管理
- 💫 **いいね機能**: お気に入りの写真にいいねを付けることができる
- 🔗 **外部リンク**: 猫カフェの公式サイトへの直接アクセス
- 📱 **モバイル最適化**: タッチ操作に最適化されたUI/UX

## 🛠️ 技術スタック

- **Frontend**: Next.js 15, React 19, TypeScript
- **Styling**: Tailwind CSS + Framer Motion (アニメーション)
- **Icons**: Lucide React
- **Database**: SQLite (本番環境ではCloudflare D1対応)
- **Storage**: Cloudflare R2
- **Authentication**: JWT + Cookie認証

## 🚀 開発環境セットアップ

### 1. リポジトリクローン
```bash
git clone https://github.com/hagisho0907/nekosama-gallery.git
cd nekosama-gallery
```

### 2. 依存関係インストール
```bash
npm install
```

### 3. 環境変数設定
`.env.local` ファイルを作成:
```bash
# 管理者パスワード
ADMIN_PASSWORD=your_admin_password

# Cloudflare R2設定（本番環境）
R2_ACCESS_KEY_ID=your_access_key_id
R2_SECRET_ACCESS_KEY=your_secret_access_key  
R2_BUCKET_NAME=nekosama-gallery
R2_ENDPOINT=https://your_account_id.r2.cloudflarestorage.com
R2_REGION=auto

# データベース設定
DATABASE_PATH=./data/gallery.db
```

### 4. 開発サーバー起動
```bash
npm run dev
```

ブラウザで [http://localhost:3000](http://localhost:3000) を開く

### 5. 管理者機能へのアクセス
管理者機能を使用するには `/admin/login` にアクセスし、設定したパスワードでログインしてください。

## 📁 プロジェクト構造

```
nekosama-gallery/
├── app/
│   ├── api/              # API Routes
│   │   ├── auth/         # 認証API
│   │   ├── folders/      # フォルダ管理API
│   │   └── photos/       # 写真管理API
│   ├── admin/           # 管理者ページ
│   │   ├── login/       # ログインページ
│   │   └── page.tsx     # 管理ダッシュボード
│   ├── folder/          # フォルダ詳細ページ
│   ├── globals.css      # グローバルスタイル
│   ├── layout.tsx       # レイアウトコンポーネント
│   └── page.tsx         # メインページ
├── lib/
│   ├── auth.ts         # 認証ヘルパー
│   ├── db.ts           # データベースクライアント
│   └── r2.ts           # R2ストレージクライアント
├── public/             # 静的ファイル
└── data/               # SQLiteデータベース
```

## 🌈 ブランチ構成

- **main**: 本番用（Tailwind CSS）
- **feature-chakraUI**: Chakra UI + 宇宙テーマデザイン

## 🌐 デプロイ

### Vercelでのデプロイ
1. [Vercel](https://vercel.com) にログイン
2. GitHubリポジトリをインポート
3. 環境変数を設定
4. デプロイ実行

### 必要な環境変数
- `ADMIN_PASSWORD` - 管理者ログイン用パスワード
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- `R2_BUCKET_NAME`
- `R2_ENDPOINT`
- `R2_REGION`
- `DATABASE_PATH`

## 📝 ライセンス

MIT License

## 🤝 コントリビューション

プルリクエストやイシューを歓迎します！

---

🤖 Generated with [Claude Code](https://claude.ai/code)

<!-- D1 binding configured -->
<!-- R2 credentials updated -->
<!-- Test R2 binding debug -->
<!-- Test photo management debug -->

<!-- Trigger redeploy for D1 binding -->
