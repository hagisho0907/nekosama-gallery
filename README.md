# 🐱 NekoSama Gallery

猫の写真を共有できるギャラリーWebアプリケーション

## 📋 機能

- 🗂️ **フォルダ管理**: 猫の名前別にフォルダを作成・管理
- 📸 **写真アップロード**: 各フォルダに複数の写真をアップロード
- 🎨 **レスポンシブUI**: スマホ・タブレット・PC対応
- ⚙️ **管理者機能**: フォルダの作成・編集・削除
- ☁️ **クラウドストレージ**: Cloudflare R2による高速配信

## 🛠️ 技術スタック

- **Frontend**: Next.js 15, React 19, TypeScript
- **Styling**: Tailwind CSS
- **Backend**: Cloudflare Functions
- **Database**: Cloudflare D1 SQL
- **Storage**: Cloudflare R2
- **Deployment**: Cloudflare Pages

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
# Cloudflare R2設定
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

## 📁 プロジェクト構造

```
nekosama-gallery/
├── app/
│   ├── api/              # API Routes
│   ├── admin/           # 管理者ページ
│   ├── globals.css      # グローバルスタイル
│   ├── layout.tsx       # レイアウトコンポーネント
│   └── page.tsx         # メインページ
├── lib/
│   ├── db.ts           # データベースクライアント
│   └── r2.ts           # R2ストレージクライアント
├── public/             # 静的ファイル
└── data/               # SQLiteデータベース
```

## 🌐 デプロイ

### Vercelでのデプロイ
1. [Vercel](https://vercel.com) にログイン
2. GitHubリポジトリをインポート
3. 環境変数を設定
4. デプロイ実行

### 必要な環境変数
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

<!-- Trigger redeploy for D1 binding -->
