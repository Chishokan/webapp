# 面談予約システム (PHP + MySQL / XServer版)

GAS(スプレッドシート)版を XServer で動く Web アプリに移植したものです。
保護者用の予約ページと、職員用の管理ページで構成されます。

## 構成ファイル

| ファイル | 役割 |
| --- | --- |
| `index.html` | 保護者用：予約・予約一覧・使い方 |
| `admin.html` | 職員用：予約一覧/面談記録・枠の管理(ログイン必須) |
| `api.php` | サーバー処理(JSON API)。予約作成・取得・枠操作など |
| `export.php` | 予約のCSVダウンロード(職員用) |
| `cron_reminders.php` | 前日リマインドメール送信(cronで実行) |
| `app-shim.js` | 画面とAPIをつなぐ補助スクリプト |
| `db.php` / `mailer.php` | DB接続・メール送信の共通処理 |
| `config.php` | 設定(DB接続情報・ログイン・送信元メール) |
| `schema.sql` | MySQLのテーブル定義＋校舎マスタ初期データ |

## 既存アプリとの切り分け(重要)

このアプリは他アプリと干渉しないよう、次の2点で分離しています。

- **MySQL**：`config.php` の `DB_NAME` で指定した1つのDBにしか接続しません。
- **PHPセッション**：`config.php` の `SESSION_NAME`(既定 `YOYAKU_SESSID`)で、
  同一ドメインの他アプリのログインセッションと混ざらないようにしています。

DBの分け方は2通りです(どちらか):

| 方式 | 設定 | 説明 |
| --- | --- | --- |
| **A. 専用DB(推奨)** | `TABLE_PREFIX = ''` | このアプリ専用のMySQL DBを新規作成。既存アプリと完全分離 |
| **B. 既存DBに同居** | `TABLE_PREFIX = 'yoyaku_'` | テーブル名に接頭辞を付け、既存アプリのテーブルと衝突回避 |

## XServer セットアップ手順

### 1. データベースとテーブルを用意

**方式A(専用DB・推奨)**
1. XServerサーバーパネル →「MySQL設定」で DB(例 `xxxxxxx_yoyaku`)とユーザーを作成・権限付与
2. phpMyAdminで作成したDBを選択 →「インポート」から **`schema.sql`** を実行
   (`config.php` は `TABLE_PREFIX = ''` のまま)

**方式B(既存DBに同居)**
1. `config.php` で `TABLE_PREFIX = 'yoyaku_'` に設定(任意の接頭辞)
2. ブラウザで一度だけ **`setup.php`** を開く:
   `https://ドメイン/reservation/setup.php?token=（ADMIN_PWの値）`
   → 接頭辞つきテーブル(`yoyaku_schools` 等)が作成・初期化されます。実行後 `setup.php` は削除推奨。

いずれも schools / slots / bookings(または接頭辞つき)の3テーブルと、7校舎の初期データが入ります。

### 2. ファイルをアップロード
`reservation/` フォルダ一式を、公開ディレクトリ配下にアップロードします。
例: `/home/サーバーID/ドメイン/public_html/reservation/`
→ 公開URLは `https://ドメイン/reservation/`(保護者用)、`https://ドメイン/reservation/admin.html`(職員用)

### 3. config.php を編集
`config.php` を開き、以下を実環境に合わせて変更:
- `DB_HOST` / `DB_NAME` / `DB_USER` / `DB_PASS` … 手順1のMySQL情報
- `ADMIN_ID` / `ADMIN_PW` … 職員ログイン(初期値 chishokan / chishokan1 から**必ず変更**)
- `MAIL_FROM` … 送信元アドレス(運用ドメインのアドレス推奨。例 `noreply@ドメイン`)

### 4. 通知先メールの確認
各校舎の「新規予約通知メール」の宛先は `schools.notify_email` に入っています
(schema.sqlでスプレッドシートの値を初期設定済み)。
変更はphpMyAdminで `schools` テーブルを編集してください。

### 5. リマインドメールの自動送信(cron)
XServerサーバーパネル →「Cron設定」で以下を登録(1日2回・重複防止あり):
```
0 10 * * *  /usr/bin/php /home/サーバーID/ドメイン/public_html/reservation/cron_reminders.php
0 19 * * *  /usr/bin/php /home/サーバーID/ドメイン/public_html/reservation/cron_reminders.php
```
(phpのパスはXServerの環境に合わせてください。サーバーパネルに記載があります)

## 動作

- **保護者** `index.html`：校舎選択 → 空き枠選択 → 予約。予約時に担当校舎へ通知メール。前日にリマインドメール。
- **職員** `admin.html`：ログイン後、予約一覧・面談記録の入力、枠の追加/公開切替/定員/削除、CSV出力。

## GAS版との差分(意図的な変更)

- データ保存：スプレッドシート → MySQL
- 通信：`google.script.run` → `api.php`(JSON) ※画面操作は同じ
- カレンダー出力：Googleスプレッド作成 → **CSVダウンロード**(Excelで開けます)
- 職員ログイン：画面のみの判定 → **サーバー側セッション認証**(より安全)
- リマインド：GASトリガー → **XServerのcron**

## 注意

- メールはXServerの `mb_send_mail()` を使用します。送信元(`MAIL_FROM`)は運用ドメインのアドレスにすると到達率が安定します。
- 予約データには個人情報が含まれます。`config.php` の認証情報は必ず変更し、管理URLの取り扱いにご注意ください。
