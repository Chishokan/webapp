# ☀️ おはよう勉強会 webapp

朝の学習習慣をサポートするWebアプリケーションです。

## 主な機能

1. **Zoomへの出席** — Zoomリンクから参加し、ワンタップで出席を記録
2. **リフレクションの入力** — 学んだこと・気づき・次への課題・充実度を記録
3. **学習履歴の確認 & AIによる学習アドバイス** — 過去の記録を一覧表示し、Claude AI が傾向を分析してアドバイス
4. **AIチャット** — 勉強の質問や相談に Claude AI がいつでも回答

> 機能は今後も順次追加予定です。

## 技術スタック

- **Next.js 15** (App Router) + **React 19** + **TypeScript**
- **Tailwind CSS**
- **Prisma** + **PostgreSQL**
- **Anthropic Claude API**（AI機能）
- 認証: 自前の JWT クッキーセッション（`jose` + `bcryptjs`）
- ホスティング: **Vercel** を想定

## ローカル開発のセットアップ

PostgreSQL が必要です（手元に無ければ [Neon](https://neon.tech) の無料DBを作成してその接続URLを使うのが手軽です）。

```bash
# 1. 依存関係をインストール
npm install

# 2. 環境変数を設定
cp .env.example .env
#   - DATABASE_URL / DIRECT_URL: PostgreSQL の接続URL
#   - AUTH_SECRET: ランダムな長い文字列（openssl rand -hex 32 で生成）
#   - ANTHROPIC_API_KEY: AI機能(③④)を使う場合に設定
#   - NEXT_PUBLIC_ZOOM_URL: 勉強会のZoom URL

# 3. データベースにマイグレーションを適用
npm run db:migrate

# 4. 開発サーバーを起動
npm run dev
```

http://localhost:3000 を開いて、新規登録からお試しください。

## 環境変数

| 変数 | 説明 |
| --- | --- |
| `DATABASE_URL` | PostgreSQL 接続URL（プーリング経由）。必須 |
| `DIRECT_URL` | マイグレーション用の直接接続URL（プーリング非経由）。必須 |
| `AUTH_SECRET` | セッション署名用の秘密鍵（必須・ランダム文字列） |
| `ANTHROPIC_API_KEY` | Claude API キー（③④のAI機能で使用） |
| `ANTHROPIC_MODEL` | 使用するClaudeモデル（既定: `claude-sonnet-4-6`） |
| `NEXT_PUBLIC_ZOOM_URL` | 勉強会のZoom参加URL |

※ `ANTHROPIC_API_KEY` が未設定でも ①②（出席・リフレクション）は動作します。

## Vercel へのデプロイ

### 1. データベース（PostgreSQL）を用意する
[Neon](https://neon.tech)（無料枠あり）が手軽です。プロジェクトを作成し、接続文字列を2つ控えます。
- **Pooled connection** → `DATABASE_URL` に使用
- **Direct connection** → `DIRECT_URL` に使用

> Vercel Postgres を使う場合は、`POSTGRES_PRISMA_URL` を `DATABASE_URL`、`POSTGRES_URL_NON_POOLING` を `DIRECT_URL` に設定します。

### 2. Vercel にインポート
1. [vercel.com](https://vercel.com) でこのGitHubリポジトリをインポート
2. Framework は自動で **Next.js** が選択されます（ビルド設定の変更は不要）

### 3. 環境変数を設定（Vercel の Settings → Environment Variables）

| 変数 | 値 |
| --- | --- |
| `DATABASE_URL` | Neon の Pooled connection 文字列 |
| `DIRECT_URL` | Neon の Direct connection 文字列 |
| `AUTH_SECRET` | `openssl rand -hex 32` で生成した文字列 |
| `ANTHROPIC_API_KEY` | Anthropic の APIキー（AI機能を使う場合） |
| `ANTHROPIC_MODEL` | `claude-sonnet-4-6`（任意） |
| `NEXT_PUBLIC_ZOOM_URL` | 勉強会のZoom URL |

### 4. デプロイ
**Deploy** を実行すると、ビルド時に `prisma migrate deploy` が走り、DBにテーブルが自動作成されます。完了後、発行されたURL（`https://<your-app>.vercel.app`）でアクセスできます。

以降は、このブランチ（またはmain）へ push するたびに Vercel が自動で再デプロイします。

## ディレクトリ構成

```
src/
  app/
    page.tsx              ダッシュボード
    login/ register/      認証画面
    attendance/           ① 出席
    reflection/           ② リフレクション
    history/              ③ 学習履歴 & AIアドバイス
    chat/                 ④ AIチャット
    api/                  各種APIルート
  components/             UIコンポーネント
  lib/                    prisma / auth / anthropic などの共通処理
prisma/
  schema.prisma          データモデル
```
