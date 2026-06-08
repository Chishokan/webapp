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
- **Prisma** + **SQLite**（本番では PostgreSQL 等に切替可能）
- **Anthropic Claude API**（AI機能）
- 認証: 自前の JWT クッキーセッション（`jose` + `bcryptjs`）

## セットアップ

```bash
# 1. 依存関係をインストール
npm install

# 2. 環境変数を設定
cp .env.example .env
#   - AUTH_SECRET: ランダムな長い文字列に変更
#   - ANTHROPIC_API_KEY: AI機能(③④)を使う場合に設定
#   - NEXT_PUBLIC_ZOOM_URL: 勉強会のZoom URL

# 3. データベースを初期化
npm run db:push

# 4. 開発サーバーを起動
npm run dev
```

http://localhost:3000 を開いて、新規登録からお試しください。

## 環境変数

| 変数 | 説明 |
| --- | --- |
| `DATABASE_URL` | データベース接続URL（既定: SQLite `file:./dev.db`） |
| `AUTH_SECRET` | セッション署名用の秘密鍵（必須・ランダム文字列） |
| `ANTHROPIC_API_KEY` | Claude API キー（③④のAI機能で使用） |
| `ANTHROPIC_MODEL` | 使用するClaudeモデル（既定: `claude-sonnet-4-6`） |
| `NEXT_PUBLIC_ZOOM_URL` | 勉強会のZoom参加URL |

※ `ANTHROPIC_API_KEY` が未設定でも ①②（出席・リフレクション）は動作します。

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
