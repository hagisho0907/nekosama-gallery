# 🚀 Space Cat Station - 拝啓ねこ様フォトギャラリー

阿佐ヶ谷の誇る名所「拝啓ねこ様」のねこちゃんたちの宇宙的な写真ギャラリー

![Space Cat Station](https://img.shields.io/badge/Space-Cat%20Station-blue?style=for-the-badge&logo=rocket)
![Status](https://img.shields.io/badge/Status-Active-success?style=for-the-badge)

## ✨ 主な特徴

### 🎨 宇宙テーマデザイン
- **星空背景**: 美しいアニメーション付き星空エフェクト
- **宇宙色テーマ**: 深い紫から青へのグラデーション
- **インタラクティブUI**: Framer Motionによるスムーズなアニメーション

### 🐱 猫管理システム
- **在籍生・卒業生管理**: 現在の猫と卒業した猫を分類
- **写真アップロード**: ドラッグ&ドロップ対応
- **いいね機能**: 写真へのいいね数表示
- **自動画像圧縮**: アップロード時に最適化

### 📱 レスポンシブ対応
- **スマートフォン最適化**: 1列表示、拡大画像表示
- **タブレット対応**: 3列グリッド表示
- **デスクトップ対応**: 最大5列グリッド表示

## 🛠️ 技術スタック

### Frontend
- **Next.js 15** - React フレームワーク
- **React 19** - UI ライブラリ
- **TypeScript** - 型安全性
- **Chakra UI** - UIコンポーネント
- **Framer Motion** - アニメーション

### Backend & Infrastructure  
- **Cloudflare Pages** - ホスティング
- **Cloudflare Functions** - サーバーレス API
- **Cloudflare D1** - SQLite データベース
- **Cloudflare R2** - オブジェクトストレージ

### Development & Build
- **Webpack** - バンドラー
- **PostCSS** - CSS処理
- **ESLint** - コード品質
- **Prettier** - コードフォーマット

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

# 認証設定
ADMIN_PASSWORD=your_admin_password
```

### 4. データベース初期化
```bash
# SQLiteデータベースの作成
npm run db:setup
```

### 5. 開発サーバー起動
```bash
npm run dev
```

ブラウザで [http://localhost:3000](http://localhost:3000) を開く

## 📁 プロジェクト構造

```
nekosama-gallery/
├── app/
│   ├── api/                  # API Routes
│   │   ├── folders/         # フォルダ管理API
│   │   ├── photos/          # 写真管理API
│   │   ├── upload.ts        # アップロードAPI
│   │   └── auth/            # 認証API
│   ├── admin/              # 管理者ページ
│   │   ├── login/          # ログインページ
│   │   └── page.tsx        # 管理ダッシュボード
│   ├── globals.css         # グローバルスタイル（星空エフェクト含む）
│   ├── layout.tsx          # アプリケーションレイアウト
│   └── page.tsx            # メインギャラリーページ
├── lib/
│   ├── db.ts              # データベースクライアント
│   ├── d1-db.ts           # Cloudflare D1クライアント
│   ├── r2.ts              # R2ストレージクライアント
│   ├── auth.ts            # 認証ロジック
│   └── image-compression.ts # 画像圧縮処理
├── functions/
│   └── api/               # Cloudflare Functions
├── public/                # 静的ファイル
├── data/                  # ローカル開発用データベース
├── wrangler.toml         # Cloudflare設定
└── schema.sql            # データベーススキーマ
```

## 🌟 主要機能

### 🏠 メインページ
- 宇宙テーマの美しいUI
- 在籍生・卒業生のタブ切り替え
- 写真プレビュー付きフォルダ一覧
- アニメーション付きホバーエフェクト

### 📸 写真詳細ページ  
- 写真の一覧表示（レスポンシブグリッド）
- いいね機能（ローカルストレージ連携）
- ページネーション
- 追加アップロード機能

### ⚙️ 管理者機能
- パスワード認証
- フォルダ作成・編集・削除
- 写真一括アップロード
- ステータス管理（在籍/卒業）

### 🎨 デザイン特徴
- **星空エフェクト**: CSS radial-gradientによるリアルタイム星空
- **グラデーション背景**: 左上から右下への美しい宇宙グラデーション
- **レスポンシブレイアウト**: モバイルファーストデザイン
- **アクセシビリティ**: フォーカス表示、適切なARIA属性

## 🌐 デプロイ

### Cloudflare Pagesでのデプロイ
1. [Cloudflare Dashboard](https://dash.cloudflare.com) にログイン
2. Pagesセクションでプロジェクトを作成
3. GitHubリポジトリを接続
4. ビルド設定:
   - Build command: `npm run build`
   - Build output directory: `out`
5. 環境変数を設定
6. デプロイ実行

### 必要なCloudflare設定
- **D1 Database**: `nekosama-gallery-db`
- **R2 Bucket**: `nekosama-gallery`
- **Environment Variables**: 上記の環境変数すべて

## 📊 パフォーマンス最適化

- ✅ 画像自動圧縮
- ✅ Next.js Image最適化
- ✅ コンポーネントレベルのcode splitting
- ✅ CSS-in-JS最適化
- ✅ CDN配信（Cloudflare）

## 🔒 セキュリティ

- ✅ 管理者認証
- ✅ CSRF保護
- ✅ 画像ファイル検証
- ✅ SQLインジェクション対策

## 📝 更新履歴

### v2.1.0 (2025-08-30)
- 🌟 星空エフェクトの表示問題を根本解決
- 📱 スマホ版詳細ページの画像サイズを1.5倍に拡大
- 🎨 ヘッダーデザインを大型化・強化
- 🔄 グラデーション方向を左上から右下に変更

### v2.0.0 (2025-08-29)
- 🚀 Space Cat Stationテーマに全面リニューアル
- ⭐ 美しい星空アニメーション背景を実装
- 🎨 宇宙色テーマでUIを統一
- 📱 レスポンシブデザインを大幅改善

## 🤝 コントリビューション

プルリクエストやイシューを歓迎します！

### 開発に参加する場合
1. リポジトリをフォーク
2. 機能ブランチを作成 (`git checkout -b feature/amazing-feature`)
3. 変更をコミット (`git commit -m 'Add amazing feature'`)
4. ブランチにプッシュ (`git push origin feature/amazing-feature`)
5. プルリクエストを作成

## 📄 ライセンス

MIT License - 詳細は [LICENSE](LICENSE) ファイルを参照

## 🐱 関連リンク

- **実際の拝啓ねこ様**
  - [Instagram](https://www.instagram.com/haikeinekosama/)
  - [X (Twitter)](https://x.com/haikeinekosama)
  - [公式サイト](https://aboutme.style/haikeinekosama)

---

🤖 **Generated with [Claude Code](https://claude.ai/code)**

*Presented by きろめいく里親 for 拝啓ねこ様*